from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, UserProfile, UserActivity, UserBadge, StudentCareerProfile, AccountDeletionRequest, Notification, NotificationPreference
from backend.users.activity import record_daily_visit
from backend.users.schemas import UserProfileUpdate, UserResponse
from datetime import datetime, timezone, date, timedelta
from pydantic import BaseModel, Field
from typing import Literal

router = APIRouter()

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return {
        "user": {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role, "avatar": current_user.avatar, "xp_points": current_user.xp_points, "level": current_user.level, "streak_days": current_user.streak_days},
        "profile": {"bio": profile.bio, "phone": profile.phone, "department": profile.department, "year": profile.year, "college": profile.college, "github_url": profile.github_url, "linkedin_url": profile.linkedin_url, "portfolio_url": profile.portfolio_url, "resume_url": profile.resume_url, "skills": profile.skills, "interests": profile.interests, "achievements": profile.achievements}
    }

@router.put("/profile")
async def update_profile(req: UserProfileUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    for field, value in req.model_dump(exclude_unset=True).items():
        if field == "name":
            current_user.name = value
        else:
            setattr(profile, field, value)
    await db.commit()
    return {"message": "Profile updated"}

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    max_size = 2 * 1024 * 1024
    content = await file.read(max_size + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="Avatar images must be 2 MB or smaller.")

    signatures = {
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/webp": content[:4] == b"RIFF" and content[8:12] == b"WEBP",
    }
    detected_type = next((mime for mime, valid in signatures.items() if valid), None)
    if not detected_type or (file.content_type and file.content_type != detected_type):
        raise HTTPException(status_code=415, detail="Upload a valid PNG, JPEG or WebP image.")

    import base64
    b64 = base64.b64encode(content).decode("ascii")
    current_user.avatar = f"data:{detected_type};base64,{b64}"
    await db.commit()
    await db.refresh(current_user)
    return {"avatar": current_user.avatar}


@router.get("/leaderboard")
async def leaderboard(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.xp_points.desc()).limit(50))
    users = result.scalars().all()
    return [{"id": u.id, "name": u.name, "avatar": u.avatar, "xp_points": u.xp_points, "level": u.level, "streak_days": u.streak_days} for u in users]

@router.get("/activities")
async def get_activities(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserActivity).where(UserActivity.user_id == current_user.id).order_by(UserActivity.created_at.desc()).limit(50))
    activities = result.scalars().all()
    return [{"id": a.id, "activity_type": a.activity_type, "description": a.description, "xp_earned": a.xp_earned, "created_at": a.created_at.isoformat()} for a in activities]

@router.get("/list", response_model=list[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403)
    result = await db.execute(select(User).limit(100))
    users = result.scalars().all()
    return [UserResponse(id=u.id, email=u.email, name=u.name, role=u.role, avatar=u.avatar, xp_points=u.xp_points, level=u.level, streak_days=u.streak_days, created_at=u.created_at.isoformat()) for u in users]


@router.get("/badges")
async def get_badges(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserBadge).where(UserBadge.user_id == current_user.id)
        .order_by(UserBadge.earned_at.desc())
    )
    badges = result.scalars().all()
    return [
        {
            "id": b.id,
            "badge_name": b.badge_name,
            "badge_icon": b.badge_icon,
            "earned_at": b.earned_at.isoformat(),
        }
        for b in badges
    ]

@router.post("/ping")
async def daily_ping(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Record today's visit once and keep the user's active-day streak."""
    return await record_daily_visit(current_user, db)


@router.get("/activity-overview")
async def activity_overview(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Admin-only engagement overview based on persisted user login/visit data."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    total_users = await db.scalar(select(func.count(User.id))) or 0
    active_today = await db.scalar(select(func.count(User.id)).where(User.last_login >= today_start)) or 0
    active_7d = await db.scalar(select(func.count(User.id)).where(User.last_login >= week_start)) or 0
    active_30d = await db.scalar(select(func.count(User.id)).where(User.last_login >= month_start)) or 0

    rows = await db.execute(
        select(User, func.count(UserActivity.id))
        .outerjoin(UserActivity, (UserActivity.user_id == User.id) & (UserActivity.activity_type == "visit"))
        .group_by(User.id)
        .order_by(User.last_login.desc())
        .limit(25)
    )
    recent_users = [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "avatar": user.avatar,
            "role": user.role,
            "streak_days": user.streak_days or 0,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "total_active_days": activity_count,
        }
        for user, activity_count in rows.all()
    ]
    return {
        "total_users": total_users,
        "active_today": active_today,
        "active_7d": active_7d,
        "active_30d": active_30d,
        "recent_users": recent_users,
    }


@router.get("/streak")
async def get_streak(current_user: User = Depends(get_current_user)):
    """Return current streak info without modifying it."""
    return {
        "streak_days": current_user.streak_days or 0,
        "last_streak_date": current_user.last_streak_date,
    }



class StudentCareerProfileUpdate(BaseModel):
    career_goal: str = Field(default="", max_length=300)
    target_role: str = Field(default="", max_length=160)
    target_industries: list[str] = Field(default_factory=list, max_length=20)
    preferred_locations: list[str] = Field(default_factory=list, max_length=20)
    employment_types: list[str] = Field(default_factory=list, max_length=8)
    work_mode: Literal["any", "remote", "hybrid", "onsite"] = "any"
    target_start_date: str | None = Field(default=None, max_length=10)
    onboarding_completed: bool = False


class AccountDeletionRequestCreate(BaseModel):
    confirmation: Literal["DELETE MY ACCOUNT"]
    reason: str = Field(default="", max_length=2000)


def _career_profile_dict(item: StudentCareerProfile) -> dict:
    return {
        "career_goal": item.career_goal or "",
        "target_role": item.target_role or "",
        "target_industries": item.target_industries or [],
        "preferred_locations": item.preferred_locations or [],
        "employment_types": item.employment_types or [],
        "work_mode": item.work_mode,
        "target_start_date": item.target_start_date,
        "onboarding_completed": item.onboarding_completed,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.get("/career-profile")
async def get_student_career_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(StudentCareerProfile).where(
        StudentCareerProfile.user_id == current_user.id
    ))).scalar_one_or_none()
    if item is None:
        item = StudentCareerProfile(user_id=current_user.id)
        db.add(item)
        await db.commit()
        await db.refresh(item)
    return _career_profile_dict(item)


@router.put("/career-profile")
async def update_student_career_profile(
    req: StudentCareerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required.")
    item = (await db.execute(select(StudentCareerProfile).where(
        StudentCareerProfile.user_id == current_user.id
    ))).scalar_one_or_none()
    if item is None:
        item = StudentCareerProfile(user_id=current_user.id)
        db.add(item)
    for field, value in req.model_dump().items():
        setattr(item, field, value)
    item.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return _career_profile_dict(item)


def _safe_model_dict(row) -> dict:
    """Serialize a model row without credentials or raw uploaded file bytes."""
    excluded = {"password_hash", "file_data", "token", "secret"}
    return {
        column.key: getattr(row, column.key)
        for column in row.__table__.columns
        if column.key not in excluded
    }


@router.get("/export")
async def export_my_studentos_data(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Download an authenticated account export containing only the current user's saved records."""
    from backend.academics.models import Subject, AttendanceRecord, Timetable, Assignment, Note, Exam, StudySession, Grade
    from backend.coding.models import CodingProfile, CodingProblem, Contest, DSAProgress
    from backend.placements.models import Resume, ResumeDocument, ResumeBuilderVersion, Application, Interview, Offer
    from backend.study.models import StudyDocument, StudyChapterProgress
    from backend.productivity.models import Task, Habit, HabitLog, PomodoroSession
    from backend.finance.models import Expense, Budget, SavingsGoal, MonthlyAllowance
    from backend.wellness.models import MoodLog, SleepLog, WaterLog, ExerciseLog, MeditationSession

    async def own_rows(model, *conditions):
        rows = (await db.execute(select(model).where(*conditions).order_by(model.id.asc()))).scalars().all()
        return [_safe_model_dict(row) for row in rows]

    profile = (await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))).scalar_one_or_none()
    career = (await db.execute(select(StudentCareerProfile).where(
        StudentCareerProfile.user_id == current_user.id
    ))).scalar_one_or_none()

    subject_rows = (await db.execute(select(Subject).where(Subject.user_id == current_user.id))).scalars().all()
    subject_ids = [item.id for item in subject_rows]
    if subject_ids:
        attendance_rows = (await db.execute(select(AttendanceRecord).where(
            AttendanceRecord.subject_id.in_(subject_ids)
        ).order_by(AttendanceRecord.date.asc()))).scalars().all()
    else:
        attendance_rows = []

    account = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at,
    }
    preferences = (await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == current_user.id))).scalar_one_or_none()
    latest_deletion_request = (await db.execute(select(AccountDeletionRequest).where(AccountDeletionRequest.user_id == current_user.id).order_by(AccountDeletionRequest.created_at.desc()).limit(1))).scalar_one_or_none()

    export = {
        "exported_at": datetime.now(timezone.utc),
        "format_version": 1,
        "account": account,
        "profile": _safe_model_dict(profile) if profile else None,
        "career_profile": _safe_model_dict(career) if career else None,
        "notification_preferences": _safe_model_dict(preferences) if preferences else None,
        "account_deletion_request": _safe_model_dict(latest_deletion_request) if latest_deletion_request else None,
        "activity": await own_rows(UserActivity, UserActivity.user_id == current_user.id),
        "badges": await own_rows(UserBadge, UserBadge.user_id == current_user.id),
        "notifications": await own_rows(Notification, Notification.user_id == current_user.id),
        "academics": {
            "subjects": [_safe_model_dict(row) for row in subject_rows],
            "attendance": [_safe_model_dict(row) for row in attendance_rows],
            "timetable": await own_rows(Timetable, Timetable.user_id == current_user.id),
            "assignments": await own_rows(Assignment, Assignment.user_id == current_user.id),
            "notes": await own_rows(Note, Note.user_id == current_user.id),
            "exams": await own_rows(Exam, Exam.user_id == current_user.id),
            "study_sessions": await own_rows(StudySession, StudySession.user_id == current_user.id),
            "grades": await own_rows(Grade, Grade.user_id == current_user.id),
        },
        "coding": {
            "profile": [_safe_model_dict(row) for row in (await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))).scalars().all()],
            "problems": await own_rows(CodingProblem, CodingProblem.user_id == current_user.id),
            "contests": await own_rows(Contest, Contest.user_id == current_user.id),
            "dsa_progress": await own_rows(DSAProgress, DSAProgress.user_id == current_user.id),
        },
        "placements": {
            "resume_analysis": await own_rows(Resume, Resume.user_id == current_user.id),
            "resume_documents": await own_rows(ResumeDocument, ResumeDocument.student_id == current_user.id),
            "resume_versions": await own_rows(ResumeBuilderVersion, ResumeBuilderVersion.user_id == current_user.id),
            "applications": await own_rows(Application, Application.user_id == current_user.id),
            "interviews": await own_rows(Interview, Interview.user_id == current_user.id),
            "offers": await own_rows(Offer, Offer.user_id == current_user.id),
        },
        "study": {
            "documents": await own_rows(StudyDocument, StudyDocument.user_id == current_user.id),
            "chapter_progress": await own_rows(StudyChapterProgress, StudyChapterProgress.user_id == current_user.id),
        },
        "productivity": {
            "tasks": await own_rows(Task, Task.user_id == current_user.id),
            "habits": await own_rows(Habit, Habit.user_id == current_user.id),
            "habit_logs": await own_rows(HabitLog, HabitLog.user_id == current_user.id),
            "pomodoro_sessions": await own_rows(PomodoroSession, PomodoroSession.user_id == current_user.id),
        },
        "finance": {
            "expenses": await own_rows(Expense, Expense.user_id == current_user.id),
            "budgets": await own_rows(Budget, Budget.user_id == current_user.id),
            "savings_goals": await own_rows(SavingsGoal, SavingsGoal.user_id == current_user.id),
            "monthly_allowance": await own_rows(MonthlyAllowance, MonthlyAllowance.user_id == current_user.id),
        },
        "wellness": {
            "mood": await own_rows(MoodLog, MoodLog.user_id == current_user.id),
            "sleep": await own_rows(SleepLog, SleepLog.user_id == current_user.id),
            "water": await own_rows(WaterLog, WaterLog.user_id == current_user.id),
            "exercise": await own_rows(ExerciseLog, ExerciseLog.user_id == current_user.id),
            "meditation": await own_rows(MeditationSession, MeditationSession.user_id == current_user.id),
        },
    }
    encoded = jsonable_encoder(export)
    filename = f"studentos-account-export-{datetime.now(timezone.utc).date().isoformat()}.json"
    return JSONResponse(
        content=encoded,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/account/deletion-request", status_code=201)
async def request_account_deletion(
    req: AccountDeletionRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(select(AccountDeletionRequest).where(
        AccountDeletionRequest.user_id == current_user.id,
        AccountDeletionRequest.status == "pending",
    ))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a pending account deletion request.")
    item = AccountDeletionRequest(user_id=current_user.id, reason=req.reason.strip())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {
        "id": item.id,
        "status": item.status,
        "message": "Your account deletion request has been recorded for review. Your account remains active until the request is processed.",
    }


@router.get("/account/deletion-request")
async def get_account_deletion_request(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(AccountDeletionRequest).where(
        AccountDeletionRequest.user_id == current_user.id
    ).order_by(AccountDeletionRequest.created_at.desc()).limit(1))).scalar_one_or_none()
    if item is None:
        return None
    return {
        "id": item.id,
        "status": item.status,
        "reason": item.reason,
        "created_at": item.created_at.isoformat(),
        "reviewed_at": item.reviewed_at.isoformat() if item.reviewed_at else None,
    }


@router.delete("/account/deletion-request")
async def cancel_account_deletion_request(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(AccountDeletionRequest).where(
        AccountDeletionRequest.user_id == current_user.id,
        AccountDeletionRequest.status == "pending",
    ))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="No pending deletion request was found.")
    await db.delete(item)
    await db.commit()
    return {"message": "Pending account deletion request cancelled."}



class AccountDeletionReview(BaseModel):
    status: Literal["approved_for_processing", "rejected"]


@router.get("/admin/account-deletion-requests")
async def list_account_deletion_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    rows = (await db.execute(
        select(AccountDeletionRequest, User)
        .join(User, User.id == AccountDeletionRequest.user_id)
        .where(AccountDeletionRequest.status == "pending")
        .order_by(AccountDeletionRequest.created_at.asc())
    )).all()
    return [{
        "id": request.id,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "reason": request.reason,
        "status": request.status,
        "created_at": request.created_at.isoformat(),
    } for request, user in rows]


@router.patch("/admin/account-deletion-requests/{request_id}")
async def review_account_deletion_request(
    request_id: int,
    req: AccountDeletionReview,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    request = (await db.execute(select(AccountDeletionRequest).where(
        AccountDeletionRequest.id == request_id,
        AccountDeletionRequest.status == "pending",
    ))).scalar_one_or_none()
    if request is None:
        raise HTTPException(status_code=404, detail="Pending account deletion request not found.")
    request.status = req.status
    request.reviewed_by = current_user.id
    request.reviewed_at = datetime.now(timezone.utc)
    notification_message = (
        "Your account deletion request has been approved for processing. Your account remains active until the deletion is completed."
        if req.status == "approved_for_processing"
        else "Your account deletion request was not approved. Contact your administrator if you need more information."
    )
    db.add(Notification(
        user_id=request.user_id,
        title="Account deletion request update",
        message=notification_message,
        notification_type="info",
    ))
    await db.commit()
    return {
        "id": request.id,
        "status": request.status,
        "message": notification_message,
    }

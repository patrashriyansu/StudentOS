from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, UserProfile, UserActivity, UserBadge
from backend.users.activity import record_daily_visit
from backend.users.schemas import UserProfileUpdate, UserResponse
from datetime import datetime, timezone, date, timedelta

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

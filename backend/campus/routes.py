from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, UserProfile, Notification
from backend.coding.models import CodingProfile
from .models import (
    StudentIdentity, ClassSubject, ClassSession, ClassAttendance, Notice, NoticeRead,
    StudentAcademicProfile, MentorStudentAssignment, RecruiterVisibility,
)

router = APIRouter()


def require_faculty(user: User) -> None:
    if user.role not in {"faculty", "admin"}:
        raise HTTPException(status_code=403, detail="Faculty or admin access required.")


class StudentIdentityUpdate(BaseModel):
    registration_number: str = Field(min_length=2, max_length=50)
    section: str = Field(min_length=1, max_length=80)


class SubjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    code: str | None = Field(default=None, max_length=50)
    section: str = Field(min_length=1, max_length=80)


class SessionCreate(BaseModel):
    session_date: date
    topic: str | None = Field(default=None, max_length=300)


class AttendanceEntry(BaseModel):
    student_id: int
    status: Literal["present", "absent"]


class AttendanceBatch(BaseModel):
    records: list[AttendanceEntry] = Field(min_length=1, max_length=250)


class NoticeCreate(BaseModel):
    title: str = Field(min_length=3, max_length=250)
    message: str = Field(min_length=1, max_length=10000)
    audience_type: Literal["all", "section"] = "all"
    section: str | None = Field(default=None, max_length=80)
    priority: Literal["normal", "important", "urgent"] = "normal"
    expires_at: datetime | None = None


class FacultyPromotion(BaseModel):
    email: str = Field(min_length=5, max_length=255)


@router.get("/profile")
async def get_student_identity(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentIdentity).where(StudentIdentity.user_id == current_user.id))
    identity = result.scalar_one_or_none()
    return {"registration_number": identity.registration_number if identity else None,
            "section": identity.section if identity else None, "complete": identity is not None}


@router.put("/profile")
async def update_student_identity(req: StudentIdentityUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only student accounts have student registration details.")
    registration_number, section = req.registration_number.strip().upper(), req.section.strip().upper()
    existing = await db.execute(select(StudentIdentity).where(StudentIdentity.registration_number == registration_number))
    identity_with_number = existing.scalar_one_or_none()
    if identity_with_number and identity_with_number.user_id != current_user.id:
        raise HTTPException(status_code=409, detail="That registration number is already linked to another account.")
    result = await db.execute(select(StudentIdentity).where(StudentIdentity.user_id == current_user.id))
    identity = result.scalar_one_or_none()
    if identity:
        identity.registration_number, identity.section = registration_number, section
    else:
        db.add(StudentIdentity(user_id=current_user.id, registration_number=registration_number, section=section))
    await db.commit()
    return {"message": "Student details saved", "registration_number": registration_number, "section": section}


@router.get("/sections")
async def list_sections(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role == "admin":
        result = await db.execute(select(StudentIdentity.section).distinct().order_by(StudentIdentity.section.asc()))
        return [{"name": row[0]} for row in result.all()]
    if current_user.role == "faculty":
        result = await db.execute(select(ClassSubject.section).where(
            ClassSubject.faculty_user_id == current_user.id
        ).distinct().order_by(ClassSubject.section.asc()))
        return [{"name": row[0]} for row in result.all()]
    if current_user.role == "student":
        identity = (await db.execute(select(StudentIdentity).where(
            StudentIdentity.user_id == current_user.id
        ))).scalar_one_or_none()
        return [{"name": identity.section}] if identity else []
    return []

@router.get("/students")
async def list_students(section: str | None = None, q: str | None = Query(default=None, max_length=120),
                        limit: int = Query(default=200, ge=1, le=500), offset: int = Query(default=0, ge=0),
                        current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_faculty(current_user)
    stmt = (select(User, StudentIdentity, CodingProfile)
            .outerjoin(StudentIdentity, StudentIdentity.user_id == User.id)
            .outerjoin(CodingProfile, CodingProfile.user_id == User.id)
            .where(User.role == "student"))
    if current_user.role == "faculty":
        owned_sections = select(ClassSubject.section).where(ClassSubject.faculty_user_id == current_user.id)
        stmt = stmt.where(StudentIdentity.section.in_(owned_sections))
    if section:
        normalized = section.strip().upper()
        if current_user.role == "faculty":
            owns = await db.execute(select(ClassSubject.id).where(
                ClassSubject.faculty_user_id == current_user.id, ClassSubject.section == normalized
            ).limit(1))
            if owns.scalar_one_or_none() is None:
                return []
        stmt = stmt.where(StudentIdentity.section == normalized)
    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.name.ilike(term), User.email.ilike(term), StudentIdentity.registration_number.ilike(term)))
    result = await db.execute(stmt.order_by(StudentIdentity.section.asc(), User.name.asc()).limit(limit).offset(offset))
    return [{
        "id": user.id, "name": user.name, "email": user.email,
        "registration_number": identity.registration_number if identity else None,
        "section": identity.section if identity else None,
        "leetcode_username": coding.leetcode_username if coding else None,
        "total_problems_solved": coding.total_problems_solved if coding else 0,
        "easy_solved": coding.easy_solved if coding else 0,
        "medium_solved": coding.medium_solved if coding else 0,
        "hard_solved": coding.hard_solved if coding else 0,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    } for user, identity, coding in result.all()]

@router.get("/leaderboard")
async def coding_leaderboard(section: str | None = None, current_user: User = Depends(get_current_user),
                             db: AsyncSession = Depends(get_db)):
    if current_user.role not in {"student", "faculty", "admin"}:
        raise HTTPException(status_code=403, detail="Campus coding rankings are not available to this account.")
    stmt = (select(User, StudentIdentity, CodingProfile)
            .outerjoin(StudentIdentity, StudentIdentity.user_id == User.id)
            .outerjoin(CodingProfile, CodingProfile.user_id == User.id)
            .where(User.role == "student", User.is_active.is_(True)))
    if current_user.role == "faculty":
        owned_sections = select(ClassSubject.section).where(ClassSubject.faculty_user_id == current_user.id)
        stmt = stmt.where(StudentIdentity.section.in_(owned_sections))
    if section:
        normalized = section.strip().upper()
        if current_user.role == "faculty":
            owns = await db.execute(select(ClassSubject.id).where(
                ClassSubject.faculty_user_id == current_user.id, ClassSubject.section == normalized
            ).limit(1))
            if owns.scalar_one_or_none() is None:
                return {"count": 0, "section": normalized, "students": []}
        stmt = stmt.where(StudentIdentity.section == normalized)
    stmt = stmt.order_by(func.coalesce(CodingProfile.total_problems_solved, 0).desc(),
                         func.coalesce(CodingProfile.hard_solved, 0).desc(),
                         func.coalesce(CodingProfile.medium_solved, 0).desc(), User.name.asc())
    rows = (await db.execute(stmt)).all()
    students = []
    for rank, (user, identity, coding) in enumerate(rows, start=1):
        students.append({
            "rank": rank, "student_id": user.id, "name": user.name,
            "registration_number": identity.registration_number if identity else None,
            "section": identity.section if identity else None,
            "leetcode_username": coding.leetcode_username if coding else None,
            "profile_url": f"https://leetcode.com/u/{coding.leetcode_username}/" if coding and coding.leetcode_username else None,
            "total_solved": coding.total_problems_solved if coding else 0,
            "easy_solved": coding.easy_solved if coding else 0,
            "medium_solved": coding.medium_solved if coding else 0,
            "hard_solved": coding.hard_solved if coding else 0,
            "last_synced_at": coding.updated_at.isoformat() if coding and coding.updated_at else None,
        })
    return {"count": len(students), "section": section.strip().upper() if section else None, "students": students}


@router.get("/subjects")
async def list_class_subjects(section: str | None = None, current_user: User = Depends(get_current_user),
                              db: AsyncSession = Depends(get_db)):
    stmt = select(ClassSubject)
    if current_user.role == "faculty":
        stmt = stmt.where(ClassSubject.faculty_user_id == current_user.id)
    if current_user.role not in {"faculty", "admin"}:
        identity = (await db.execute(select(StudentIdentity).where(StudentIdentity.user_id == current_user.id))).scalar_one_or_none()
        if not identity:
            return []
        stmt = stmt.where(ClassSubject.section == identity.section)
    if section:
        stmt = stmt.where(ClassSubject.section == section.strip().upper())
    result = await db.execute(stmt.order_by(ClassSubject.section, ClassSubject.name))
    return [{"id": item.id, "name": item.name, "code": item.code, "section": item.section,
             "faculty_user_id": item.faculty_user_id} for item in result.scalars().all()]


@router.post("/subjects")
async def create_class_subject(req: SubjectCreate, current_user: User = Depends(get_current_user),
                               db: AsyncSession = Depends(get_db)):
    require_faculty(current_user)
    subject = ClassSubject(faculty_user_id=current_user.id, section=req.section.strip().upper(),
                           name=req.name.strip(), code=req.code.strip().upper() if req.code else None)
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return {"id": subject.id, "name": subject.name, "section": subject.section, "code": subject.code}


@router.post("/subjects/{subject_id}/sessions")
async def create_class_session(subject_id: int, req: SessionCreate, current_user: User = Depends(get_current_user),
                               db: AsyncSession = Depends(get_db)):
    require_faculty(current_user)
    stmt = select(ClassSubject).where(ClassSubject.id == subject_id)
    if current_user.role != "admin":
        stmt = stmt.where(ClassSubject.faculty_user_id == current_user.id)
    subject = (await db.execute(stmt)).scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Class subject not found.")
    duplicate = await db.execute(select(ClassSession).where(ClassSession.subject_id == subject.id,
                                                             ClassSession.session_date == req.session_date))
    if duplicate.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A class session already exists for this subject and date.")
    session = ClassSession(subject_id=subject.id, session_date=req.session_date, topic=req.topic)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"id": session.id, "subject_id": subject.id, "session_date": session.session_date.isoformat(), "section": subject.section}


@router.post("/sessions/{session_id}/attendance")
async def mark_class_attendance(session_id: int, req: AttendanceBatch, current_user: User = Depends(get_current_user),
                                db: AsyncSession = Depends(get_db)):
    require_faculty(current_user)
    pair = (await db.execute(select(ClassSession, ClassSubject).join(ClassSubject, ClassSubject.id == ClassSession.subject_id)
                             .where(ClassSession.id == session_id))).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Class session not found.")
    session, subject = pair
    if current_user.role != "admin" and subject.faculty_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only mark attendance for your own classes.")
    student_ids = list({entry.student_id for entry in req.records})
    valid_ids = set((await db.execute(select(StudentIdentity.user_id).where(
        StudentIdentity.user_id.in_(student_ids), StudentIdentity.section == subject.section))).scalars().all())
    if valid_ids != set(student_ids):
        raise HTTPException(status_code=422, detail="Every selected student must belong to this class section.")
    for entry in req.records:
        record = (await db.execute(select(ClassAttendance).where(
            ClassAttendance.session_id == session.id, ClassAttendance.student_id == entry.student_id))).scalar_one_or_none()
        if record:
            record.status, record.marked_by, record.marked_at = entry.status, current_user.id, datetime.now(timezone.utc)
        else:
            db.add(ClassAttendance(session_id=session.id, student_id=entry.student_id, status=entry.status, marked_by=current_user.id))
    await db.commit()
    return {"message": "Attendance saved", "session_id": session.id, "updated_students": len(student_ids)}


@router.get("/attendance")
async def get_campus_attendance(section: str | None = None, current_user: User = Depends(get_current_user),
                                db: AsyncSession = Depends(get_db)):
    if current_user.role in {"faculty", "admin"}:
        student_stmt = (select(User, StudentIdentity)
            .join(StudentIdentity, StudentIdentity.user_id == User.id)
            .where(User.role == "student"))
        rows_stmt = (select(ClassAttendance.student_id, ClassAttendance.status, ClassSubject.section)
            .join(ClassSession, ClassSession.id == ClassAttendance.session_id)
            .join(ClassSubject, ClassSubject.id == ClassSession.subject_id))
        if current_user.role == "faculty":
            owned_sections = select(ClassSubject.section).where(ClassSubject.faculty_user_id == current_user.id)
            student_stmt = student_stmt.where(StudentIdentity.section.in_(owned_sections))
            rows_stmt = rows_stmt.where(ClassSubject.faculty_user_id == current_user.id)
        if section:
            normalized = section.strip().upper()
            if current_user.role == "faculty":
                owns = await db.execute(select(ClassSubject.id).where(
                    ClassSubject.faculty_user_id == current_user.id, ClassSubject.section == normalized
                ).limit(1))
                if owns.scalar_one_or_none() is None:
                    return []
            student_stmt = student_stmt.where(StudentIdentity.section == normalized)
            rows_stmt = rows_stmt.where(ClassSubject.section == normalized)
        students = (await db.execute(student_stmt.order_by(StudentIdentity.section, User.name))).all()
        counts = {}
        for student_id, status, _ in (await db.execute(rows_stmt)).all():
            total, present = counts.get(student_id, (0, 0))
            counts[student_id] = (total + 1, present + (1 if status == "present" else 0))
        return [{
            "student_id": user.id, "name": user.name,
            "registration_number": identity.registration_number,
            "section": identity.section,
            "total_classes": counts.get(user.id, (0, 0))[0],
            "present": counts.get(user.id, (0, 0))[1],
            "absent": counts.get(user.id, (0, 0))[0] - counts.get(user.id, (0, 0))[1],
            "percentage": round(100 * counts.get(user.id, (0, 0))[1] / counts.get(user.id, (0, 0))[0], 1) if counts.get(user.id, (0, 0))[0] else 0,
        } for user, identity in students]
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student or faculty access required.")
    identity = (await db.execute(select(StudentIdentity).where(StudentIdentity.user_id == current_user.id))).scalar_one_or_none()
    if not identity:
        return {"registration_required": True, "subjects": []}
    rows = (await db.execute(select(ClassSubject.name, ClassAttendance.status)
        .join(ClassSession, ClassSession.subject_id == ClassSubject.id)
        .join(ClassAttendance, ClassAttendance.session_id == ClassSession.id)
        .where(ClassAttendance.student_id == current_user.id))).all()
    totals = {}
    for name, status in rows:
        total, present = totals.get(name, (0, 0))
        totals[name] = (total + 1, present + (1 if status == "present" else 0))
    subjects = [{"subject": name, "total_classes": total, "present": present, "absent": total-present,
                 "percentage": round(100*present/total, 1) if total else 0}
                for name, (total, present) in sorted(totals.items())]
    return {"registration_required": False, "section": identity.section, "subjects": subjects}

@router.get("/sessions")
async def list_class_sessions(section: str | None = None, current_user: User = Depends(get_current_user),
                              db: AsyncSession = Depends(get_db)):
    require_faculty(current_user)
    stmt = select(ClassSession, ClassSubject).join(ClassSubject, ClassSubject.id == ClassSession.subject_id)
    if current_user.role != "admin":
        stmt = stmt.where(ClassSubject.faculty_user_id == current_user.id)
    if section:
        stmt = stmt.where(ClassSubject.section == section.strip().upper())
    result = await db.execute(stmt.order_by(ClassSession.session_date.desc()).limit(100))
    return [{"id": session.id, "subject_id": subject.id, "subject": subject.name, "section": subject.section,
             "session_date": session.session_date.isoformat(), "topic": session.topic}
            for session, subject in result.all()]


@router.get("/notices")
async def list_notices(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role not in {"student", "faculty", "admin"}:
        raise HTTPException(status_code=403, detail="Campus notices are not available to this account.")
    stmt = select(Notice).where(or_(Notice.expires_at.is_(None), Notice.expires_at > datetime.now(timezone.utc)))
    if current_user.role == "student":
        identity = (await db.execute(select(StudentIdentity).where(StudentIdentity.user_id == current_user.id))).scalar_one_or_none()
        if identity:
            stmt = stmt.where(or_(Notice.audience_type == "all",
                                  and_(Notice.audience_type == "section", Notice.audience_section == identity.section)))
        else:
            stmt = stmt.where(Notice.audience_type == "all")
    elif current_user.role == "faculty":
        stmt = stmt.where(or_(Notice.audience_type == "all", Notice.created_by == current_user.id))
    notices = (await db.execute(stmt.order_by(Notice.created_at.desc()).limit(100))).scalars().all()
    read_ids = set((await db.execute(select(NoticeRead.notice_id).where(NoticeRead.student_id == current_user.id))).scalars().all())
    return [{"id": item.id, "title": item.title, "message": item.message, "audience_type": item.audience_type,
             "section": item.audience_section, "priority": item.priority, "read": item.id in read_ids,
             "created_at": item.created_at.isoformat(), "expires_at": item.expires_at.isoformat() if item.expires_at else None}
            for item in notices]


@router.post("/notices")
async def create_notice(req: NoticeCreate, current_user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    require_faculty(current_user)
    section = req.section.strip().upper() if req.section else None
    if current_user.role == "faculty":
        if req.audience_type != "section" or not section:
            raise HTTPException(status_code=403, detail="Faculty notices must target one of your assigned sections.")
        assigned = await db.execute(select(ClassSubject.id).where(
            ClassSubject.faculty_user_id == current_user.id,
            ClassSubject.section == section,
        ).limit(1))
        if assigned.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="You can only publish notices to your assigned sections.")
    if req.audience_type == "section":
        if not section:
            raise HTTPException(status_code=422, detail="Choose a section for this notice.")
        exists = await db.execute(select(StudentIdentity.user_id).where(StudentIdentity.section == section).limit(1))
        if not exists.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="No registered students were found in that section.")
    expires_at = req.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    notice = Notice(created_by=current_user.id, title=req.title.strip(), message=req.message.strip(),
        audience_type=req.audience_type, audience_section=section if req.audience_type == "section" else None,
        priority=req.priority, expires_at=expires_at)
    db.add(notice)
    await db.flush()
    student_stmt = select(User.id).where(User.role == "student", User.is_active.is_(True))
    if req.audience_type == "section":
        student_stmt = student_stmt.join(StudentIdentity, StudentIdentity.user_id == User.id).where(StudentIdentity.section == section)
    student_ids = (await db.execute(student_stmt)).scalars().all()
    for student_id in student_ids:
        db.add(Notification(user_id=student_id, title=notice.title, message=notice.message,
                            notification_type="warning" if notice.priority == "urgent" else "info"))
    await db.commit()
    return {"id": notice.id, "message": "Notice published", "recipients": len(student_ids)}


@router.post("/notices/{notice_id}/read")
async def mark_notice_read(notice_id: int, current_user: User = Depends(get_current_user),
                           db: AsyncSession = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can mark notices as read.")
    notice = (await db.execute(select(Notice).where(Notice.id == notice_id))).scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")
    identity = (await db.execute(select(StudentIdentity).where(StudentIdentity.user_id == current_user.id))).scalar_one_or_none()
    visible = notice.audience_type == "all" or (identity is not None and identity.section == notice.audience_section)
    if not visible:
        raise HTTPException(status_code=404, detail="Notice not found.")
    existing = await db.execute(select(NoticeRead).where(NoticeRead.notice_id == notice_id, NoticeRead.student_id == current_user.id))
    if not existing.scalar_one_or_none():
        db.add(NoticeRead(notice_id=notice_id, student_id=current_user.id))
        await db.commit()
    return {"message": "Notice marked as read"}


@router.delete("/notices/{notice_id}")
async def delete_notice(notice_id: int, current_user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    require_faculty(current_user)
    stmt = select(Notice).where(Notice.id == notice_id)
    if current_user.role != "admin":
        stmt = stmt.where(Notice.created_by == current_user.id)
    notice = (await db.execute(stmt)).scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")
    await db.delete(notice)
    await db.commit()
    return {"message": "Notice deleted"}


@router.post("/faculty")
async def grant_faculty_access(req: FacultyPromotion, current_user: User = Depends(get_current_user),
                               db: AsyncSession = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    target = (await db.execute(select(User).where(func.lower(User.email) == req.email.strip().lower()))).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Create the account first, then grant faculty access.")
    target.role = "faculty"
    await db.commit()
    return {"message": "Faculty access granted", "email": target.email, "role": target.role}


# ── Student academic profile and role-scoped visibility ────────────────────────
class StudentAcademicProfileUpdate(BaseModel):
    registration_number: str | None = Field(default=None, min_length=2, max_length=50)
    section: str | None = Field(default=None, min_length=1, max_length=80)
    course: str | None = Field(default=None, max_length=100)
    branch: str | None = Field(default=None, max_length=100)
    admission_year: int | None = Field(default=None, ge=2000, le=2200)
    passing_out_year: int | None = Field(default=None, ge=2000, le=2200)
    current_year: int | None = Field(default=None, ge=1, le=8)
    current_semester: int | None = Field(default=None, ge=1, le=16)
    cgpa: float | None = Field(default=None, ge=0, le=10)
    sgpa: float | None = Field(default=None, ge=0, le=10)


class MentorAssignmentCreate(BaseModel):
    mentor_email: str = Field(min_length=5, max_length=255)
    student_email: str = Field(min_length=5, max_length=255)


class RecruiterVisibilityUpdate(BaseModel):
    profile_visible: bool | None = None
    contact_visible: bool | None = None


def require_role(user: User, role: str) -> None:
    if user.role != role:
        raise HTTPException(status_code=403, detail=f"{role.capitalize()} access required.")


@router.get("/academic-profile")
async def get_academic_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(current_user, "student")
    result = await db.execute(select(StudentAcademicProfile).where(
        StudentAcademicProfile.student_id == current_user.id
    ))
    academic = result.scalar_one_or_none()
    identity_result = await db.execute(select(StudentIdentity).where(
        StudentIdentity.user_id == current_user.id
    ))
    identity = identity_result.scalar_one_or_none()
    data = {
        "registration_number": identity.registration_number if identity else None,
        "section": identity.section if identity else None,
        "course": academic.course if academic else None,
        "branch": academic.branch if academic else None,
        "admission_year": academic.admission_year if academic else None,
        "passing_out_year": academic.passing_out_year if academic else None,
        "current_year": academic.current_year if academic else None,
        "current_semester": academic.current_semester if academic else None,
        "cgpa": academic.cgpa if academic else None,
        "sgpa": academic.sgpa if academic else None,
    }
    data["complete"] = all(data.get(field) not in (None, "") for field in (
        "section", "course", "branch", "passing_out_year", "current_year", "current_semester"
    ))
    return data


@router.put("/academic-profile")
async def update_academic_profile(
    req: StudentAcademicProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(current_user, "student")
    result = await db.execute(select(StudentAcademicProfile).where(
        StudentAcademicProfile.student_id == current_user.id
    ))
    academic = result.scalar_one_or_none()
    if academic is None:
        academic = StudentAcademicProfile(student_id=current_user.id)
        db.add(academic)

    values = req.model_dump(exclude_unset=True)
    registration_number = values.pop("registration_number", None)
    section = values.pop("section", None)
    identity_result = await db.execute(select(StudentIdentity).where(
        StudentIdentity.user_id == current_user.id
    ))
    identity = identity_result.scalar_one_or_none()

    if registration_number is not None:
        registration_number = registration_number.strip().upper()
        duplicate = await db.execute(select(StudentIdentity).where(
            StudentIdentity.registration_number == registration_number
        ))
        existing_identity = duplicate.scalar_one_or_none()
        if existing_identity and existing_identity.user_id != current_user.id:
            raise HTTPException(status_code=409, detail="That registration number is already in use.")
    if section is not None:
        section = section.strip().upper()
        if not section:
            raise HTTPException(status_code=422, detail="Section cannot be blank.")

    if identity is None:
        if not registration_number or not section:
            raise HTTPException(
                status_code=422,
                detail="Enter both your registration number and section to complete your student identity.",
            )
        identity = StudentIdentity(
            user_id=current_user.id,
            registration_number=registration_number,
            section=section,
        )
        db.add(identity)
    else:
        if registration_number is not None:
            identity.registration_number = registration_number
        if section is not None:
            identity.section = section

    for field, value in values.items():
        setattr(academic, field, value.strip() if isinstance(value, str) else value)

    if academic.admission_year and academic.passing_out_year:
        if academic.passing_out_year < academic.admission_year:
            raise HTTPException(status_code=422, detail="Passing-out year cannot be earlier than admission year.")

    await db.commit()
    return {"message": "Academic profile saved", "complete": bool(
        identity and identity.section and academic.course and academic.branch
        and academic.passing_out_year and academic.current_year and academic.current_semester
    )}


@router.post("/mentor/assignments", status_code=201)
async def create_mentor_assignment(
    req: MentorAssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only an administrator can assign mentor-student relationships.")

    mentor_result = await db.execute(select(User).where(
        User.email == req.mentor_email.strip().lower(), User.role == "mentor"
    ))
    mentor = mentor_result.scalar_one_or_none()
    student_result = await db.execute(select(User).where(
        User.email == req.student_email.strip().lower(), User.role == "student"
    ))
    student = student_result.scalar_one_or_none()
    if mentor is None or student is None:
        raise HTTPException(status_code=404, detail="Check that the mentor and student accounts exist with the correct roles.")

    existing = await db.execute(select(MentorStudentAssignment).where(
        MentorStudentAssignment.mentor_id == mentor.id,
        MentorStudentAssignment.student_id == student.id,
    ))
    if existing.scalar_one_or_none():
        return {"message": "This student is already assigned to the mentor."}

    db.add(MentorStudentAssignment(
        mentor_id=mentor.id,
        student_id=student.id,
        assigned_by=current_user.id,
    ))
    await db.commit()
    return {"message": "Mentor assignment created"}


@router.get("/mentor/students")
async def get_mentor_students(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(current_user, "mentor")
    statement = (
        select(User, StudentIdentity, StudentAcademicProfile, UserProfile)
        .join(MentorStudentAssignment, MentorStudentAssignment.student_id == User.id)
        .outerjoin(StudentIdentity, StudentIdentity.user_id == User.id)
        .outerjoin(StudentAcademicProfile, StudentAcademicProfile.student_id == User.id)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .where(
            MentorStudentAssignment.mentor_id == current_user.id,
            User.role == "student",
            User.is_active.is_(True),
        )
        .order_by(User.name.asc())
    )
    rows = (await db.execute(statement)).all()
    # CGPA/SGPA, placements, exams and private study data are intentionally not
    # included in the mentor response.
    return [{
        "student_id": student.id,
        "name": student.name,
        "section": identity.section if identity else None,
        "course": academic.course if academic else None,
        "branch": academic.branch if academic else None,
        "college": profile.college if profile else None,
        "passing_out_year": academic.passing_out_year if academic else None,
        "current_year": academic.current_year if academic else None,
        "current_semester": academic.current_semester if academic else None,
    } for student, identity, academic, profile in rows]


@router.get("/recruiter/visibility")
async def get_recruiter_visibility(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(current_user, "student")
    result = await db.execute(select(RecruiterVisibility).where(
        RecruiterVisibility.user_id == current_user.id
    ))
    visibility = result.scalar_one_or_none()
    return {
        "profile_visible": visibility.profile_visible if visibility else False,
        "contact_visible": visibility.contact_visible if visibility else False,
    }


@router.put("/recruiter/visibility")
async def update_recruiter_visibility(
    req: RecruiterVisibilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(current_user, "student")
    result = await db.execute(select(RecruiterVisibility).where(
        RecruiterVisibility.user_id == current_user.id
    ))
    visibility = result.scalar_one_or_none()
    if visibility is None:
        visibility = RecruiterVisibility(user_id=current_user.id)
        db.add(visibility)

    if req.profile_visible is not None:
        visibility.profile_visible = req.profile_visible
    if req.contact_visible is not None:
        visibility.contact_visible = req.contact_visible

    if not visibility.profile_visible:
        visibility.contact_visible = False

    await db.commit()
    return {
        "profile_visible": visibility.profile_visible,
        "contact_visible": visibility.contact_visible,
        "message": "Recruiter visibility preferences saved",
    }


@router.get("/recruiter/candidates")
async def get_recruiter_candidates(
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_role(current_user, "recruiter")
    statement = (
        select(User, UserProfile, StudentAcademicProfile, CodingProfile, RecruiterVisibility)
        .join(RecruiterVisibility, RecruiterVisibility.user_id == User.id)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .outerjoin(StudentAcademicProfile, StudentAcademicProfile.student_id == User.id)
        .outerjoin(CodingProfile, CodingProfile.user_id == User.id)
        .where(
            User.role == "student",
            User.is_active.is_(True),
            RecruiterVisibility.profile_visible.is_(True),
        )
    )
    if q and q.strip():
        term = "%" + q.strip() + "%"
        statement = statement.where(or_(
            User.name.ilike(term),
            UserProfile.department.ilike(term),
            UserProfile.college.ilike(term),
            StudentAcademicProfile.branch.ilike(term),
        ))
    rows = (await db.execute(statement.order_by(User.name.asc()).limit(limit))).all()

    # Candidate search returns only student-approved career data. No CGPA,
    # SGPA, semester marks, attendance, expenses, study data or mentor notes.
    return [{
        "student_id": student.id,
        "name": student.name,
        "email": student.email if visibility.contact_visible else None,
        "college": profile.college if profile else None,
        "course": academic.course if academic else None,
        "branch": academic.branch if academic else (profile.department if profile else None),
        "passing_out_year": academic.passing_out_year if academic else None,
        "skills": profile.skills or [] if profile else [],
        "github_url": profile.github_url if profile else None,
        "linkedin_url": profile.linkedin_url if profile else None,
        "portfolio_url": profile.portfolio_url if profile else None,
        "resume_url": profile.resume_url if profile else None,
        "leetcode_username": coding.leetcode_username if coding else None,
        "total_problems_solved": coding.total_problems_solved if coding else 0,
        "easy_solved": coding.easy_solved if coding else 0,
        "medium_solved": coding.medium_solved if coding else 0,
        "hard_solved": coding.hard_solved if coding else 0,
    } for student, profile, academic, coding, visibility in rows]

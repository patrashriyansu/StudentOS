from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
import io

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, UserProfile
from backend.academics.models import Grade
from backend.placements.models import ResumeDocument, ApplicationResumeSnapshot
from backend.campus.models import (
    ClassSubject, StudentIdentity, StudentAcademicProfile,
    MentorStudentAssignment, RecruiterVisibility, RecruiterDisclosure,
)
from backend.coding.models import CodingProfile
from .models import (
    RecruiterJob, RecruiterShortlist, RecruiterApplication,
    MentorSession, MentorGoal, MentorNote,
    ClassAssignment, AssignmentSubmission, ClassMark,
    LearningResource, TimetableEntry, MentorProgram, MentorDevelopmentGoal,
    MentorActionItem, MentorCheckIn, MentorSessionFeedback,
)

router = APIRouter()


def require_role(user: User, *roles: str) -> None:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="You do not have permission to access this workspace.")


def normalize_dt(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


async def get_subject(subject_id: int, user: User, db: AsyncSession) -> ClassSubject:
    result = await db.execute(select(ClassSubject).where(ClassSubject.id == subject_id))
    subject = result.scalar_one_or_none()
    if subject is None:
        raise HTTPException(status_code=404, detail="Class not found.")
    if user.role != "admin" and subject.faculty_user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only manage your assigned classes.")
    return subject


async def assigned_student(mentor: User, student_id: int, db: AsyncSession) -> User:
    result = await db.execute(
        select(User)
        .join(MentorStudentAssignment, MentorStudentAssignment.student_id == User.id)
        .where(
            MentorStudentAssignment.mentor_id == mentor.id,
            MentorStudentAssignment.student_id == student_id,
            User.role == "student",
            User.is_active.is_(True),
        )
    )
    student = result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="This student is not assigned to your mentor account.")
    return student


async def student_in_section(student_id: int, section: str, db: AsyncSession) -> bool:
    result = await db.execute(select(StudentIdentity.user_id).where(
        StudentIdentity.user_id == student_id,
        StudentIdentity.section == section,
    ))
    return result.scalar_one_or_none() is not None


def job_dict(job: RecruiterJob) -> dict:
    return {
        "id": job.id, "title": job.title, "company": job.company,
        "description": job.description, "location": job.location,
        "employment_type": job.employment_type, "skills": job.skills or [],
        "graduation_year_min": job.graduation_year_min,
        "graduation_year_max": job.graduation_year_max,
        "deadline": job.deadline.isoformat() if job.deadline else None,
        "status": job.status, "created_at": job.created_at.isoformat(),
    }


class JobCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    company: str = Field(min_length=2, max_length=180)
    description: str = Field(min_length=10, max_length=12000)
    location: str | None = Field(default=None, max_length=180)
    employment_type: Literal["Full-time", "Internship", "Part-time", "Contract"] = "Full-time"
    skills: list[str] = Field(default_factory=list, max_length=30)
    graduation_year_min: int | None = Field(default=None, ge=2000, le=2200)
    graduation_year_max: int | None = Field(default=None, ge=2000, le=2200)
    deadline: date | None = None


class JobStatusUpdate(BaseModel):
    status: Literal["open", "closed"]


class ApplicationCreate(BaseModel):
    resume_document_id: int
    cover_note: str | None = Field(default=None, max_length=5000)


class ApplicationStatusUpdate(BaseModel):
    status: Literal["shortlisted", "interview", "selected", "rejected", "applied"]
    recruiter_note: str | None = Field(default=None, max_length=3000)


class ShortlistCreate(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class MentorSessionCreate(BaseModel):
    student_id: int
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, ge=10, le=240)
    meeting_link: str | None = Field(default=None, max_length=1000)
    agenda: str | None = Field(default=None, max_length=3000)


class MentorSessionUpdate(BaseModel):
    status: Literal["scheduled", "completed", "cancelled"]


class MentorGoalCreate(BaseModel):
    student_id: int
    title: str = Field(min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=3000)
    due_date: date | None = None


class MentorGoalUpdate(BaseModel):
    status: Literal["not_started", "in_progress", "completed", "blocked"]


class MentorNoteCreate(BaseModel):
    student_id: int
    body: str = Field(min_length=1, max_length=10000)

class MentorProgramCreate(BaseModel):
    student_id: int
    title: str = Field(min_length=3, max_length=180)
    focus_area: Literal["Career readiness", "Technical skills", "Academic progress", "Communication", "Leadership", "Professional growth"] = "Career readiness"
    description: str = Field(min_length=10, max_length=5000)
    start_date: date
    target_end_date: date | None = None
    meeting_cadence: Literal["weekly", "biweekly", "monthly"] = "biweekly"


class MentorProgramUpdate(BaseModel):
    status: Literal["paused", "completed", "active"]


class MentorDevelopmentGoalCreate(BaseModel):
    program_id: int
    title: str = Field(min_length=3, max_length=180)
    category: Literal["Technical skills", "Career readiness", "Academic progress", "Communication", "Leadership", "Professionalism", "Teamwork", "Technology", "Personal growth"] = "Career readiness"
    desired_outcome: str = Field(min_length=8, max_length=3000)
    success_measure: str = Field(min_length=3, max_length=500)
    baseline: str | None = Field(default=None, max_length=180)
    target: str | None = Field(default=None, max_length=180)
    priority: Literal["low", "medium", "high"] = "medium"
    due_date: date | None = None


class MentorDevelopmentGoalUpdate(BaseModel):
    progress_percent: int = Field(ge=0, le=100)
    status: Literal["not_started", "in_progress", "completed", "blocked"]


class MentorActionItemCreate(BaseModel):
    goal_id: int
    title: str = Field(min_length=3, max_length=180)
    description: str | None = Field(default=None, max_length=2000)
    owner: Literal["student", "mentor"] = "student"
    due_date: date | None = None
    resource_url: str | None = Field(default=None, max_length=1000)


class MentorActionItemUpdate(BaseModel):
    status: Literal["not_started", "in_progress", "completed", "blocked"]


class MentorCheckInCreate(BaseModel):
    confidence_rating: int = Field(ge=1, le=5)
    progress_status: Literal["on_track", "needs_support", "blocked"]
    wins: str | None = Field(default=None, max_length=3000)
    blockers: str | None = Field(default=None, max_length=3000)
    support_needed: str | None = Field(default=None, max_length=3000)


class MentorCheckInReply(BaseModel):
    mentor_reply: str = Field(min_length=2, max_length=3000)


class MentorSessionFeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    takeaways: str = Field(min_length=2, max_length=3000)
    next_steps: str | None = Field(default=None, max_length=3000)


class StudentProgramResponse(BaseModel):
    accepted: bool


class StudentActionItemUpdate(BaseModel):
    status: Literal["not_started", "in_progress", "completed", "blocked"]


class AssignmentCreate(BaseModel):
    subject_id: int
    title: str = Field(min_length=2, max_length=180)
    instructions: str = Field(min_length=1, max_length=12000)
    attachment_url: str | None = Field(default=None, max_length=1000)
    points: float = Field(default=100, gt=0, le=10000)
    due_at: datetime | None = None


class SubmissionCreate(BaseModel):
    submission_text: str | None = Field(default=None, max_length=12000)
    attachment_url: str | None = Field(default=None, max_length=1000)


class GradeCreate(BaseModel):
    marks_awarded: float = Field(ge=0)
    feedback: str | None = Field(default=None, max_length=5000)


class MarkCreate(BaseModel):
    subject_id: int
    student_id: int
    assessment: str = Field(min_length=2, max_length=180)
    marks_obtained: float = Field(ge=0)
    max_marks: float = Field(gt=0, le=10000)
    remarks: str | None = Field(default=None, max_length=2000)


class ResourceCreate(BaseModel):
    subject_id: int
    title: str = Field(min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=3000)
    resource_url: str = Field(min_length=8, max_length=1000)


class TimetableCreate(BaseModel):
    subject_id: int
    weekday: int = Field(ge=0, le=6)
    starts_at: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    ends_at: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    room: str | None = Field(default=None, max_length=100)


class AdminClassAssign(BaseModel):
    faculty_email: str = Field(min_length=5, max_length=255)
    name: str = Field(min_length=2, max_length=200)
    code: str | None = Field(default=None, max_length=50)
    section: str = Field(min_length=1, max_length=80)

class AdminStaffUpdate(BaseModel):
    role: Literal["faculty", "mentor", "recruiter"] | None = None
    is_active: bool | None = None


# ---------------------------------------------------------------------------
# Recruiter workspace
# ---------------------------------------------------------------------------

@router.get("/recruiter/summary")
async def recruiter_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    jobs = (await db.execute(select(func.count(RecruiterJob.id)).where(RecruiterJob.recruiter_id == user.id))).scalar_one()
    open_jobs = (await db.execute(select(func.count(RecruiterJob.id)).where(
        RecruiterJob.recruiter_id == user.id, RecruiterJob.status == "open"
    ))).scalar_one()
    applications = (await db.execute(
        select(func.count(RecruiterApplication.id))
        .join(RecruiterJob, RecruiterJob.id == RecruiterApplication.job_id)
        .where(RecruiterJob.recruiter_id == user.id)
    )).scalar_one()
    shortlisted = (await db.execute(select(func.count(RecruiterShortlist.id)).where(
        RecruiterShortlist.recruiter_id == user.id
    ))).scalar_one()
    candidates = (await db.execute(select(func.count(RecruiterVisibility.user_id)).where(
        RecruiterVisibility.profile_visible.is_(True)
    ))).scalar_one()
    return {"jobs": jobs, "open_jobs": open_jobs, "applications": applications,
            "shortlisted": shortlisted, "available_candidates": candidates}


@router.get("/recruiter/jobs")
async def recruiter_jobs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    rows = (await db.execute(select(RecruiterJob).where(
        RecruiterJob.recruiter_id == user.id
    ).order_by(RecruiterJob.created_at.desc()))).scalars().all()
    return [job_dict(job) for job in rows]


@router.post("/recruiter/jobs", status_code=201)
async def create_recruiter_job(req: JobCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    if req.graduation_year_min and req.graduation_year_max and req.graduation_year_min > req.graduation_year_max:
        raise HTTPException(status_code=422, detail="Minimum graduation year cannot exceed maximum graduation year.")
    job = RecruiterJob(
        recruiter_id=user.id, title=req.title.strip(), company=req.company.strip(),
        description=req.description.strip(), location=req.location.strip() if req.location else None,
        employment_type=req.employment_type,
        skills=list(dict.fromkeys(s.strip() for s in req.skills if s.strip())),
        graduation_year_min=req.graduation_year_min, graduation_year_max=req.graduation_year_max,
        deadline=req.deadline, status="open",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job_dict(job)


@router.patch("/recruiter/jobs/{job_id}")
async def update_recruiter_job(job_id: int, req: JobStatusUpdate, user: User = Depends(get_current_user),
                               db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    job = (await db.execute(select(RecruiterJob).where(
        RecruiterJob.id == job_id, RecruiterJob.recruiter_id == user.id
    ))).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job opening not found.")
    job.status = req.status
    await db.commit()
    return job_dict(job)


@router.get("/recruiter/shortlist")
async def get_recruiter_shortlist(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    rows = (await db.execute(
        select(RecruiterShortlist, User, UserProfile, StudentAcademicProfile, CodingProfile,
               RecruiterVisibility, RecruiterDisclosure)
        .join(User, User.id == RecruiterShortlist.student_id)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .outerjoin(StudentAcademicProfile, StudentAcademicProfile.student_id == User.id)
        .outerjoin(CodingProfile, CodingProfile.user_id == User.id)
        .outerjoin(RecruiterVisibility, RecruiterVisibility.user_id == User.id)
        .outerjoin(RecruiterDisclosure, RecruiterDisclosure.user_id == User.id)
        .where(RecruiterShortlist.recruiter_id == user.id, RecruiterVisibility.profile_visible.is_(True))
        .order_by(RecruiterShortlist.created_at.desc())
    )).all()
    return [{
        "student_id": student.id, "name": student.name,
        "email": student.email if visibility and visibility.contact_visible else None,
        "college": profile.college if profile else None,
        "branch": academic.branch if academic else (profile.department if profile else None),
        "passing_out_year": academic.passing_out_year if academic else None,
        "skills": profile.skills or [] if profile else [],
        "github_url": profile.github_url if profile else None,
        "linkedin_url": profile.linkedin_url if profile else None,
        "portfolio_url": profile.portfolio_url if profile else None,
        "resume_url": profile.resume_url if profile and disclosure and disclosure.resume_visible else None,
        "leetcode_username": coding.leetcode_username if coding else None,
        "total_problems_solved": coding.total_problems_solved if coding else 0,
        "note": saved.note,
    } for saved, student, profile, academic, coding, visibility, disclosure in rows]


@router.get("/recruiter/candidates/{student_id}")
async def recruiter_candidate_detail(student_id: int, user: User = Depends(get_current_user),
                                     db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    pair = (await db.execute(
        select(User, UserProfile, StudentAcademicProfile, CodingProfile, RecruiterVisibility, RecruiterDisclosure)
        .join(RecruiterVisibility, RecruiterVisibility.user_id == User.id)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .outerjoin(StudentAcademicProfile, StudentAcademicProfile.student_id == User.id)
        .outerjoin(CodingProfile, CodingProfile.user_id == User.id)
        .outerjoin(RecruiterDisclosure, RecruiterDisclosure.user_id == User.id)
        .where(User.id == student_id, User.role == "student", User.is_active.is_(True),
               RecruiterVisibility.profile_visible.is_(True))
    )).first()
    if pair is None:
        raise HTTPException(status_code=404, detail="This student has not shared their profile with recruiters.")
    student, profile, academic, coding, visibility, disclosure = pair

    documents = []
    if disclosure and disclosure.resume_visible:
        docs = (await db.execute(select(ResumeDocument).where(
            ResumeDocument.student_id == student.id
        ).order_by(ResumeDocument.created_at.desc()))).scalars().all()
        documents = [{"id": doc.id, "filename": doc.filename, "file_size": doc.file_size,
                      "created_at": doc.created_at.isoformat()} for doc in docs]

    academic_detail = None
    if disclosure and disclosure.academics_visible:
        grades = (await db.execute(select(Grade).where(
            Grade.user_id == student.id
        ).order_by(Grade.semester, Grade.subject))).scalars().all()
        assessments = (await db.execute(select(ClassMark, ClassSubject).join(
            ClassSubject, ClassSubject.id == ClassMark.subject_id
        ).where(ClassMark.student_id == student.id).order_by(
            ClassMark.updated_at.desc()
        ))).all()
        academic_detail = {
            "course": academic.course if academic else None,
            "branch": academic.branch if academic else None,
            "college": profile.college if profile else None,
            "admission_year": academic.admission_year if academic else None,
            "passing_out_year": academic.passing_out_year if academic else None,
            "current_year": academic.current_year if academic else None,
            "current_semester": academic.current_semester if academic else None,
            "cgpa": academic.cgpa if academic else None,
            "sgpa": academic.sgpa if academic else None,
            "semester_results": [{
                "semester": grade.semester, "subject": grade.subject,
                "credits": grade.credits, "grade": grade.grade, "grade_point": grade.grade_point,
            } for grade in grades],
            "class_assessments": [{
                "subject": subject.name, "assessment": mark.assessment,
                "marks_obtained": mark.marks_obtained, "max_marks": mark.max_marks,
                "remarks": mark.remarks,
            } for mark, subject in assessments],
        }

    return {
        "student_id": student.id,
        "name": student.name,
        "email": student.email if visibility.contact_visible else None,
        "phone": profile.phone if profile and disclosure and disclosure.phone_visible else None,
        "bio": profile.bio if profile else None,
        "college": profile.college if profile else None,
        "branch": academic.branch if academic else (profile.department if profile else None),
        "passing_out_year": academic.passing_out_year if academic else None,
        "skills": profile.skills or [] if profile else [],
        "interests": profile.interests or [] if profile else [],
        "achievements": profile.achievements or [] if profile else [],
        "github_url": profile.github_url if profile else None,
        "linkedin_url": profile.linkedin_url if profile else None,
        "portfolio_url": profile.portfolio_url if profile else None,
        "external_resume_url": profile.resume_url if profile and disclosure and disclosure.resume_visible else None,
        "leetcode_username": coding.leetcode_username if coding else None,
        "total_problems_solved": coding.total_problems_solved if coding else 0,
        "easy_solved": coding.easy_solved if coding else 0,
        "medium_solved": coding.medium_solved if coding else 0,
        "hard_solved": coding.hard_solved if coding else 0,
        "resume_visible": bool(disclosure and disclosure.resume_visible),
        "resume_documents": documents,
        "academic_records_visible": bool(disclosure and disclosure.academics_visible),
        "academic": academic_detail,
        "phone_visible": bool(disclosure and disclosure.phone_visible),
        "contact_visible": visibility.contact_visible,
    }


@router.get("/recruiter/candidates/{student_id}/resume")
async def download_shared_candidate_resume(student_id: int, user: User = Depends(get_current_user),
                                            db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    gate = (await db.execute(
        select(RecruiterVisibility, RecruiterDisclosure)
        .join(User, User.id == RecruiterVisibility.user_id)
        .outerjoin(RecruiterDisclosure, RecruiterDisclosure.user_id == RecruiterVisibility.user_id)
        .where(RecruiterVisibility.user_id == student_id, RecruiterVisibility.profile_visible.is_(True))
    )).first()
    if gate is None or gate[1] is None or not gate[1].resume_visible:
        raise HTTPException(status_code=404, detail="This student has not shared a resume.")
    document = (await db.execute(select(ResumeDocument).where(
        ResumeDocument.student_id == student_id
    ).order_by(ResumeDocument.created_at.desc()))).scalars().first()
    if document is None:
        raise HTTPException(status_code=404, detail="No resume document is available.")
    return StreamingResponse(
        io.BytesIO(document.file_data), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{document.filename}"',
                 "Content-Length": str(document.file_size)},
    )


@router.post("/recruiter/shortlist/{student_id}", status_code=201)
async def add_to_shortlist(student_id: int, req: ShortlistCreate, user: User = Depends(get_current_user),
                           db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    visibility = (await db.execute(select(RecruiterVisibility).where(
        RecruiterVisibility.user_id == student_id, RecruiterVisibility.profile_visible.is_(True)
    ))).scalar_one_or_none()
    if visibility is None:
        raise HTTPException(status_code=404, detail="This candidate has not shared their profile.")
    saved = (await db.execute(select(RecruiterShortlist).where(
        RecruiterShortlist.recruiter_id == user.id, RecruiterShortlist.student_id == student_id
    ))).scalar_one_or_none()
    if saved is None:
        saved = RecruiterShortlist(recruiter_id=user.id, student_id=student_id, note=req.note)
        db.add(saved)
    else:
        saved.note = req.note
    await db.commit()
    return {"message": "Candidate saved to shortlist."}


@router.delete("/recruiter/shortlist/{student_id}")
async def remove_from_shortlist(student_id: int, user: User = Depends(get_current_user),
                                db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    saved = (await db.execute(select(RecruiterShortlist).where(
        RecruiterShortlist.recruiter_id == user.id, RecruiterShortlist.student_id == student_id
    ))).scalar_one_or_none()
    if saved:
        await db.delete(saved)
        await db.commit()
    return {"message": "Candidate removed from shortlist."}


@router.get("/recruiter/applications")
async def recruiter_applications(job_id: int | None = None, user: User = Depends(get_current_user),
                                 db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    statement = (
        select(RecruiterApplication, RecruiterJob, User, RecruiterVisibility, ApplicationResumeSnapshot)
        .join(RecruiterJob, RecruiterJob.id == RecruiterApplication.job_id)
        .join(User, User.id == RecruiterApplication.student_id)
        .join(RecruiterVisibility, RecruiterVisibility.user_id == User.id)
        .outerjoin(ApplicationResumeSnapshot, ApplicationResumeSnapshot.application_id == RecruiterApplication.id)
        .where(RecruiterJob.recruiter_id == user.id, RecruiterVisibility.profile_visible.is_(True))
    )
    if job_id:
        statement = statement.where(RecruiterJob.id == job_id)
    rows = (await db.execute(statement.order_by(RecruiterApplication.created_at.desc()))).all()
    return [{
        "id": application.id, "job_id": job.id, "job_title": job.title, "company": job.company,
        "student_id": student.id, "student_name": student.name,
        "email": student.email if visibility and visibility.contact_visible and visibility.profile_visible else None,
        "status": application.status, "cover_note": application.cover_note,
        "recruiter_note": application.recruiter_note,
        "created_at": application.created_at.isoformat(),
        "resume_available": snapshot is not None,
        "resume_filename": snapshot.filename if snapshot else None,
    } for application, job, student, visibility, snapshot in rows]


@router.get("/recruiter/applications/{application_id}/resume")
async def download_application_resume(application_id: int, user: User = Depends(get_current_user),
                                      db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    row = (await db.execute(
        select(ApplicationResumeSnapshot, RecruiterVisibility)
        .join(RecruiterApplication, RecruiterApplication.id == ApplicationResumeSnapshot.application_id)
        .join(RecruiterJob, RecruiterJob.id == RecruiterApplication.job_id)
        .join(RecruiterVisibility, RecruiterVisibility.user_id == RecruiterApplication.student_id)
        .where(ApplicationResumeSnapshot.application_id == application_id,
               RecruiterJob.recruiter_id == user.id,
               RecruiterVisibility.profile_visible.is_(True))
    )).first()
    if row is None:
        raise HTTPException(status_code=404, detail="No resume is available for this application.")
    snapshot, _visibility = row
    return StreamingResponse(
        io.BytesIO(snapshot.file_data), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{snapshot.filename}"',
                 "Content-Length": str(snapshot.file_size)},
    )


@router.patch("/recruiter/applications/{application_id}")
async def update_application(application_id: int, req: ApplicationStatusUpdate,
                             user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "recruiter")
    application = (await db.execute(
        select(RecruiterApplication)
        .join(RecruiterJob, RecruiterJob.id == RecruiterApplication.job_id)
        .where(RecruiterApplication.id == application_id, RecruiterJob.recruiter_id == user.id)
    )).scalar_one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found.")
    application.status = req.status
    application.recruiter_note = req.recruiter_note
    application.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Application updated.", "status": application.status}


# Student-facing job applications

@router.get("/student/jobs")
async def list_open_jobs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    jobs = (await db.execute(select(RecruiterJob).where(
        RecruiterJob.status == "open",
        or_(RecruiterJob.deadline.is_(None), RecruiterJob.deadline >= date.today()),
    ).order_by(RecruiterJob.created_at.desc()))).scalars().all()
    applications = set((await db.execute(select(RecruiterApplication.job_id).where(
        RecruiterApplication.student_id == user.id
    ))).scalars().all())
    return [{**job_dict(job), "applied": job.id in applications} for job in jobs]


@router.post("/student/jobs/{job_id}/apply", status_code=201)
async def apply_to_job(job_id: int, req: ApplicationCreate, user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    visibility = (await db.execute(select(RecruiterVisibility).where(
        RecruiterVisibility.user_id == user.id, RecruiterVisibility.profile_visible.is_(True)
    ))).scalar_one_or_none()
    if visibility is None:
        raise HTTPException(status_code=403, detail="Enable recruiter profile sharing in Profile before applying.")
    job = (await db.execute(select(RecruiterJob).where(
        RecruiterJob.id == job_id, RecruiterJob.status == "open"
    ))).scalar_one_or_none()
    if job is None or (job.deadline and job.deadline < date.today()):
        raise HTTPException(status_code=404, detail="This job opening is no longer available.")
    academic = (await db.execute(select(StudentAcademicProfile).where(
        StudentAcademicProfile.student_id == user.id
    ))).scalar_one_or_none()
    if academic and academic.passing_out_year:
        if job.graduation_year_min and academic.passing_out_year < job.graduation_year_min:
            raise HTTPException(status_code=422, detail="Your graduation year does not meet this job's eligibility criteria.")
        if job.graduation_year_max and academic.passing_out_year > job.graduation_year_max:
            raise HTTPException(status_code=422, detail="Your graduation year does not meet this job's eligibility criteria.")
    existing = (await db.execute(select(RecruiterApplication).where(
        RecruiterApplication.job_id == job.id, RecruiterApplication.student_id == user.id
    ))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job.")
    document = (await db.execute(select(ResumeDocument).where(
        ResumeDocument.id == req.resume_document_id, ResumeDocument.student_id == user.id
    ))).scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=422, detail="Choose a resume from your library before applying.")

    application = RecruiterApplication(job_id=job.id, student_id=user.id, cover_note=req.cover_note)
    db.add(application)
    await db.flush()
    db.add(ApplicationResumeSnapshot(
        application_id=application.id, resume_document_id=document.id,
        filename=document.filename, content_type=document.content_type,
        file_size=document.file_size, file_data=document.file_data,
    ))
    await db.commit()
    return {"message": "Application submitted with resume.", "resume_filename": document.filename}


@router.get("/student/applications")
async def student_applications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    rows = (await db.execute(
        select(RecruiterApplication, RecruiterJob, ApplicationResumeSnapshot)
        .join(RecruiterJob, RecruiterJob.id == RecruiterApplication.job_id)
        .outerjoin(ApplicationResumeSnapshot, ApplicationResumeSnapshot.application_id == RecruiterApplication.id)
        .where(RecruiterApplication.student_id == user.id)
        .order_by(RecruiterApplication.created_at.desc())
    )).all()
    return [{
        "id": application.id, "job_id": job.id, "job_title": job.title, "company": job.company,
        "status": application.status, "recruiter_note": application.recruiter_note,
        "resume_filename": snapshot.filename if snapshot else None,
        "created_at": application.created_at.isoformat(),
    } for application, job, snapshot in rows]


# ---------------------------------------------------------------------------
# Mentor workspace
# ---------------------------------------------------------------------------

@router.get("/mentor/summary")
async def mentor_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    students = (await db.execute(select(func.count(MentorStudentAssignment.id)).where(
        MentorStudentAssignment.mentor_id == user.id
    ))).scalar_one()
    sessions = (await db.execute(select(func.count(MentorSession.id)).where(
        MentorSession.mentor_id == user.id, MentorSession.status == "scheduled"
    ))).scalar_one()
    goals = (await db.execute(select(func.count(MentorGoal.id)).where(
        MentorGoal.mentor_id == user.id, MentorGoal.status != "completed"
    ))).scalar_one()
    return {"assigned_students": students, "upcoming_sessions": sessions, "open_goals": goals}


@router.get("/mentor/sessions")
async def list_mentor_sessions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    rows = (await db.execute(
        select(MentorSession, User)
        .join(User, User.id == MentorSession.student_id)
        .where(MentorSession.mentor_id == user.id)
        .order_by(MentorSession.scheduled_at.desc())
    )).all()
    return [{
        "id": session.id, "student_id": student.id, "student_name": student.name,
        "scheduled_at": session.scheduled_at.isoformat(), "duration_minutes": session.duration_minutes,
        "meeting_link": session.meeting_link, "agenda": session.agenda, "status": session.status,
    } for session, student in rows]


@router.post("/mentor/sessions", status_code=201)
async def create_mentor_session(req: MentorSessionCreate, user: User = Depends(get_current_user),
                                db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    await assigned_student(user, req.student_id, db)
    session = MentorSession(
        mentor_id=user.id, student_id=req.student_id, scheduled_at=normalize_dt(req.scheduled_at),
        duration_minutes=req.duration_minutes, meeting_link=req.meeting_link, agenda=req.agenda,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"id": session.id, "message": "Mentoring session scheduled."}


@router.patch("/mentor/sessions/{session_id}")
async def update_mentor_session(session_id: int, req: MentorSessionUpdate,
                                user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    session = (await db.execute(select(MentorSession).where(
        MentorSession.id == session_id, MentorSession.mentor_id == user.id
    ))).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Mentoring session not found.")
    session.status = req.status
    await db.commit()
    return {"message": "Session updated."}


@router.get("/mentor/goals")
async def list_mentor_goals(student_id: int | None = None, user: User = Depends(get_current_user),
                            db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    statement = select(MentorGoal, User).join(User, User.id == MentorGoal.student_id).where(
        MentorGoal.mentor_id == user.id
    )
    if student_id:
        await assigned_student(user, student_id, db)
        statement = statement.where(MentorGoal.student_id == student_id)
    rows = (await db.execute(statement.order_by(MentorGoal.due_date.asc(), MentorGoal.created_at.desc()))).all()
    return [{
        "id": goal.id, "student_id": student.id, "student_name": student.name,
        "title": goal.title, "description": goal.description,
        "due_date": goal.due_date.isoformat() if goal.due_date else None, "status": goal.status,
    } for goal, student in rows]


@router.post("/mentor/goals", status_code=201)
async def create_mentor_goal(req: MentorGoalCreate, user: User = Depends(get_current_user),
                             db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    await assigned_student(user, req.student_id, db)
    goal = MentorGoal(mentor_id=user.id, student_id=req.student_id, title=req.title.strip(),
                      description=req.description, due_date=req.due_date)
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return {"id": goal.id, "message": "Goal created."}


@router.patch("/mentor/goals/{goal_id}")
async def update_mentor_goal(goal_id: int, req: MentorGoalUpdate,
                             user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    goal = (await db.execute(select(MentorGoal).where(
        MentorGoal.id == goal_id, MentorGoal.mentor_id == user.id
    ))).scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found.")
    goal.status = req.status
    await db.commit()
    return {"message": "Goal updated."}


@router.get("/mentor/notes")
async def list_mentor_notes(student_id: int | None = None, user: User = Depends(get_current_user),
                            db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    statement = select(MentorNote, User).join(User, User.id == MentorNote.student_id).where(
        MentorNote.mentor_id == user.id
    )
    if student_id:
        await assigned_student(user, student_id, db)
        statement = statement.where(MentorNote.student_id == student_id)
    rows = (await db.execute(statement.order_by(MentorNote.updated_at.desc()))).all()
    return [{
        "id": note.id, "student_id": student.id, "student_name": student.name,
        "body": note.body, "updated_at": note.updated_at.isoformat(),
    } for note, student in rows]


@router.post("/mentor/notes", status_code=201)
async def create_mentor_note(req: MentorNoteCreate, user: User = Depends(get_current_user),
                             db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    await assigned_student(user, req.student_id, db)
    note = MentorNote(mentor_id=user.id, student_id=req.student_id, body=req.body.strip())
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return {"id": note.id, "message": "Private mentor note saved."}


# ---------------------------------------------------------------------------
# Faculty and admin teaching workspace
# ---------------------------------------------------------------------------

@router.get("/faculty/summary")
async def faculty_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    subject_stmt = select(ClassSubject)
    if user.role != "admin":
        subject_stmt = subject_stmt.where(ClassSubject.faculty_user_id == user.id)
    subjects = (await db.execute(subject_stmt.order_by(ClassSubject.section, ClassSubject.name))).scalars().all()
    sections = sorted({subject.section for subject in subjects})
    student_count = 0
    if sections:
        student_count = (await db.execute(select(func.count(func.distinct(StudentIdentity.user_id))).where(
            StudentIdentity.section.in_(sections)
        ))).scalar_one()
    subject_ids = [subject.id for subject in subjects]
    assignment_count = 0
    if subject_ids:
        assignment_count = (await db.execute(select(func.count(ClassAssignment.id)).where(
            ClassAssignment.subject_id.in_(subject_ids)
        ))).scalar_one()
    return {
        "classes": len(subjects), "sections": len(sections), "students": student_count,
        "assignments": assignment_count,
        "subjects": [{"id": s.id, "name": s.name, "code": s.code, "section": s.section} for s in subjects],
    }


@router.get("/faculty/assignments")
async def faculty_assignments(subject_id: int | None = None, user: User = Depends(get_current_user),
                              db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    subject_stmt = select(ClassSubject)
    if user.role != "admin":
        subject_stmt = subject_stmt.where(ClassSubject.faculty_user_id == user.id)
    if subject_id:
        subject_stmt = subject_stmt.where(ClassSubject.id == subject_id)
    subjects = (await db.execute(subject_stmt)).scalars().all()
    ids = [s.id for s in subjects]
    if not ids:
        return []
    rows = (await db.execute(select(ClassAssignment, ClassSubject).join(
        ClassSubject, ClassSubject.id == ClassAssignment.subject_id
    ).where(ClassAssignment.subject_id.in_(ids)).order_by(ClassAssignment.due_at.asc()))).all()
    return [{
        "id": a.id, "subject_id": subject.id, "subject": subject.name, "section": subject.section,
        "title": a.title, "instructions": a.instructions, "attachment_url": a.attachment_url,
        "points": a.points, "due_at": a.due_at.isoformat() if a.due_at else None,
        "created_at": a.created_at.isoformat(),
    } for a, subject in rows]


@router.post("/faculty/assignments", status_code=201)
async def create_faculty_assignment(req: AssignmentCreate, user: User = Depends(get_current_user),
                                    db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    await get_subject(req.subject_id, user, db)
    assignment = ClassAssignment(
        subject_id=req.subject_id, title=req.title.strip(), instructions=req.instructions.strip(),
        attachment_url=req.attachment_url, points=req.points, due_at=normalize_dt(req.due_at),
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return {"id": assignment.id, "message": "Assignment published."}


@router.get("/faculty/assignments/{assignment_id}/submissions")
async def faculty_assignment_submissions(assignment_id: int, user: User = Depends(get_current_user),
                                         db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    pair = (await db.execute(
        select(ClassAssignment, ClassSubject)
        .join(ClassSubject, ClassSubject.id == ClassAssignment.subject_id)
        .where(ClassAssignment.id == assignment_id)
    )).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    assignment, subject = pair
    if user.role != "admin" and subject.faculty_user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only review submissions for your own classes.")
    rows = (await db.execute(
        select(AssignmentSubmission, User, StudentIdentity)
        .join(User, User.id == AssignmentSubmission.student_id)
        .outerjoin(StudentIdentity, StudentIdentity.user_id == User.id)
        .where(AssignmentSubmission.assignment_id == assignment_id)
        .order_by(AssignmentSubmission.submitted_at.desc())
    )).all()
    return [{
        "id": submission.id, "student_id": student.id, "student_name": student.name,
        "registration_number": identity.registration_number if identity else None,
        "submission_text": submission.submission_text, "attachment_url": submission.attachment_url,
        "submitted_at": submission.submitted_at.isoformat(), "marks_awarded": submission.marks_awarded,
        "feedback": submission.feedback,
    } for submission, student, identity in rows]


@router.post("/faculty/submissions/{submission_id}/grade")
async def grade_faculty_submission(submission_id: int, req: GradeCreate,
                                   user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    pair = (await db.execute(
        select(AssignmentSubmission, ClassAssignment, ClassSubject)
        .join(ClassAssignment, ClassAssignment.id == AssignmentSubmission.assignment_id)
        .join(ClassSubject, ClassSubject.id == ClassAssignment.subject_id)
        .where(AssignmentSubmission.id == submission_id)
    )).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Submission not found.")
    submission, assignment, subject = pair
    if user.role != "admin" and subject.faculty_user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only grade your own classes.")
    if req.marks_awarded > assignment.points:
        raise HTTPException(status_code=422, detail="Marks cannot exceed the assignment total.")
    submission.marks_awarded = req.marks_awarded
    submission.feedback = req.feedback
    submission.graded_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Submission graded."}


@router.get("/faculty/marks")
async def faculty_marks(subject_id: int | None = None, user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    subject_stmt = select(ClassSubject)
    if user.role != "admin":
        subject_stmt = subject_stmt.where(ClassSubject.faculty_user_id == user.id)
    if subject_id:
        subject_stmt = subject_stmt.where(ClassSubject.id == subject_id)
    ids = [s.id for s in (await db.execute(subject_stmt)).scalars().all()]
    if not ids:
        return []
    rows = (await db.execute(select(ClassMark, User, ClassSubject)
        .join(User, User.id == ClassMark.student_id)
        .join(ClassSubject, ClassSubject.id == ClassMark.subject_id)
        .where(ClassMark.subject_id.in_(ids))
        .order_by(ClassSubject.section, User.name, ClassMark.assessment))).all()
    return [{
        "id": mark.id, "subject_id": subject.id, "subject": subject.name, "section": subject.section,
        "student_id": student.id, "student_name": student.name,
        "assessment": mark.assessment, "marks_obtained": mark.marks_obtained,
        "max_marks": mark.max_marks, "remarks": mark.remarks,
    } for mark, student, subject in rows]


@router.post("/faculty/marks", status_code=201)
async def upsert_faculty_mark(req: MarkCreate, user: User = Depends(get_current_user),
                              db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    subject = await get_subject(req.subject_id, user, db)
    if req.marks_obtained > req.max_marks:
        raise HTTPException(status_code=422, detail="Obtained marks cannot exceed maximum marks.")
    if not await student_in_section(req.student_id, subject.section, db):
        raise HTTPException(status_code=422, detail="Student does not belong to this class section.")
    result = await db.execute(select(ClassMark).where(
        ClassMark.subject_id == req.subject_id, ClassMark.student_id == req.student_id,
        ClassMark.assessment == req.assessment.strip(),
    ))
    mark = result.scalar_one_or_none()
    if mark is None:
        mark = ClassMark(subject_id=req.subject_id, student_id=req.student_id,
            assessment=req.assessment.strip(), marks_obtained=req.marks_obtained,
            max_marks=req.max_marks, remarks=req.remarks, updated_by=user.id)
        db.add(mark)
    else:
        mark.marks_obtained, mark.max_marks = req.marks_obtained, req.max_marks
        mark.remarks, mark.updated_by = req.remarks, user.id
    await db.commit()
    return {"message": "Marks saved."}


@router.get("/faculty/resources")
async def faculty_resources(subject_id: int | None = None, user: User = Depends(get_current_user),
                             db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    subject_stmt = select(ClassSubject)
    if user.role != "admin":
        subject_stmt = subject_stmt.where(ClassSubject.faculty_user_id == user.id)
    if subject_id:
        subject_stmt = subject_stmt.where(ClassSubject.id == subject_id)
    ids = [s.id for s in (await db.execute(subject_stmt)).scalars().all()]
    if not ids:
        return []
    rows = (await db.execute(select(LearningResource, ClassSubject).join(
        ClassSubject, ClassSubject.id == LearningResource.subject_id
    ).where(LearningResource.subject_id.in_(ids)).order_by(LearningResource.created_at.desc()))).all()
    return [{
        "id": r.id, "subject_id": subject.id, "subject": subject.name, "section": subject.section,
        "title": r.title, "description": r.description, "resource_url": r.resource_url,
    } for r, subject in rows]


@router.post("/faculty/resources", status_code=201)
async def create_learning_resource(req: ResourceCreate, user: User = Depends(get_current_user),
                                   db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    await get_subject(req.subject_id, user, db)
    resource = LearningResource(subject_id=req.subject_id, title=req.title.strip(),
                                 description=req.description, resource_url=req.resource_url.strip())
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return {"id": resource.id, "message": "Learning resource published."}


@router.get("/faculty/timetable")
async def faculty_timetable(subject_id: int | None = None, user: User = Depends(get_current_user),
                            db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    subject_stmt = select(ClassSubject)
    if user.role != "admin":
        subject_stmt = subject_stmt.where(ClassSubject.faculty_user_id == user.id)
    if subject_id:
        subject_stmt = subject_stmt.where(ClassSubject.id == subject_id)
    ids = [s.id for s in (await db.execute(subject_stmt)).scalars().all()]
    if not ids:
        return []
    rows = (await db.execute(select(TimetableEntry, ClassSubject).join(
        ClassSubject, ClassSubject.id == TimetableEntry.subject_id
    ).where(TimetableEntry.subject_id.in_(ids)).order_by(
        TimetableEntry.weekday, TimetableEntry.starts_at
    ))).all()
    return [{
        "id": entry.id, "subject_id": subject.id, "subject": subject.name, "section": subject.section,
        "weekday": entry.weekday, "starts_at": entry.starts_at, "ends_at": entry.ends_at, "room": entry.room,
    } for entry, subject in rows]


@router.post("/faculty/timetable", status_code=201)
async def create_timetable_entry(req: TimetableCreate, user: User = Depends(get_current_user),
                                 db: AsyncSession = Depends(get_db)):
    require_role(user, "faculty", "admin")
    await get_subject(req.subject_id, user, db)
    if req.starts_at >= req.ends_at:
        raise HTTPException(status_code=422, detail="End time must be after start time.")
    entry = TimetableEntry(**req.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id, "message": "Timetable entry saved."}


# Student view of published teaching material and their own results/submissions.

@router.get("/student/classroom")
async def student_classroom(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    identity = (await db.execute(select(StudentIdentity).where(
        StudentIdentity.user_id == user.id
    ))).scalar_one_or_none()
    if identity is None:
        return {"registration_required": True, "assignments": [], "marks": [], "resources": [], "timetable": []}
    subjects = (await db.execute(select(ClassSubject).where(ClassSubject.section == identity.section))).scalars().all()
    ids = [subject.id for subject in subjects]
    if not ids:
        return {"registration_required": False, "assignments": [], "marks": [], "resources": [], "timetable": []}
    assignments = (await db.execute(select(ClassAssignment, ClassSubject).join(
        ClassSubject, ClassSubject.id == ClassAssignment.subject_id
    ).where(ClassAssignment.subject_id.in_(ids)).order_by(ClassAssignment.due_at.asc()))).all()
    my_submissions = {row.assignment_id: row for row in (await db.execute(select(AssignmentSubmission).where(
        AssignmentSubmission.student_id == user.id
    ))).scalars().all()}
    marks = (await db.execute(select(ClassMark, ClassSubject).join(
        ClassSubject, ClassSubject.id == ClassMark.subject_id
    ).where(ClassMark.subject_id.in_(ids), ClassMark.student_id == user.id))).all()
    resources = (await db.execute(select(LearningResource, ClassSubject).join(
        ClassSubject, ClassSubject.id == LearningResource.subject_id
    ).where(LearningResource.subject_id.in_(ids)).order_by(LearningResource.created_at.desc()))).all()
    timetable = (await db.execute(select(TimetableEntry, ClassSubject).join(
        ClassSubject, ClassSubject.id == TimetableEntry.subject_id
    ).where(TimetableEntry.subject_id.in_(ids)).order_by(TimetableEntry.weekday, TimetableEntry.starts_at))).all()
    return {
        "registration_required": False,
        "assignments": [{
            "id": a.id, "subject": s.name, "section": s.section, "title": a.title,
            "instructions": a.instructions, "attachment_url": a.attachment_url, "points": a.points,
            "due_at": a.due_at.isoformat() if a.due_at else None,
            "submission": ({
                "submitted_at": my_submissions[a.id].submitted_at.isoformat(),
                "marks_awarded": my_submissions[a.id].marks_awarded,
                "feedback": my_submissions[a.id].feedback,
            } if a.id in my_submissions else None),
        } for a, s in assignments],
        "marks": [{
            "subject": s.name, "assessment": m.assessment, "marks_obtained": m.marks_obtained,
            "max_marks": m.max_marks, "remarks": m.remarks,
        } for m, s in marks],
        "resources": [{
            "subject": s.name, "title": r.title, "description": r.description, "resource_url": r.resource_url,
        } for r, s in resources],
        "timetable": [{
            "subject": s.name, "weekday": t.weekday, "starts_at": t.starts_at,
            "ends_at": t.ends_at, "room": t.room,
        } for t, s in timetable],
    }


@router.post("/student/classroom/assignments/{assignment_id}/submit", status_code=201)
async def submit_class_assignment(assignment_id: int, req: SubmissionCreate,
                                 user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    identity = (await db.execute(select(StudentIdentity).where(
        StudentIdentity.user_id == user.id
    ))).scalar_one_or_none()
    if identity is None:
        raise HTTPException(status_code=422, detail="Complete your student registration details first.")
    pair = (await db.execute(select(ClassAssignment, ClassSubject).join(
        ClassSubject, ClassSubject.id == ClassAssignment.subject_id
    ).where(ClassAssignment.id == assignment_id))).first()
    if not pair or pair[1].section != identity.section:
        raise HTTPException(status_code=404, detail="Assignment not found for your section.")
    assignment = pair[0]
    if assignment.due_at and normalize_dt(assignment.due_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="The submission deadline has passed.")
    if not req.submission_text and not req.attachment_url:
        raise HTTPException(status_code=422, detail="Add submission text or an attachment link.")
    existing = (await db.execute(select(AssignmentSubmission).where(
        AssignmentSubmission.assignment_id == assignment_id, AssignmentSubmission.student_id == user.id
    ))).scalar_one_or_none()
    if existing:
        existing.submission_text, existing.attachment_url = req.submission_text, req.attachment_url
        existing.submitted_at = datetime.now(timezone.utc)
        existing.marks_awarded, existing.feedback, existing.graded_at = None, None, None
    else:
        db.add(AssignmentSubmission(assignment_id=assignment_id, student_id=user.id,
            submission_text=req.submission_text, attachment_url=req.attachment_url))
    await db.commit()
    return {"message": "Assignment submitted."}


# ---------------------------------------------------------------------------
# Admin workspace
# ---------------------------------------------------------------------------

@router.get("/admin/summary")
async def admin_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "admin")
    counts = {}
    for role in ("student", "faculty", "mentor", "recruiter"):
        counts[role] = (await db.execute(select(func.count(User.id)).where(
            User.role == role, User.is_active.is_(True)
        ))).scalar_one()
    counts["classes"] = (await db.execute(select(func.count(ClassSubject.id)))).scalar_one()
    counts["mentor_assignments"] = (await db.execute(select(func.count(MentorStudentAssignment.id)))).scalar_one()
    return counts


@router.get("/admin/staff")
async def admin_staff(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "admin")
    rows = (await db.execute(select(User).where(
        User.role.in_(["faculty", "mentor", "recruiter"])
    ).order_by(User.role, User.name))).scalars().all()
    return [{"id": staff.id, "name": staff.name, "email": staff.email, "role": staff.role,
             "active": staff.is_active} for staff in rows]


@router.patch("/admin/staff/{staff_id}")
async def update_admin_staff(staff_id: int, req: AdminStaffUpdate,
                             user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "admin")
    if req.role is None and req.is_active is None:
        raise HTTPException(status_code=422, detail="Provide a role or account status change.")
    target = (await db.execute(select(User).where(
        User.id == staff_id,
        User.role.in_(["faculty", "mentor", "recruiter"]),
    ))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Staff account not found.")
    if req.role is not None:
        target.role = req.role
    if req.is_active is not None:
        target.is_active = req.is_active
    await db.commit()
    return {"id": target.id, "name": target.name, "email": target.email,
            "role": target.role, "active": target.is_active}


@router.post("/admin/classes", status_code=201)
async def admin_assign_class(req: AdminClassAssign, user: User = Depends(get_current_user),
                             db: AsyncSession = Depends(get_db)):
    require_role(user, "admin")
    faculty = (await db.execute(select(User).where(
        User.email == req.faculty_email.strip().lower(), User.role == "faculty"
    ))).scalar_one_or_none()
    if faculty is None:
        raise HTTPException(status_code=404, detail="Faculty account not found. Grant faculty access first.")
    subject = ClassSubject(
        faculty_user_id=faculty.id, name=req.name.strip(),
        code=req.code.strip().upper() if req.code else None, section=req.section.strip().upper(),
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return {"id": subject.id, "faculty": faculty.name, "name": subject.name, "section": subject.section}


@router.get("/admin/mentor-assignments")
async def admin_mentor_assignments(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "admin")
    mentor_user = aliased(User)
    student_user = aliased(User)
    rows = (await db.execute(
        select(MentorStudentAssignment, mentor_user, student_user)
        .join(mentor_user, mentor_user.id == MentorStudentAssignment.mentor_id)
        .join(student_user, student_user.id == MentorStudentAssignment.student_id)
    )).all()
    return [{
        "id": assignment.id, "mentor_id": mentor.id, "mentor_name": mentor.name,
        "student_id": student.id, "student_name": student.name,
    } for assignment, mentor, student in rows]


@router.delete("/admin/mentor-assignments/{assignment_id}")
async def delete_mentor_assignment(assignment_id: int, user: User = Depends(get_current_user),
                                   db: AsyncSession = Depends(get_db)):
    require_role(user, "admin")
    assignment = (await db.execute(select(MentorStudentAssignment).where(
        MentorStudentAssignment.id == assignment_id
    ))).scalar_one_or_none()
    if assignment:
        await db.delete(assignment)
        await db.commit()
    return {"message": "Mentor assignment removed."}

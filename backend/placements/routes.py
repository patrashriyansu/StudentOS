from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.placements.models import Resume, ResumeDocument, Application, Interview, Offer, ResumeBuilderVersion
from backend.notifications.service import INDIA_TZ, schedule_email_reminder, to_utc_datetime
from pydantic import BaseModel, Field
from typing import Optional
import json
import hashlib
import io
import os
import re

router = APIRouter()

# --- Resume ---
MAX_RESUME_SIZE = 5 * 1024 * 1024


def safe_resume_filename(filename: str | None) -> str:
    raw = os.path.basename((filename or "resume.pdf").replace("\\\\", "/"))
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "", raw).strip(" .")
    if not cleaned:
        cleaned = "resume.pdf"
    if not cleaned.lower().endswith(".pdf"):
        cleaned += ".pdf"
    return cleaned[:255]


async def store_resume_document(file: UploadFile, student_id: int, db: AsyncSession) -> ResumeDocument:
    content = await file.read(MAX_RESUME_SIZE + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded resume is empty.")
    if len(content) > MAX_RESUME_SIZE:
        raise HTTPException(status_code=413, detail="Resume files must be 5 MB or smaller.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="Upload a valid PDF resume.")
    if file.filename and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Resume files must use the .pdf extension.")
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Upload a PDF resume.")
    document = ResumeDocument(
        student_id=student_id,
        filename=safe_resume_filename(file.filename),
        content_type="application/pdf",
        file_size=len(content),
        sha256=hashlib.sha256(content).hexdigest(),
        file_data=content,
    )
    db.add(document)
    await db.flush()
    return document


def resume_document_dict(document: ResumeDocument) -> dict:
    return {
        "id": document.id,
        "filename": document.filename,
        "content_type": document.content_type,
        "file_size": document.file_size,
        "created_at": document.created_at.isoformat(),
    }


@router.post("/resume/upload", status_code=201)
async def upload_resume(file: UploadFile = File(...), current_user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can upload their own resumes.")
    document = await store_resume_document(file, current_user.id, db)
    await db.commit()
    await db.refresh(document)
    return {"id": document.id, "resume_document_id": document.id, "message": "Resume uploaded securely.",
            "filename": document.filename, "file_size": document.file_size}


@router.get("/resume/documents")
async def list_resume_documents(current_user: User = Depends(get_current_user),
                                db: AsyncSession = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required.")
    result = await db.execute(select(ResumeDocument).where(
        ResumeDocument.student_id == current_user.id
    ).order_by(ResumeDocument.created_at.desc()))
    return [resume_document_dict(document) for document in result.scalars().all()]


@router.get("/resume/documents/{document_id}/download")
async def download_resume_document(document_id: int, current_user: User = Depends(get_current_user),
                                   db: AsyncSession = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required.")
    document = (await db.execute(select(ResumeDocument).where(
        ResumeDocument.id == document_id, ResumeDocument.student_id == current_user.id
    ))).scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Resume document not found.")
    return StreamingResponse(
        io.BytesIO(document.file_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{document.filename}"',
                 "Content-Length": str(document.file_size)},
    )


@router.delete("/resume/documents/{document_id}")
async def delete_resume_document(document_id: int, current_user: User = Depends(get_current_user),
                                 db: AsyncSession = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required.")
    document = (await db.execute(select(ResumeDocument).where(
        ResumeDocument.id == document_id, ResumeDocument.student_id == current_user.id
    ))).scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Resume document not found.")
    await db.delete(document)
    await db.commit()
    return {"message": "Resume removed from your library. Submitted application copies remain available to their recruiter."}

@router.get("/resumes")
async def get_resumes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()))
    resumes = result.scalars().all()
    return [{"id": r.id, "version": r.version, "ats_score": r.ats_score, "skills_extracted": r.skills_extracted, "missing_skills": r.missing_skills, "suggestions": r.suggestions, "created_at": r.created_at.isoformat()} for r in resumes]

# --- Applications ---
class ApplicationCreate(BaseModel):
    company: str; role: str; deadline: Optional[str] = None; salary: Optional[str] = None; notes: Optional[str] = ""

@router.get("/applications")
async def get_applications(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Application).where(Application.user_id == current_user.id).order_by(Application.application_date.desc()))
    apps = result.scalars().all()
    return [{"id": a.id, "company": a.company, "role": a.role, "status": a.status, "application_date": a.application_date.isoformat(), "deadline": a.deadline.isoformat() if a.deadline else None, "salary": a.salary, "notes": a.notes, "round": a.round} for a in apps]

@router.post("/applications")
async def create_application(req: ApplicationCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    app = Application(user_id=current_user.id, company=req.company, role=req.role, salary=req.salary, notes=req.notes)
    deadline_at = to_utc_datetime(req.deadline) if req.deadline else None
    if deadline_at:
        app.deadline = deadline_at
    db.add(app)
    await db.flush()
    if deadline_at and deadline_at > datetime.now(timezone.utc):
        await schedule_email_reminder(
            db,
            user_id=current_user.id,
            title=f"Application deadline: {req.company}",
            message=f"Your {req.role} application at {req.company} has a deadline on {deadline_at.astimezone(INDIA_TZ).strftime('%d %b %Y at %I:%M %p')}.",
            remind_at=deadline_at - timedelta(days=1),
            entity_type="application",
            entity_id=app.id,
        )
    await db.commit()
    await db.refresh(app)
    return {"id": app.id, "message": "Application added", "email_reminder": "scheduled when a future deadline is supplied"}

@router.put("/applications/{app_id}/status")
async def update_application_status(app_id: int, status: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Application).where(Application.id == app_id, Application.user_id == current_user.id))
    app = result.scalar_one_or_none()
    if not app: raise HTTPException(status_code=404)
    app.status = status; app.round = (app.round or 0) + 1
    await db.commit(); return {"message": "Status updated"}

# --- Interviews ---
class InterviewCreate(BaseModel):
    company: str; role: str; interview_type: str; scheduled_at: str

@router.get("/interviews")
async def get_interviews(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Interview).where(Interview.user_id == current_user.id).order_by(Interview.scheduled_at))
    interviews = result.scalars().all()
    return [{"id": i.id, "company": i.company, "role": i.role, "interview_type": i.interview_type, "scheduled_at": i.scheduled_at.isoformat(), "feedback": i.feedback, "rating": i.rating, "confidence_score": i.confidence_score, "completed": i.completed} for i in interviews]

@router.post("/interviews")
async def create_interview(req: InterviewCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    scheduled_at = to_utc_datetime(req.scheduled_at)
    interview = Interview(user_id=current_user.id, company=req.company, role=req.role, interview_type=req.interview_type, scheduled_at=scheduled_at)
    db.add(interview)
    await db.flush()
    if scheduled_at > datetime.now(timezone.utc):
        await schedule_email_reminder(
            db,
            user_id=current_user.id,
            title=f"Interview reminder: {req.company}",
            message=f"Your {req.interview_type} interview for {req.role} at {req.company} is scheduled for {scheduled_at.astimezone(INDIA_TZ).strftime('%d %b %Y at %I:%M %p')}.",
            remind_at=scheduled_at - timedelta(days=1),
            entity_type="interview",
            entity_id=interview.id,
        )
    await db.commit()
    await db.refresh(interview)
    return {"id": interview.id, "message": "Interview scheduled", "email_reminder": "scheduled when the interview is in the future"}

# --- Offers ---


class OfferCreate(BaseModel):
    company: str
    role: str
    ctc: Optional[str] = ""
    location: Optional[str] = ""
    joining_date: Optional[str] = None
    status: Optional[str] = "pending"


@router.post("/offers")
async def create_offer(req: OfferCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    joining_at = to_utc_datetime(req.joining_date) if req.joining_date else None
    offer = Offer(
        user_id=current_user.id,
        company=req.company,
        role=req.role,
        ctc=req.ctc,
        location=req.location,
        joining_date=joining_at,
        status=req.status or "pending",
    )
    db.add(offer)
    await db.flush()
    if joining_at and joining_at > datetime.now(timezone.utc):
        await schedule_email_reminder(
            db,
            user_id=current_user.id,
            title=f"Joining reminder: {req.company}",
            message=f"Your joining date for {req.role} at {req.company} is {joining_at.astimezone(INDIA_TZ).strftime('%d %b %Y at %I:%M %p')}.",
            remind_at=joining_at - timedelta(days=1),
            entity_type="offer",
            entity_id=offer.id,
        )
    await db.commit()
    await db.refresh(offer)
    return {"id": offer.id, "message": "Offer saved", "email_reminder": "scheduled when a future joining date is supplied"}


@router.get("/offers")
async def get_offers(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Offer).where(Offer.user_id == current_user.id))
    offers = result.scalars().all()
    return [{"id": o.id, "company": o.company, "role": o.role, "ctc": o.ctc, "location": o.location, "joining_date": o.joining_date.isoformat() if o.joining_date else None, "status": o.status} for o in offers]

# --- Analytics ---
@router.get("/analytics")
async def get_placement_analytics(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    apps = await db.execute(select(Application).where(Application.user_id == current_user.id))
    applications = apps.scalars().all()
    status_count = {}
    for a in applications:
        status_count[a.status] = status_count.get(a.status, 0) + 1
    return {"total_applications": len(applications), "status_breakdown": status_count, "applications_by_status": status_count}



class ResumeEducationEntry(BaseModel):
    degree: str = Field(min_length=1, max_length=160)
    institution: str = Field(min_length=1, max_length=180)
    location: str = Field(default="", max_length=120)
    start_year: str = Field(default="", max_length=20)
    end_year: str = Field(default="", max_length=20)
    details: str = Field(default="", max_length=1600)


class ResumeExperienceEntry(BaseModel):
    role: str = Field(min_length=1, max_length=160)
    company: str = Field(min_length=1, max_length=180)
    location: str = Field(default="", max_length=120)
    start_date: str = Field(default="", max_length=30)
    end_date: str = Field(default="", max_length=30)
    details: str = Field(default="", max_length=2400)


class ResumeProjectEntry(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    technologies: list[str] = Field(default_factory=list, max_length=20)
    link: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=2000)


class ResumeBuilderContent(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    headline: str = Field(default="", max_length=180)
    email: str = Field(default="", max_length=254)
    phone: str = Field(default="", max_length=40)
    location: str = Field(default="", max_length=120)
    summary: str = Field(default="", max_length=3000)
    education: list[ResumeEducationEntry] = Field(default_factory=list, max_length=8)
    experience: list[ResumeExperienceEntry] = Field(default_factory=list, max_length=12)
    projects: list[ResumeProjectEntry] = Field(default_factory=list, max_length=12)
    skills: list[str] = Field(default_factory=list, max_length=60)
    certifications: list[str] = Field(default_factory=list, max_length=30)
    achievements: list[str] = Field(default_factory=list, max_length=30)


class ResumeBuilderVersionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    content: ResumeBuilderContent


class InterviewUpdate(BaseModel):
    feedback: str | None = Field(default=None, max_length=5000)
    rating: float | None = Field(default=None, ge=1, le=5)
    confidence_score: float | None = Field(default=None, ge=1, le=5)
    completed: bool | None = None


def _resume_builder_dict(item: ResumeBuilderVersion) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "version_number": item.version_number,
        "content": item.content,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


@router.get("/resume-versions")
async def list_resume_builder_versions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ResumeBuilderVersion)
        .where(ResumeBuilderVersion.user_id == current_user.id)
        .order_by(ResumeBuilderVersion.version_number.desc())
    )
    return [_resume_builder_dict(item) for item in result.scalars().all()]


@router.post("/resume-versions", status_code=201)
async def create_resume_builder_version(
    req: ResumeBuilderVersionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can create career resumes.")
    count = (await db.execute(
        select(func.count(ResumeBuilderVersion.id)).where(ResumeBuilderVersion.user_id == current_user.id)
    )).scalar_one()
    if count >= 20:
        raise HTTPException(status_code=409, detail="You can keep up to 20 resume versions. Delete an older version first.")
    latest = (await db.execute(
        select(func.max(ResumeBuilderVersion.version_number)).where(ResumeBuilderVersion.user_id == current_user.id)
    )).scalar_one()
    item = ResumeBuilderVersion(
        user_id=current_user.id,
        title=req.title.strip(),
        version_number=(latest or 0) + 1,
        content=req.content.model_dump(),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _resume_builder_dict(item)


@router.put("/resume-versions/{version_id}")
async def update_resume_builder_version(
    version_id: int,
    req: ResumeBuilderVersionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(select(ResumeBuilderVersion).where(
        ResumeBuilderVersion.id == version_id,
        ResumeBuilderVersion.user_id == current_user.id,
    ))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Resume version not found.")
    item.title = req.title.strip()
    item.content = req.content.model_dump()
    item.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return _resume_builder_dict(item)


@router.delete("/resume-versions/{version_id}")
async def delete_resume_builder_version(
    version_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(select(ResumeBuilderVersion).where(
        ResumeBuilderVersion.id == version_id,
        ResumeBuilderVersion.user_id == current_user.id,
    ))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Resume version not found.")
    await db.delete(item)
    await db.commit()
    return {"message": "Resume version deleted."}


@router.patch("/interviews/{interview_id}")
async def update_interview_feedback(
    interview_id: int,
    req: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = (await db.execute(select(Interview).where(
        Interview.id == interview_id,
        Interview.user_id == current_user.id,
    ))).scalar_one_or_none()
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found.")
    values = req.model_dump(exclude_unset=True)
    for field, value in values.items():
        setattr(interview, field, value)
    await db.commit()
    await db.refresh(interview)
    return {
        "id": interview.id,
        "completed": interview.completed,
        "feedback": interview.feedback,
        "rating": interview.rating,
        "confidence_score": interview.confidence_score,
    }

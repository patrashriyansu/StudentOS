from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.placements.models import Resume, Application, Interview, Offer
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter()

# --- Resume ---
@router.post("/resume/upload")
async def upload_resume(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    import base64
    b64 = base64.b64encode(content).decode()
    file_url = f"data:{file.content_type};base64,{b64[-100:]}"
    resume = Resume(user_id=current_user.id, file_url=file_url, version=1)
    db.add(resume); await db.commit(); await db.refresh(resume)
    return {"id": resume.id, "message": "Resume uploaded", "file_url": file_url}

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
    if req.deadline: app.deadline = datetime.fromisoformat(req.deadline)
    db.add(app); await db.commit(); await db.refresh(app)
    return {"id": app.id, "message": "Application added"}

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
    interview = Interview(user_id=current_user.id, company=req.company, role=req.role, interview_type=req.interview_type, scheduled_at=datetime.fromisoformat(req.scheduled_at))
    db.add(interview); await db.commit(); await db.refresh(interview)
    return {"id": interview.id, "message": "Interview scheduled"}

# --- Offers ---
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

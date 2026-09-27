from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, datetime, timezone
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.academics.models import Subject, AttendanceRecord, Timetable, Assignment, Note, Exam, StudySession, Grade
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

# --- Subjects ---
class SubjectCreate(BaseModel):
    name: str; code: Optional[str] = None; faculty: Optional[str] = None; total_classes: int = 0; credits: int = 3; semester: Optional[int] = None

class AttendanceMark(BaseModel):
    date: str; status: str

@router.get("/subjects")
async def get_subjects(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subject).where(Subject.user_id == current_user.id))
    subjects = result.scalars().all()
    return [{"id": s.id, "name": s.name, "code": s.code, "faculty": s.faculty, "total_classes": s.total_classes, "attended_classes": s.attended_classes, "credits": s.credits, "semester": s.semester, "attendance": round((s.attended_classes / s.total_classes * 100) if s.total_classes > 0 else 0, 1)} for s in subjects]

@router.post("/subjects")
async def create_subject(req: SubjectCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    subject = Subject(user_id=current_user.id, **req.model_dump())
    db.add(subject); await db.commit(); await db.refresh(subject)
    return {"id": subject.id, "message": "Subject created"}

@router.post("/subjects/{subject_id}/attendance")
async def mark_attendance(subject_id: int, req: AttendanceMark, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subject).where(Subject.id == subject_id, Subject.user_id == current_user.id))
    subject = result.scalar_one_or_none()
    if not subject: raise HTTPException(status_code=404)
    record = AttendanceRecord(subject_id=subject_id, date=date.fromisoformat(req.date), status=req.status)
    subject.total_classes += 1
    if req.status == "present": subject.attended_classes += 1
    db.add(record); await db.commit()
    return {"message": "Attendance marked"}

@router.get("/subjects/{subject_id}/attendance")
async def get_attendance_history(subject_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AttendanceRecord).where(AttendanceRecord.subject_id == subject_id).order_by(AttendanceRecord.date.desc()))
    records = result.scalars().all()
    return [{"id": r.id, "date": r.date.isoformat(), "status": r.status} for r in records]

# --- Timetable ---
class TimetableEntry(BaseModel):
    day_of_week: int; subject_name: str; faculty: Optional[str] = ""; room: Optional[str] = ""; start_time: str; end_time: str

@router.get("/timetable")
async def get_timetable(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Timetable).where(Timetable.user_id == current_user.id))
    entries = result.scalars().all()
    return [{"id": e.id, "day_of_week": e.day_of_week, "subject_name": e.subject_name, "faculty": e.faculty, "room": e.room, "start_time": e.start_time.strftime("%H:%M"), "end_time": e.end_time.strftime("%H:%M")} for e in entries]

@router.post("/timetable")
async def add_timetable_entry(req: TimetableEntry, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from datetime import time as dt_time
    entry = Timetable(user_id=current_user.id, day_of_week=req.day_of_week, subject_name=req.subject_name, faculty=req.faculty, room=req.room, start_time=dt_time.fromisoformat(req.start_time), end_time=dt_time.fromisoformat(req.end_time))
    db.add(entry); await db.commit(); await db.refresh(entry)
    return {"id": entry.id, "message": "Entry added"}

# --- Assignments ---
class AssignmentCreate(BaseModel):
    title: str; description: Optional[str] = ""; subject: str; due_date: str

@router.get("/assignments")
async def get_assignments(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Assignment).where(Assignment.user_id == current_user.id).order_by(Assignment.due_date))
    assignments = result.scalars().all()
    return [{"id": a.id, "title": a.title, "description": a.description, "subject": a.subject, "due_date": a.due_date.isoformat(), "status": a.status, "grade": a.grade} for a in assignments]

@router.post("/assignments")
async def create_assignment(req: AssignmentCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    assignment = Assignment(user_id=current_user.id, title=req.title, description=req.description, subject=req.subject, due_date=datetime.fromisoformat(req.due_date))
    db.add(assignment); await db.commit(); await db.refresh(assignment)
    return {"id": assignment.id, "message": "Assignment created"}

@router.put("/assignments/{assignment_id}/status")
async def update_assignment_status(assignment_id: int, status: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id, Assignment.user_id == current_user.id))
    assignment = result.scalar_one_or_none()
    if not assignment: raise HTTPException(status_code=404)
    assignment.status = status; await db.commit()
    return {"message": "Status updated"}

# --- Notes ---
class NoteCreate(BaseModel):
    title: str; content: str; subject: Optional[str] = ""; tags: Optional[List[str]] = []

@router.get("/notes")
async def get_notes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.user_id == current_user.id).order_by(Note.updated_at.desc()))
    notes = result.scalars().all()
    return [{"id": n.id, "title": n.title, "content": n.content[:200] + "...", "subject": n.subject, "summary": n.summary, "tags": n.tags, "created_at": n.created_at.isoformat(), "updated_at": n.updated_at.isoformat()} for n in notes]

@router.post("/notes")
async def create_note(req: NoteCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    note = Note(user_id=current_user.id, **req.model_dump())
    db.add(note); await db.commit(); await db.refresh(note)
    return {"id": note.id, "message": "Note created"}

@router.get("/notes/{note_id}")
async def get_note(note_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id, Note.user_id == current_user.id))
    note = result.scalar_one_or_none()
    if not note: raise HTTPException(status_code=404)
    return {"id": note.id, "title": note.title, "content": note.content, "subject": note.subject, "summary": note.summary, "tags": note.tags, "created_at": note.created_at.isoformat(), "updated_at": note.updated_at.isoformat()}

@router.put("/notes/{note_id}")
async def update_note(note_id: int, req: NoteCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id, Note.user_id == current_user.id))
    note = result.scalar_one_or_none()
    if not note: raise HTTPException(status_code=404)
    for field, value in req.model_dump().items(): setattr(note, field, value)
    await db.commit(); return {"message": "Note updated"}

# --- Exams ---
class ExamCreate(BaseModel):
    subject: str; exam_type: str; date: str; syllabus: Optional[str] = ""

@router.get("/exams")
async def get_exams(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Exam).where(Exam.user_id == current_user.id).order_by(Exam.date))
    exams = result.scalars().all()
    return [{"id": e.id, "subject": e.subject, "exam_type": e.exam_type, "date": e.date.isoformat(), "syllabus": e.syllabus, "completed": e.completed, "score": e.score} for e in exams]

@router.post("/exams")
async def create_exam(req: ExamCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    exam = Exam(user_id=current_user.id, subject=req.subject, exam_type=req.exam_type, date=datetime.fromisoformat(req.date), syllabus=req.syllabus)
    db.add(exam); await db.commit(); await db.refresh(exam)
    return {"id": exam.id, "message": "Exam created"}

# --- Study Sessions ---
class StudySessionCreate(BaseModel):
    subject: str; duration_minutes: int; date: str; notes: Optional[str] = ""

@router.get("/study-sessions")
async def get_study_sessions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudySession).where(StudySession.user_id == current_user.id).order_by(StudySession.date.desc()).limit(100))
    sessions = result.scalars().all()
    return [{"id": s.id, "subject": s.subject, "duration_minutes": s.duration_minutes, "date": s.date.isoformat(), "notes": s.notes} for s in sessions]

@router.post("/study-sessions")
async def create_study_session(req: StudySessionCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from datetime import date as dt_date
    session = StudySession(user_id=current_user.id, subject=req.subject, duration_minutes=req.duration_minutes, date=dt_date.fromisoformat(req.date), notes=req.notes)
    db.add(session); await db.commit(); await db.refresh(session)
    return {"id": session.id, "message": "Session logged"}

# --- SGPA / CGPA ---
@router.get("/grades")
async def get_grades(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Grade).where(Grade.user_id == current_user.id).order_by(Grade.semester))
    grades = result.scalars().all()
    return [{"id": g.id, "semester": g.semester, "subject": g.subject, "credits": g.credits, "grade_point": g.grade_point, "grade": g.grade} for g in grades]

@router.get("/sgpa/{semester}")
async def get_sgpa(semester: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Grade).where(Grade.user_id == current_user.id, Grade.semester == semester))
    grades = result.scalars().all()
    if not grades: return {"sgpa": 0, "total_credits": 0}
    total_credits = sum(g.credits for g in grades)
    weighted = sum(g.grade_point * g.credits for g in grades)
    return {"sgpa": round(weighted / total_credits, 2), "total_credits": total_credits}

@router.get("/cgpa")
async def get_cgpa(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Grade).where(Grade.user_id == current_user.id))
    grades = result.scalars().all()
    if not grades: return {"cgpa": 0, "total_credits": 0}
    total_credits = sum(g.credits for g in grades)
    weighted = sum(g.grade_point * g.credits for g in grades)
    return {"cgpa": round(weighted / total_credits, 2), "total_credits": total_credits}

# --- Analytics ---
@router.get("/analytics")
async def get_academic_analytics(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    subj_result = await db.execute(select(Subject).where(Subject.user_id == current_user.id))
    subjects = subj_result.scalars().all()
    session_result = await db.execute(select(func.sum(StudySession.duration_minutes)).where(StudySession.user_id == current_user.id))
    total_study_hours = (session_result.scalar() or 0) / 60
    return {
        "total_subjects": len(subjects),
        "average_attendance": round(sum((s.attended_classes / s.total_classes * 100) if s.total_classes > 0 else 0 for s in subjects) / len(subjects), 1) if subjects else 0,
        "total_study_hours": round(total_study_hours, 1),
        "pending_assignments": 0,
        "upcoming_exams": 0
    }

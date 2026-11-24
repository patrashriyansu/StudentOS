from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, datetime, timezone, timedelta, time as dt_time
from zoneinfo import ZoneInfo
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, EmailReminder
from backend.academics.models import Subject, AttendanceRecord, Timetable, Assignment, Note, Exam, StudySession, Grade
from backend.notifications.service import INDIA_TZ, schedule_email_reminder, to_utc_datetime
from pydantic import BaseModel
from typing import Optional, List, Literal

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
    return {"id": subject.id, "name": subject.name, "code": subject.code, "faculty": subject.faculty, "credits": subject.credits, "total_classes": subject.total_classes, "attended_classes": subject.attended_classes, "message": "Subject created"}

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



class DailyAttendanceMark(BaseModel):
    subject_id: int
    status: Literal["present", "absent"]
    date: Optional[str] = None


@router.post("/attendance")
async def mark_daily_attendance(
    req: DailyAttendanceMark,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    subject_result = await db.execute(
        select(Subject).where(Subject.id == req.subject_id, Subject.user_id == current_user.id)
    )
    subject = subject_result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    attendance_date = date.fromisoformat(req.date) if req.date else datetime.now(INDIA_TZ).date()
    existing_result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.subject_id == subject.id,
            AttendanceRecord.date == attendance_date,
        )
    )
    record = existing_result.scalar_one_or_none()

    if record:
        previous_status = record.status
        if previous_status != req.status:
            if previous_status == "present":
                subject.attended_classes = max(0, (subject.attended_classes or 0) - 1)
            if req.status == "present":
                subject.attended_classes = (subject.attended_classes or 0) + 1
            record.status = req.status
    else:
        record = AttendanceRecord(subject_id=subject.id, date=attendance_date, status=req.status)
        subject.total_classes = (subject.total_classes or 0) + 1
        if req.status == "present":
            subject.attended_classes = (subject.attended_classes or 0) + 1
        db.add(record)

    await db.commit()
    return {
        "message": "Attendance marked",
        "date": attendance_date.isoformat(),
        "status": record.status,
        "total_classes": subject.total_classes,
        "attended_classes": subject.attended_classes,
    }


@router.get("/attendance/streak")
async def get_attendance_streak(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AttendanceRecord)
        .join(Subject, AttendanceRecord.subject_id == Subject.id)
        .where(Subject.user_id == current_user.id)
        .order_by(AttendanceRecord.date.desc())
    )
    records = result.scalars().all()

    daily_status: dict[date, bool] = {}
    for record in records:
        current_day = record.date
        daily_status[current_day] = daily_status.get(current_day, True) and record.status == "present"

    today = datetime.now(INDIA_TZ).date()
    streak = 0
    current_day = today
    while daily_status.get(current_day) is True:
        streak += 1
        current_day -= timedelta(days=1)

    return {
        "current_streak": streak,
        "last_attendance_date": max(daily_status).isoformat() if daily_status else None,
        "today_marked": today in daily_status,
        "today_present": daily_status.get(today, False),
    }


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
    if not 0 <= req.day_of_week <= 5:
        raise HTTPException(status_code=422, detail="Choose a valid weekday")
    try:
        start_time = dt_time.fromisoformat(req.start_time)
        end_time = dt_time.fromisoformat(req.end_time)
    except ValueError:
        raise HTTPException(status_code=422, detail="Enter valid class times")
    if end_time <= start_time:
        raise HTTPException(status_code=422, detail="Class end time must be after start time")

    entry = Timetable(user_id=current_user.id, day_of_week=req.day_of_week, subject_name=req.subject_name, faculty=req.faculty, room=req.room, start_time=start_time, end_time=end_time)
    db.add(entry)
    await db.flush()

    local_now = datetime.now(INDIA_TZ)
    days_until_class = (req.day_of_week - local_now.weekday()) % 7
    class_date = local_now.date() + timedelta(days=days_until_class)
    class_start = datetime.combine(class_date, start_time, tzinfo=INDIA_TZ)
    first_reminder = class_start - timedelta(minutes=15)
    if first_reminder <= local_now:
        first_reminder += timedelta(days=7)

    await schedule_email_reminder(
        db,
        user_id=current_user.id,
        title=f"Upcoming class: {req.subject_name}",
        message=f"Your {req.subject_name} class starts at {start_time.strftime('%H:%M')}. Room: {req.room or 'Not specified'}.",
        remind_at=first_reminder,
        repeat_interval="weekly",
        entity_type="timetable",
        entity_id=entry.id,
    )
    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id, "message": "Entry added", "email_reminder": "weekly, 15 minutes before class"}

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
    due_at = to_utc_datetime(req.due_date)
    assignment = Assignment(user_id=current_user.id, title=req.title, description=req.description, subject=req.subject, due_date=due_at)
    db.add(assignment)
    await db.flush()
    if due_at > datetime.now(timezone.utc):
        await schedule_email_reminder(
            db,
            user_id=current_user.id,
            title=f"Assignment due: {req.title}",
            message=f"{req.title} for {req.subject} is due on {due_at.astimezone(INDIA_TZ).strftime('%d %b %Y at %I:%M %p')}.",
            remind_at=due_at - timedelta(days=1),
            entity_type="assignment",
            entity_id=assignment.id,
        )
    await db.commit()
    await db.refresh(assignment)
    return {"id": assignment.id, "message": "Assignment created", "email_reminder": "scheduled when due date is in the future"}

@router.put("/assignments/{assignment_id}/status")
async def update_assignment_status(assignment_id: int, status: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id, Assignment.user_id == current_user.id))
    assignment = result.scalar_one_or_none()
    if not assignment: raise HTTPException(status_code=404)
    assignment.status = status
    if status == "submitted":
        reminder_result = await db.execute(
            select(EmailReminder).where(
                EmailReminder.user_id == current_user.id,
                EmailReminder.entity_type == "assignment",
                EmailReminder.entity_id == assignment.id,
                EmailReminder.is_active.is_(True),
            )
        )
        for reminder in reminder_result.scalars().all():
            reminder.is_active = False
    await db.commit()
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
    exam_at = to_utc_datetime(req.date)
    exam = Exam(user_id=current_user.id, subject=req.subject, exam_type=req.exam_type, date=exam_at, syllabus=req.syllabus)
    db.add(exam)
    await db.flush()
    if exam_at > datetime.now(timezone.utc):
        await schedule_email_reminder(
            db,
            user_id=current_user.id,
            title=f"Upcoming exam: {req.subject}",
            message=f"Your {req.exam_type} exam for {req.subject} is scheduled for {exam_at.astimezone(INDIA_TZ).strftime('%d %b %Y at %I:%M %p')}.",
            remind_at=exam_at - timedelta(days=1),
            entity_type="exam",
            entity_id=exam.id,
        )
    await db.commit()
    await db.refresh(exam)
    return {"id": exam.id, "message": "Exam created", "email_reminder": "scheduled when exam date is in the future"}

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



class GradeCreate(BaseModel):
    semester: int
    subject: str
    credits: int
    grade_point: float
    grade: str


@router.post("/grades")
async def create_grade(
    req: GradeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.semester < 1 or req.credits < 1 or not 0 <= req.grade_point <= 10:
        raise HTTPException(status_code=422, detail="Enter valid semester, credits and grade point")
    grade = Grade(
        user_id=current_user.id,
        semester=req.semester,
        subject=req.subject.strip(),
        credits=req.credits,
        grade_point=req.grade_point,
        grade=req.grade.strip().upper(),
    )
    db.add(grade)
    await db.commit()
    await db.refresh(grade)
    return {"id": grade.id, "message": "Marks saved"}


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


class CGPAWhatIfRequest(BaseModel):
    future_semester_credits: int
    expected_sgpa: float


@router.post("/cgpa/what-if")
async def calculate_cgpa_what_if(req: CGPAWhatIfRequest,
                                 current_user: User = Depends(get_current_user),
                                 db: AsyncSession = Depends(get_db)):
    if not 1 <= req.future_semester_credits <= 100:
        raise HTTPException(status_code=422, detail="Future semester credits must be between 1 and 100.")
    if not 0 <= req.expected_sgpa <= 10:
        raise HTTPException(status_code=422, detail="Expected SGPA must be between 0 and 10.")
    result = await db.execute(select(Grade).where(Grade.user_id == current_user.id))
    grades = result.scalars().all()
    current_credits = sum(int(item.credits or 0) for item in grades)
    current_points = sum(float(item.grade_point or 0) * int(item.credits or 0) for item in grades)
    current_cgpa = current_points / current_credits if current_credits else None
    projected_cgpa = (
        (current_points + req.expected_sgpa * req.future_semester_credits)
        / (current_credits + req.future_semester_credits)
    )
    return {
        "current_cgpa": round(current_cgpa, 2) if current_cgpa is not None else None,
        "current_credits": current_credits,
        "future_semester_credits": req.future_semester_credits,
        "expected_sgpa": req.expected_sgpa,
        "projected_cgpa": round(projected_cgpa, 2),
        "change": round(projected_cgpa - current_cgpa, 2) if current_cgpa is not None else None,
        "persisted": False,
    }


@router.get("/calendar")
async def get_academic_calendar(start_date: date | None = None,
                                end_date: date | None = None,
                                current_user: User = Depends(get_current_user),
                                db: AsyncSession = Depends(get_db)):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=422, detail="Start date must not be after end date.")

    exam_rows = (await db.execute(select(Exam).where(
        Exam.user_id == current_user.id
    ).order_by(Exam.date.asc()))).scalars().all()
    assignment_rows = (await db.execute(select(Assignment).where(
        Assignment.user_id == current_user.id,
        Assignment.due_date.is_not(None),
    ).order_by(Assignment.due_date.asc()))).scalars().all()

    def event_day(value: datetime) -> date:
        if value.tzinfo is None:
            return value.date()
        return value.astimezone(INDIA_TZ).date()

    events = []
    for exam in exam_rows:
        if exam.date is None:
            continue
        day = event_day(exam.date)
        if (start_date and day < start_date) or (end_date and day > end_date):
            continue
        events.append({
            "id": f"exam-{exam.id}",
            "source_id": exam.id,
            "type": "exam",
            "title": f"{exam.exam_type}: {exam.subject}",
            "subject": exam.subject,
            "starts_at": exam.date.isoformat(),
            "date": day.isoformat(),
            "description": exam.syllabus or "",
            "status": "completed" if exam.completed else "upcoming",
        })
    for assignment in assignment_rows:
        if assignment.due_date is None:
            continue
        day = event_day(assignment.due_date)
        if (start_date and day < start_date) or (end_date and day > end_date):
            continue
        events.append({
            "id": f"assignment-{assignment.id}",
            "source_id": assignment.id,
            "type": "assignment",
            "title": assignment.title,
            "subject": assignment.subject,
            "starts_at": assignment.due_date.isoformat(),
            "date": day.isoformat(),
            "description": assignment.description or "",
            "status": assignment.status,
        })
    events.sort(key=lambda item: (item["starts_at"], item["type"], item["source_id"]))
    return events


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

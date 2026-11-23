from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.campus.models import MentorStudentAssignment
from .models import (
    MentorProgram, MentorDevelopmentGoal, MentorActionItem, MentorCheckIn,
    MentorSession, MentorSessionFeedback,
)

router = APIRouter()


def require_role(user: User, role: str) -> None:
    if user.role != role:
        raise HTTPException(status_code=403, detail=f"{role.capitalize()} access required.")


async def mentor_program(program_id: int, mentor_id: int, db: AsyncSession) -> MentorProgram:
    row = (await db.execute(select(MentorProgram).where(
        MentorProgram.id == program_id,
        MentorProgram.mentor_id == mentor_id,
    ))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Mentoring programme not found.")
    return row


def program_summary(program: MentorProgram, student: User) -> dict:
    return {
        "id": program.id,
        "student_id": student.id,
        "student_name": student.name,
        "title": program.title,
        "focus_area": program.focus_area,
        "description": program.description,
        "start_date": program.start_date.isoformat(),
        "target_end_date": program.target_end_date.isoformat() if program.target_end_date else None,
        "meeting_cadence": program.meeting_cadence,
        "status": program.status,
        "student_accepted_at": program.student_accepted_at.isoformat() if program.student_accepted_at else None,
    }


class ProgramCreate(BaseModel):
    student_id: int
    title: str = Field(min_length=3, max_length=180)
    focus_area: Literal["Career readiness", "Technical skills", "Academic progress", "Communication", "Leadership", "Professional growth"] = "Career readiness"
    description: str = Field(min_length=10, max_length=5000)
    start_date: datetime
    target_end_date: datetime | None = None
    meeting_cadence: Literal["weekly", "biweekly", "monthly"] = "biweekly"


class ProgramUpdate(BaseModel):
    status: Literal["paused", "completed", "active"]


class ProgramResponse(BaseModel):
    accepted: bool


class DevelopmentGoalCreate(BaseModel):
    program_id: int
    title: str = Field(min_length=3, max_length=180)
    category: Literal["Technical skills", "Career readiness", "Academic progress", "Communication", "Leadership", "Professionalism", "Teamwork", "Technology", "Personal growth"] = "Career readiness"
    desired_outcome: str = Field(min_length=8, max_length=3000)
    success_measure: str = Field(min_length=3, max_length=500)
    baseline: str | None = Field(default=None, max_length=180)
    target: str | None = Field(default=None, max_length=180)
    priority: Literal["low", "medium", "high"] = "medium"
    due_date: datetime | None = None


class DevelopmentGoalUpdate(BaseModel):
    progress_percent: int = Field(ge=0, le=100)
    status: Literal["not_started", "in_progress", "completed", "blocked"]


class ActionItemCreate(BaseModel):
    goal_id: int
    title: str = Field(min_length=3, max_length=180)
    description: str | None = Field(default=None, max_length=2000)
    owner: Literal["student", "mentor"] = "student"
    due_date: datetime | None = None
    resource_url: str | None = Field(default=None, max_length=1000)


class ActionItemUpdate(BaseModel):
    status: Literal["not_started", "in_progress", "completed", "blocked"]


class CheckInCreate(BaseModel):
    confidence_rating: int = Field(ge=1, le=5)
    progress_status: Literal["on_track", "needs_support", "blocked"]
    wins: str | None = Field(default=None, max_length=3000)
    blockers: str | None = Field(default=None, max_length=3000)
    support_needed: str | None = Field(default=None, max_length=3000)


class CheckInReply(BaseModel):
    mentor_reply: str = Field(min_length=2, max_length=3000)


class SessionFeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    takeaways: str = Field(min_length=2, max_length=3000)
    next_steps: str | None = Field(default=None, max_length=3000)


@router.get("/mentor/program-dashboard")
async def mentor_program_dashboard(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    students = (await db.execute(select(func.count(MentorStudentAssignment.id)).where(
        MentorStudentAssignment.mentor_id == user.id
    ))).scalar_one()
    programs = (await db.execute(select(func.count(MentorProgram.id)).where(
        MentorProgram.mentor_id == user.id
    ))).scalar_one()
    active = (await db.execute(select(func.count(MentorProgram.id)).where(
        MentorProgram.mentor_id == user.id, MentorProgram.status == "active"
    ))).scalar_one()
    awaiting = (await db.execute(select(func.count(MentorProgram.id)).where(
        MentorProgram.mentor_id == user.id, MentorProgram.status == "awaiting_student"
    ))).scalar_one()
    open_goals = (await db.execute(select(func.count(MentorDevelopmentGoal.id)).where(
        MentorDevelopmentGoal.mentor_id == user.id,
        MentorDevelopmentGoal.status != "completed",
    ))).scalar_one()
    pending_actions = (await db.execute(select(func.count(MentorActionItem.id)).where(
        MentorActionItem.mentor_id == user.id, MentorActionItem.status != "completed"
    ))).scalar_one()
    pending_checkins = (await db.execute(select(func.count(MentorCheckIn.id)).where(
        MentorCheckIn.mentor_id == user.id, MentorCheckIn.mentor_reply.is_(None)
    ))).scalar_one()
    now = datetime.now(timezone.utc)
    upcoming = (await db.execute(select(func.count(MentorSession.id)).where(
        MentorSession.mentor_id == user.id, MentorSession.status == "scheduled",
        MentorSession.scheduled_at >= now,
    ))).scalar_one()
    return {
        "assigned_students": students, "programmes": programs, "active_programmes": active,
        "awaiting_acceptance": awaiting, "open_goals": open_goals,
        "pending_actions": pending_actions, "checkins_to_review": pending_checkins,
        "upcoming_sessions": upcoming,
    }


@router.get("/mentor/programmes")
async def mentor_programmes(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    rows = (await db.execute(select(MentorProgram, User)
        .join(User, User.id == MentorProgram.student_id)
        .where(MentorProgram.mentor_id == user.id)
        .order_by(MentorProgram.updated_at.desc()))).all()
    return [program_summary(program, student) for program, student in rows]


@router.post("/mentor/programmes", status_code=201)
async def create_mentor_programme(req: ProgramCreate, user: User = Depends(get_current_user),
                                  db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    assignment = (await db.execute(select(MentorStudentAssignment).where(
        MentorStudentAssignment.mentor_id == user.id,
        MentorStudentAssignment.student_id == req.student_id,
    ))).scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=404, detail="You can only create a programme for an assigned mentee.")
    existing = (await db.execute(select(MentorProgram).where(
        MentorProgram.assignment_id == assignment.id
    ))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A mentoring programme already exists for this mentee.")
    start = req.start_date.replace(tzinfo=timezone.utc) if req.start_date.tzinfo is None else req.start_date
    end = req.target_end_date
    if end is not None:
        end = end.replace(tzinfo=timezone.utc) if end.tzinfo is None else end
        if end.date() < start.date():
            raise HTTPException(status_code=422, detail="Target end date must be on or after the start date.")
    programme = MentorProgram(
        assignment_id=assignment.id, mentor_id=user.id, student_id=req.student_id,
        title=req.title.strip(), focus_area=req.focus_area, description=req.description.strip(),
        start_date=start.date(), target_end_date=end.date() if end else None,
        meeting_cadence=req.meeting_cadence, status="awaiting_student",
    )
    db.add(programme)
    await db.commit()
    await db.refresh(programme)
    return {"id": programme.id, "status": programme.status,
            "message": "Programme sent to the student for review and acceptance."}


@router.patch("/mentor/programmes/{program_id}")
async def update_mentor_programme(program_id: int, req: ProgramUpdate,
                                  user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    programme = await mentor_program(program_id, user.id, db)
    if req.status == "active" and programme.student_accepted_at is None:
        raise HTTPException(status_code=409, detail="The student must accept the programme before it can become active.")
    programme.status = req.status
    await db.commit()
    return {"message": "Programme status updated.", "status": programme.status}


@router.get("/mentor/development-goals")
async def mentor_development_goals(student_id: int | None = None, user: User = Depends(get_current_user),
                                   db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    statement = (select(MentorDevelopmentGoal, User, MentorProgram)
        .join(User, User.id == MentorDevelopmentGoal.student_id)
        .join(MentorProgram, MentorProgram.id == MentorDevelopmentGoal.program_id)
        .where(MentorDevelopmentGoal.mentor_id == user.id))
    if student_id:
        statement = statement.where(MentorDevelopmentGoal.student_id == student_id)
    rows = (await db.execute(statement.order_by(MentorDevelopmentGoal.due_date.asc()))).all()
    return [{
        "id": goal.id, "program_id": programme.id, "student_id": student.id,
        "student_name": student.name, "title": goal.title, "category": goal.category,
        "desired_outcome": goal.desired_outcome, "success_measure": goal.success_measure,
        "baseline": goal.baseline, "target": goal.target, "priority": goal.priority,
        "progress_percent": goal.progress_percent, "status": goal.status,
        "due_date": goal.due_date.isoformat() if goal.due_date else None,
    } for goal, student, programme in rows]


@router.post("/mentor/development-goals", status_code=201)
async def create_development_goal(req: DevelopmentGoalCreate, user: User = Depends(get_current_user),
                                  db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    programme = await mentor_program(req.program_id, user.id, db)
    if programme.status != "active":
        raise HTTPException(status_code=409, detail="Development goals can be added after the student accepts the programme.")
    goal = MentorDevelopmentGoal(
        program_id=programme.id, mentor_id=user.id, student_id=programme.student_id,
        title=req.title.strip(), category=req.category, desired_outcome=req.desired_outcome.strip(),
        success_measure=req.success_measure.strip(), baseline=req.baseline, target=req.target,
        priority=req.priority, due_date=req.due_date.date() if req.due_date else None,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return {"id": goal.id, "message": "Measurable development goal created."}


@router.patch("/mentor/development-goals/{goal_id}")
async def update_development_goal(goal_id: int, req: DevelopmentGoalUpdate,
                                  user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    goal = (await db.execute(select(MentorDevelopmentGoal).where(
        MentorDevelopmentGoal.id == goal_id, MentorDevelopmentGoal.mentor_id == user.id
    ))).scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Development goal not found.")
    goal.progress_percent = req.progress_percent
    goal.status = req.status
    if req.status == "completed":
        goal.progress_percent = 100
    await db.commit()
    return {"message": "Development progress updated."}


@router.get("/mentor/action-items")
async def mentor_action_items(student_id: int | None = None, user: User = Depends(get_current_user),
                              db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    statement = (select(MentorActionItem, User, MentorDevelopmentGoal)
        .join(User, User.id == MentorActionItem.student_id)
        .join(MentorDevelopmentGoal, MentorDevelopmentGoal.id == MentorActionItem.goal_id)
        .where(MentorActionItem.mentor_id == user.id))
    if student_id:
        statement = statement.where(MentorActionItem.student_id == student_id)
    rows = (await db.execute(statement.order_by(MentorActionItem.due_date.asc()))).all()
    return [{
        "id": item.id, "goal_id": item.goal_id, "program_id": item.program_id,
        "student_id": student.id, "student_name": student.name, "goal_title": goal.title,
        "title": item.title, "description": item.description, "owner": item.owner,
        "due_date": item.due_date.isoformat() if item.due_date else None,
        "status": item.status, "resource_url": item.resource_url,
    } for item, student, goal in rows]


@router.post("/mentor/action-items", status_code=201)
async def create_mentor_action_item(req: ActionItemCreate, user: User = Depends(get_current_user),
                                    db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    goal = (await db.execute(select(MentorDevelopmentGoal).where(
        MentorDevelopmentGoal.id == req.goal_id, MentorDevelopmentGoal.mentor_id == user.id
    ))).scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Development goal not found.")
    programme = await mentor_program(goal.program_id, user.id, db)
    if programme.status != "active":
        raise HTTPException(status_code=409, detail="Actions require an active mentoring programme.")
    item = MentorActionItem(
        goal_id=goal.id, program_id=programme.id, mentor_id=user.id, student_id=goal.student_id,
        title=req.title.strip(), description=req.description, owner=req.owner,
        due_date=req.due_date.date() if req.due_date else None, resource_url=req.resource_url,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "message": "Action item added to the development plan."}


@router.patch("/mentor/action-items/{item_id}")
async def update_mentor_action_item(item_id: int, req: ActionItemUpdate,
                                    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    item = (await db.execute(select(MentorActionItem).where(
        MentorActionItem.id == item_id, MentorActionItem.mentor_id == user.id
    ))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Action item not found.")
    item.status = req.status
    item.completed_at = datetime.now(timezone.utc) if req.status == "completed" else None
    await db.commit()
    return {"message": "Action item updated."}


@router.get("/mentor/check-ins")
async def mentor_check_ins(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    rows = (await db.execute(select(MentorCheckIn, User, MentorProgram)
        .join(User, User.id == MentorCheckIn.student_id)
        .join(MentorProgram, MentorProgram.id == MentorCheckIn.program_id)
        .where(MentorCheckIn.mentor_id == user.id)
        .order_by(MentorCheckIn.submitted_at.desc()))).all()
    return [{
        "id": checkin.id, "student_id": student.id, "student_name": student.name,
        "program_id": programme.id, "program_title": programme.title,
        "confidence_rating": checkin.confidence_rating, "progress_status": checkin.progress_status,
        "wins": checkin.wins, "blockers": checkin.blockers, "support_needed": checkin.support_needed,
        "mentor_reply": checkin.mentor_reply, "replied_at": checkin.replied_at.isoformat() if checkin.replied_at else None,
        "submitted_at": checkin.submitted_at.isoformat(),
    } for checkin, student, programme in rows]


@router.post("/mentor/check-ins/{checkin_id}/reply")
async def reply_to_checkin(checkin_id: int, req: CheckInReply, user: User = Depends(get_current_user),
                           db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    checkin = (await db.execute(select(MentorCheckIn).where(
        MentorCheckIn.id == checkin_id, MentorCheckIn.mentor_id == user.id
    ))).scalar_one_or_none()
    if checkin is None:
        raise HTTPException(status_code=404, detail="Check-in not found.")
    checkin.mentor_reply = req.mentor_reply.strip()
    checkin.replied_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Mentor response saved."}


@router.get("/mentor/session-feedback")
async def mentor_session_feedback(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "mentor")
    rows = (await db.execute(select(MentorSessionFeedback, User, MentorSession)
        .join(User, User.id == MentorSessionFeedback.student_id)
        .join(MentorSession, MentorSession.id == MentorSessionFeedback.session_id)
        .where(MentorSessionFeedback.mentor_id == user.id)
        .order_by(MentorSessionFeedback.submitted_at.desc()))).all()
    return [{
        "id": feedback.id, "session_id": session.id, "student_id": student.id,
        "student_name": student.name, "rating": feedback.rating,
        "takeaways": feedback.takeaways, "next_steps": feedback.next_steps,
        "submitted_at": feedback.submitted_at.isoformat(),
    } for feedback, student, session in rows]


# Mentee-facing endpoints. The student sees only their own accepted or pending plan.

@router.get("/student/mentoring")
async def student_mentoring(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    rows = (await db.execute(select(MentorProgram, User)
        .join(User, User.id == MentorProgram.mentor_id)
        .where(MentorProgram.student_id == user.id)
        .order_by(MentorProgram.created_at.desc()))).all()
    programmes = [program_summary(program, mentor) for program, mentor in rows]
    plan_ids = [program["id"] for program in programmes]
    if not plan_ids:
        return {"programmes": [], "goals": [], "action_items": [], "sessions": [], "check_ins": []}
    goals = (await db.execute(select(MentorDevelopmentGoal).where(
        MentorDevelopmentGoal.student_id == user.id,
        MentorDevelopmentGoal.program_id.in_(plan_ids),
    ).order_by(MentorDevelopmentGoal.due_date.asc()))).scalars().all()
    actions = (await db.execute(select(MentorActionItem).where(
        MentorActionItem.student_id == user.id,
        MentorActionItem.program_id.in_(plan_ids),
    ).order_by(MentorActionItem.due_date.asc()))).scalars().all()
    sessions = (await db.execute(select(MentorSession, MentorSessionFeedback)
        .outerjoin(MentorSessionFeedback, MentorSessionFeedback.session_id == MentorSession.id)
        .where(MentorSession.student_id == user.id)
        .order_by(MentorSession.scheduled_at.desc()))).all()
    checkins = (await db.execute(select(MentorCheckIn).where(
        MentorCheckIn.student_id == user.id,
        MentorCheckIn.program_id.in_(plan_ids),
    ).order_by(MentorCheckIn.submitted_at.desc()).limit(12))).scalars().all()
    return {
        "programmes": programmes,
        "goals": [{
            "id": goal.id, "program_id": goal.program_id, "title": goal.title, "category": goal.category,
            "desired_outcome": goal.desired_outcome, "success_measure": goal.success_measure,
            "baseline": goal.baseline, "target": goal.target, "priority": goal.priority,
            "progress_percent": goal.progress_percent, "status": goal.status,
            "due_date": goal.due_date.isoformat() if goal.due_date else None,
        } for goal in goals],
        "action_items": [{
            "id": item.id, "goal_id": item.goal_id, "title": item.title, "description": item.description,
            "owner": item.owner, "due_date": item.due_date.isoformat() if item.due_date else None,
            "status": item.status, "resource_url": item.resource_url,
        } for item in actions],
        "sessions": [{
            "id": session.id, "scheduled_at": session.scheduled_at.isoformat(),
            "duration_minutes": session.duration_minutes, "meeting_link": session.meeting_link,
            "agenda": session.agenda, "status": session.status,
            "feedback": ({
                "rating": feedback.rating, "takeaways": feedback.takeaways, "next_steps": feedback.next_steps,
            } if feedback else None),
        } for session, feedback in sessions],
        "check_ins": [{
            "id": checkin.id, "confidence_rating": checkin.confidence_rating,
            "progress_status": checkin.progress_status, "wins": checkin.wins,
            "blockers": checkin.blockers, "support_needed": checkin.support_needed,
            "mentor_reply": checkin.mentor_reply, "submitted_at": checkin.submitted_at.isoformat(),
        } for checkin in checkins],
    }


@router.post("/student/mentoring/programmes/{program_id}/respond")
async def respond_to_mentoring_programme(program_id: int, req: ProgramResponse,
                                         user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    programme = (await db.execute(select(MentorProgram).where(
        MentorProgram.id == program_id, MentorProgram.student_id == user.id,
    ))).scalar_one_or_none()
    if programme is None:
        raise HTTPException(status_code=404, detail="Mentoring programme not found.")
    if programme.status != "awaiting_student":
        raise HTTPException(status_code=409, detail="This mentoring programme has already been reviewed.")
    programme.status = "active" if req.accepted else "declined"
    programme.student_accepted_at = datetime.now(timezone.utc) if req.accepted else None
    await db.commit()
    return {"message": "Mentoring programme accepted." if req.accepted else "Mentoring programme declined.",
            "status": programme.status}


@router.post("/student/mentoring/check-ins", status_code=201)
async def submit_mentoring_checkin(req: CheckInCreate, user: User = Depends(get_current_user),
                                   db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    programme = (await db.execute(select(MentorProgram).where(
        MentorProgram.id == req.program_id if hasattr(req, "program_id") else False
    ))).scalar_one_or_none()
    # Check-ins are attached to the student's active programme selected in the URL-free payload below.
    raise HTTPException(status_code=422, detail="Choose an active mentoring programme.")


@router.post("/student/mentoring/programmes/{program_id}/check-ins", status_code=201)
async def create_student_checkin(program_id: int, req: CheckInCreate, user: User = Depends(get_current_user),
                                  db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    programme = (await db.execute(select(MentorProgram).where(
        MentorProgram.id == program_id, MentorProgram.student_id == user.id, MentorProgram.status == "active"
    ))).scalar_one_or_none()
    if programme is None:
        raise HTTPException(status_code=404, detail="An active mentoring programme was not found.")
    checkin = MentorCheckIn(
        program_id=programme.id, mentor_id=programme.mentor_id, student_id=user.id,
        confidence_rating=req.confidence_rating, progress_status=req.progress_status,
        wins=req.wins, blockers=req.blockers, support_needed=req.support_needed,
    )
    db.add(checkin)
    await db.commit()
    return {"message": "Weekly check-in submitted to your mentor."}


@router.patch("/student/mentoring/action-items/{item_id}")
async def update_student_action_item(item_id: int, req: ActionItemUpdate,
                                     user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    item = (await db.execute(select(MentorActionItem).where(
        MentorActionItem.id == item_id, MentorActionItem.student_id == user.id, MentorActionItem.owner == "student"
    ))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Your assigned action item was not found.")
    item.status = req.status
    item.completed_at = datetime.now(timezone.utc) if req.status == "completed" else None
    await db.commit()
    return {"message": "Your action item has been updated."}


@router.post("/student/mentoring/sessions/{session_id}/feedback", status_code=201)
async def create_student_session_feedback(session_id: int, req: SessionFeedbackCreate,
                                          user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "student")
    session = (await db.execute(select(MentorSession).where(
        MentorSession.id == session_id, MentorSession.student_id == user.id, MentorSession.status == "completed"
    ))).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="A completed mentoring session was not found.")
    existing = (await db.execute(select(MentorSessionFeedback).where(
        MentorSessionFeedback.session_id == session.id
    ))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Feedback has already been submitted for this session.")
    db.add(MentorSessionFeedback(
        session_id=session.id, mentor_id=session.mentor_id, student_id=user.id,
        rating=req.rating, takeaways=req.takeaways.strip(), next_steps=req.next_steps,
    ))
    await db.commit()
    return {"message": "Session feedback submitted."}

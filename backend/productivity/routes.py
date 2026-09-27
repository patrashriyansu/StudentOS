from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.productivity.models import Task, Habit, HabitLog, PomodoroSession

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    category: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[List[str]] = []
    parent_task_id: Optional[int] = None
    recurring: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    completed: Optional[bool] = None
    tags: Optional[List[str]] = None

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: Optional[str] = "daily"
    target_count: Optional[int] = 1
    icon: Optional[str] = None
    color: Optional[str] = "#6C63FF"

class PomodoroCreate(BaseModel):
    duration_minutes: int
    subject: Optional[str] = None
    notes: Optional[str] = None
    completed: Optional[bool] = True
    date: Optional[str] = None


# ── Tasks ──────────────────────────────────────────────────────────────────────
@router.get("/tasks")
async def get_tasks(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
                    completed: Optional[bool] = None, category: Optional[str] = None):
    query = select(Task).where(Task.user_id == current_user.id, Task.parent_task_id == None)
    if completed is not None:
        query = query.where(Task.completed == completed)
    if category:
        query = query.where(Task.category == category)
    query = query.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())
    result = await db.execute(query)
    tasks = result.scalars().all()
    return [_task_dict(t) for t in tasks]

@router.post("/tasks", status_code=201)
async def create_task(req: TaskCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    task = Task(
        user_id=current_user.id,
        title=req.title,
        description=req.description,
        priority=req.priority,
        category=req.category,
        tags=req.tags or [],
        recurring=req.recurring,
        parent_task_id=req.parent_task_id,
        due_date=datetime.fromisoformat(req.due_date) if req.due_date else None
    )
    db.add(task); await db.commit(); await db.refresh(task)
    # Award XP for creating task
    await _award_xp(current_user, 2, "task_created", db)
    return _task_dict(task)

@router.put("/tasks/{task_id}")
async def update_task(task_id: int, req: TaskUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    was_completed = task.completed
    for field, value in req.model_dump(exclude_unset=True).items():
        if field == "due_date" and value:
            setattr(task, field, datetime.fromisoformat(value))
        else:
            setattr(task, field, value)
    if req.completed and not was_completed:
        task.completed_at = datetime.now(timezone.utc)
        await _award_xp(current_user, 10, "task_completed", db)
    task.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return _task_dict(task)

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == current_user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task); await db.commit()
    return {"message": "Task deleted"}

@router.get("/tasks/stats")
async def get_task_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total_r = await db.execute(select(func.count(Task.id)).where(Task.user_id == current_user.id, Task.parent_task_id == None))
    done_r = await db.execute(select(func.count(Task.id)).where(Task.user_id == current_user.id, Task.completed == True, Task.parent_task_id == None))
    today_r = await db.execute(select(func.count(Task.id)).where(Task.user_id == current_user.id, Task.completed == True, Task.completed_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)))
    total = total_r.scalar() or 0
    done = done_r.scalar() or 0
    today_done = today_r.scalar() or 0
    return {"total": total, "completed": done, "pending": total - done, "today_completed": today_done, "completion_rate": round(done / total * 100, 1) if total > 0 else 0}


# ── Habits ─────────────────────────────────────────────────────────────────────
@router.get("/habits")
async def get_habits(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Habit).where(Habit.user_id == current_user.id, Habit.is_active == True).order_by(Habit.created_at))
    habits = result.scalars().all()
    today = date.today()
    habit_list = []
    for h in habits:
        log_r = await db.execute(select(HabitLog).where(HabitLog.habit_id == h.id, HabitLog.date == today, HabitLog.completed == True))
        done_today = log_r.scalar_one_or_none() is not None
        habit_list.append({
            "id": h.id, "name": h.name, "description": h.description, "frequency": h.frequency,
            "icon": h.icon, "color": h.color, "current_streak": h.current_streak,
            "max_streak": h.max_streak, "done_today": done_today
        })
    return habit_list

@router.post("/habits", status_code=201)
async def create_habit(req: HabitCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    habit = Habit(user_id=current_user.id, name=req.name, description=req.description,
                  frequency=req.frequency, target_count=req.target_count, icon=req.icon, color=req.color)
    db.add(habit); await db.commit(); await db.refresh(habit)
    return {"id": habit.id, "name": habit.name, "message": "Habit created"}

@router.post("/habits/{habit_id}/log")
async def log_habit(habit_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    habit_r = await db.execute(select(Habit).where(Habit.id == habit_id, Habit.user_id == current_user.id))
    habit = habit_r.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404)
    today = date.today()
    log_r = await db.execute(select(HabitLog).where(HabitLog.habit_id == habit_id, HabitLog.date == today))
    log = log_r.scalar_one_or_none()
    if log:
        log.completed = not log.completed
    else:
        log = HabitLog(habit_id=habit_id, user_id=current_user.id, date=today, completed=True)
        db.add(log)
    # Update streak
    if not log.completed:
        habit.current_streak = 0
    else:
        yesterday = today - timedelta(days=1)
        yesterday_r = await db.execute(select(HabitLog).where(HabitLog.habit_id == habit_id, HabitLog.date == yesterday, HabitLog.completed == True))
        had_yesterday = yesterday_r.scalar_one_or_none() is not None
        habit.current_streak = (habit.current_streak + 1) if had_yesterday else 1
        if habit.current_streak > habit.max_streak:
            habit.max_streak = habit.current_streak
        await _award_xp(current_user, 5, "habit_completed", db)
    await db.commit()
    return {"message": "Habit logged", "done_today": log.completed, "streak": habit.current_streak}

@router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Habit).where(Habit.id == habit_id, Habit.user_id == current_user.id))
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404)
    habit.is_active = False; await db.commit()
    return {"message": "Habit removed"}


# ── Pomodoro ───────────────────────────────────────────────────────────────────
@router.post("/pomodoro")
async def log_pomodoro(req: PomodoroCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.fromisoformat(req.date) if req.date else date.today()
    session = PomodoroSession(user_id=current_user.id, duration_minutes=req.duration_minutes,
                               subject=req.subject, notes=req.notes, completed=req.completed, date=today)
    db.add(session); await db.commit(); await db.refresh(session)
    if req.completed:
        await _award_xp(current_user, 8, "pomodoro_completed", db)
    return {"id": session.id, "message": "Pomodoro logged", "duration_minutes": req.duration_minutes}

@router.get("/pomodoro/stats")
async def get_pomodoro_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    since_7 = today - timedelta(days=7)
    today_r = await db.execute(select(func.count(PomodoroSession.id)).where(PomodoroSession.user_id == current_user.id, PomodoroSession.date == today, PomodoroSession.completed == True))
    week_r = await db.execute(select(func.sum(PomodoroSession.duration_minutes)).where(PomodoroSession.user_id == current_user.id, PomodoroSession.date >= since_7, PomodoroSession.completed == True))
    today_count = today_r.scalar() or 0
    week_minutes = week_r.scalar() or 0
    return {"today_sessions": today_count, "week_focus_minutes": week_minutes, "week_focus_hours": round(week_minutes / 60, 1)}


# ── Summary ────────────────────────────────────────────────────────────────────
@router.get("/summary")
async def get_productivity_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    task_stats = await get_task_stats(current_user, db)
    pomodoro_stats = await get_pomodoro_stats(current_user, db)
    habits = await get_habits(current_user, db)
    habits_done = sum(1 for h in habits if h["done_today"])
    return {
        "tasks": task_stats,
        "pomodoro": pomodoro_stats,
        "habits": {"total": len(habits), "done_today": habits_done, "completion_rate": round(habits_done / len(habits) * 100) if habits else 0}
    }


# ── Helpers ────────────────────────────────────────────────────────────────────
def _task_dict(t: Task) -> dict:
    return {
        "id": t.id, "title": t.title, "description": t.description, "priority": t.priority,
        "category": t.category, "due_date": t.due_date.isoformat() if t.due_date else None,
        "completed": t.completed, "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "tags": t.tags or [], "recurring": t.recurring, "created_at": t.created_at.isoformat()
    }

async def _award_xp(user: User, amount: int, reason: str, db: AsyncSession):
    from backend.users.models import UserActivity
    user.xp_points = (user.xp_points or 0) + amount
    user.level = max(1, (user.xp_points // 500) + 1)
    activity = UserActivity(user_id=user.id, activity_type=reason, description=f"Earned {amount} XP", xp_earned=amount)
    db.add(activity)

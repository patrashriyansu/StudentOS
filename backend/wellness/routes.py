from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, timedelta
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.wellness.models import MoodLog, SleepLog, WaterLog, ExerciseLog, MeditationSession
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────
class MoodEntry(BaseModel):
    mood_score: int   # 1-5
    note: Optional[str] = None
    date: Optional[str] = None

class SleepEntry(BaseModel):
    hours: float
    quality: Optional[int] = None
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None
    note: Optional[str] = None
    date: Optional[str] = None

class WaterEntry(BaseModel):
    glasses: int
    goal: Optional[int] = 8
    date: Optional[str] = None

class ExerciseEntry(BaseModel):
    duration_minutes: int
    exercise_type: str
    calories_burned: Optional[int] = None
    note: Optional[str] = None
    date: Optional[str] = None

class MeditationEntry(BaseModel):
    duration_minutes: int
    session_type: Optional[str] = "mindfulness"
    date: Optional[str] = None


# ── Mood ───────────────────────────────────────────────────────────────────────
@router.post("/mood")
async def log_mood(req: MoodEntry, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.fromisoformat(req.date) if req.date else date.today()
    # Upsert: update if already logged today
    result = await db.execute(select(MoodLog).where(MoodLog.user_id == current_user.id, MoodLog.date == today))
    log = result.scalar_one_or_none()
    if log:
        log.mood_score = req.mood_score
        log.note = req.note
    else:
        log = MoodLog(user_id=current_user.id, mood_score=req.mood_score, note=req.note, date=today)
        db.add(log)
    await db.commit()
    return {"message": "Mood logged", "mood_score": req.mood_score, "date": today.isoformat()}

@router.get("/mood/today")
async def get_mood_today(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MoodLog).where(MoodLog.user_id == current_user.id, MoodLog.date == date.today()))
    log = result.scalar_one_or_none()
    return {"mood_score": log.mood_score if log else None, "note": log.note if log else None}

@router.get("/mood/history")
async def get_mood_history(current_user: User = Depends(get_current_user), days: int = 30, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(select(MoodLog).where(MoodLog.user_id == current_user.id, MoodLog.date >= since).order_by(MoodLog.date))
    logs = result.scalars().all()
    history = [{"date": l.date.isoformat(), "mood_score": l.mood_score, "note": l.note} for l in logs]
    avg = round(sum(h["mood_score"] for h in history) / len(history), 1) if history else 0
    return {"history": history, "average_mood": avg}


# ── Sleep ──────────────────────────────────────────────────────────────────────
@router.post("/sleep")
async def log_sleep(req: SleepEntry, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.fromisoformat(req.date) if req.date else date.today()
    result = await db.execute(select(SleepLog).where(SleepLog.user_id == current_user.id, SleepLog.date == today))
    log = result.scalar_one_or_none()
    if log:
        log.hours = req.hours; log.quality = req.quality; log.bedtime = req.bedtime; log.wake_time = req.wake_time; log.note = req.note
    else:
        log = SleepLog(user_id=current_user.id, hours=req.hours, quality=req.quality, bedtime=req.bedtime, wake_time=req.wake_time, note=req.note, date=today)
        db.add(log)
    await db.commit()
    return {"message": "Sleep logged", "hours": req.hours, "date": today.isoformat()}

@router.get("/sleep/today")
async def get_sleep_today(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SleepLog).where(SleepLog.user_id == current_user.id, SleepLog.date == date.today()))
    log = result.scalar_one_or_none()
    return {"hours": log.hours if log else None, "quality": log.quality if log else None, "bedtime": log.bedtime if log else None, "wake_time": log.wake_time if log else None}

@router.get("/sleep/history")
async def get_sleep_history(current_user: User = Depends(get_current_user), days: int = 30, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(select(SleepLog).where(SleepLog.user_id == current_user.id, SleepLog.date >= since).order_by(SleepLog.date))
    logs = result.scalars().all()
    history = [{"date": l.date.isoformat(), "hours": l.hours, "quality": l.quality, "bedtime": l.bedtime, "wake_time": l.wake_time} for l in logs]
    avg = round(sum(h["hours"] for h in history) / len(history), 1) if history else 0
    return {"history": history, "average_sleep": avg}


# ── Water ──────────────────────────────────────────────────────────────────────
@router.post("/water")
async def log_water(req: WaterEntry, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.fromisoformat(req.date) if req.date else date.today()
    result = await db.execute(select(WaterLog).where(WaterLog.user_id == current_user.id, WaterLog.date == today))
    log = result.scalar_one_or_none()
    if log:
        log.glasses = req.glasses; log.goal = req.goal
    else:
        log = WaterLog(user_id=current_user.id, glasses=req.glasses, goal=req.goal, date=today)
        db.add(log)
    await db.commit()
    goal = req.goal or 8
    return {"message": "Water logged", "glasses": req.glasses, "goal": goal, "remaining": max(0, goal - req.glasses), "percentage": min(100, round(req.glasses / goal * 100))}

@router.get("/water/today")
async def get_water_today(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WaterLog).where(WaterLog.user_id == current_user.id, WaterLog.date == date.today()))
    log = result.scalar_one_or_none()
    glasses = log.glasses if log else 0
    goal = log.goal if log else 8
    return {"glasses": glasses, "goal": goal, "remaining": max(0, goal - glasses), "percentage": min(100, round(glasses / goal * 100))}

@router.get("/water/history")
async def get_water_history(current_user: User = Depends(get_current_user), days: int = 30, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(select(WaterLog).where(WaterLog.user_id == current_user.id, WaterLog.date >= since).order_by(WaterLog.date))
    logs = result.scalars().all()
    return {"history": [{"date": l.date.isoformat(), "glasses": l.glasses, "goal": l.goal} for l in logs]}


# ── Exercise ───────────────────────────────────────────────────────────────────
@router.post("/exercise")
async def log_exercise(req: ExerciseEntry, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.fromisoformat(req.date) if req.date else date.today()
    calories = req.calories_burned or req.duration_minutes * 7
    log = ExerciseLog(user_id=current_user.id, duration_minutes=req.duration_minutes, exercise_type=req.exercise_type, calories_burned=calories, note=req.note, date=today)
    db.add(log); await db.commit()
    return {"message": "Exercise logged", "duration_minutes": req.duration_minutes, "calories_burned": calories}

@router.get("/exercise/history")
async def get_exercise_history(current_user: User = Depends(get_current_user), days: int = 30, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(select(ExerciseLog).where(ExerciseLog.user_id == current_user.id, ExerciseLog.date >= since).order_by(ExerciseLog.date))
    logs = result.scalars().all()
    return {"history": [{"date": l.date.isoformat(), "duration_minutes": l.duration_minutes, "exercise_type": l.exercise_type, "calories_burned": l.calories_burned} for l in logs]}


# ── Meditation ─────────────────────────────────────────────────────────────────
@router.post("/meditation")
async def log_meditation(req: MeditationEntry, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.fromisoformat(req.date) if req.date else date.today()
    log = MeditationSession(user_id=current_user.id, duration_minutes=req.duration_minutes, session_type=req.session_type, date=today)
    db.add(log); await db.commit()
    return {"message": "Meditation logged", "duration_minutes": req.duration_minutes}


# ── Wellness Summary ───────────────────────────────────────────────────────────
@router.get("/summary")
async def get_wellness_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    since_7 = today - timedelta(days=7)

    mood_r = await db.execute(select(MoodLog).where(MoodLog.user_id == current_user.id, MoodLog.date == today))
    today_mood = mood_r.scalar_one_or_none()

    water_r = await db.execute(select(WaterLog).where(WaterLog.user_id == current_user.id, WaterLog.date == today))
    today_water = water_r.scalar_one_or_none()

    sleep_r = await db.execute(select(SleepLog).where(SleepLog.user_id == current_user.id, SleepLog.date == today))
    today_sleep = sleep_r.scalar_one_or_none()

    mood_avg_r = await db.execute(select(func.avg(MoodLog.mood_score)).where(MoodLog.user_id == current_user.id, MoodLog.date >= since_7))
    avg_mood = round(mood_avg_r.scalar() or 0, 1)

    sleep_avg_r = await db.execute(select(func.avg(SleepLog.hours)).where(SleepLog.user_id == current_user.id, SleepLog.date >= since_7))
    avg_sleep = round(sleep_avg_r.scalar() or 0, 1)

    return {
        "today": {
            "mood": today_mood.mood_score if today_mood else None,
            "water_glasses": today_water.glasses if today_water else 0,
            "water_goal": today_water.goal if today_water else 8,
            "sleep_hours": today_sleep.hours if today_sleep else None,
        },
        "week": {
            "avg_mood": avg_mood,
            "avg_sleep_hours": avg_sleep,
        }
    }

@router.get("/score")
async def get_wellness_score(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    since_7 = today - timedelta(days=7)

    mood_r = await db.execute(select(func.avg(MoodLog.mood_score)).where(MoodLog.user_id == current_user.id, MoodLog.date >= since_7))
    avg_mood = float(mood_r.scalar() or 3)
    mood_score = round((avg_mood / 5) * 100)

    sleep_r = await db.execute(select(func.avg(SleepLog.hours)).where(SleepLog.user_id == current_user.id, SleepLog.date >= since_7))
    avg_sleep = float(sleep_r.scalar() or 6)
    sleep_score = min(100, round((avg_sleep / 8) * 100))

    water_r = await db.execute(select(func.avg(WaterLog.glasses)).where(WaterLog.user_id == current_user.id, WaterLog.date >= since_7))
    avg_water = float(water_r.scalar() or 4)
    water_score = min(100, round((avg_water / 8) * 100))

    overall = round((mood_score + sleep_score + water_score) / 3)
    return {
        "overall_score": overall,
        "components": {"mood": mood_score, "sleep": sleep_score, "water": water_score},
        "trend": "improving" if overall >= 60 else "needs_attention",
        "recommendations": [
            "Drink at least 8 glasses of water daily" if water_score < 75 else "Great hydration!",
            "Aim for 7-9 hours of sleep" if sleep_score < 75 else "Good sleep habits!",
            "Track your mood daily for better insights" if mood_score < 60 else "Mood looks stable!",
        ]
    }

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, timedelta
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.wellness.models import MoodLog, SleepLog, WaterLog, ExerciseLog, MeditationSession
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────
class MoodEntry(BaseModel):
    mood_score: int = Field(..., ge=1, le=5)
    note: Optional[str] = Field(default=None, max_length=1000)
    date: Optional[date] = None

class SleepEntry(BaseModel):
    hours: float = Field(..., gt=0, le=24)
    quality: Optional[int] = Field(default=None, ge=1, le=5)
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=1000)
    date: Optional[date] = None

class WaterEntry(BaseModel):
    glasses: int = Field(..., ge=0, le=50)
    goal: int = Field(default=8, gt=0, le=50)
    date: Optional[date] = None

class ExerciseEntry(BaseModel):
    duration_minutes: int = Field(..., gt=0, le=1440)
    exercise_type: str = Field(..., min_length=1, max_length=100)
    calories_burned: Optional[int] = Field(default=None, ge=0, le=10000)
    note: Optional[str] = Field(default=None, max_length=1000)
    date: Optional[date] = None

class MeditationEntry(BaseModel):
    duration_minutes: int = Field(..., gt=0, le=1440)
    session_type: Optional[str] = Field(default="mindfulness", max_length=50)
    date: Optional[date] = None


# ── Mood ───────────────────────────────────────────────────────────────────────
@router.get("/mood")
async def get_mood(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Alias for /mood/today — frontend calls GET /wellness/mood"""
    result = await db.execute(select(MoodLog).where(MoodLog.user_id == current_user.id, MoodLog.date == date.today()))
    log = result.scalar_one_or_none()
    return {"mood_score": log.mood_score if log else None, "note": log.note if log else None}

@router.post("/mood")
async def log_mood(req: MoodEntry, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = req.date or date.today()
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
@router.get("/sleep")
async def get_sleep(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Alias for /sleep/today — frontend calls GET /wellness/sleep"""
    result = await db.execute(select(SleepLog).where(SleepLog.user_id == current_user.id, SleepLog.date == date.today()))
    log = result.scalar_one_or_none()
    return {"hours": log.hours if log else None, "quality": log.quality if log else None, "bedtime": log.bedtime if log else None, "wake_time": log.wake_time if log else None}

@router.post("/sleep")
async def log_sleep(req: SleepEntry, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = req.date or date.today()
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
@router.get("/water")
async def get_water(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Alias for /water/today — frontend calls GET /wellness/water"""
    result = await db.execute(select(WaterLog).where(WaterLog.user_id == current_user.id, WaterLog.date == date.today()))
    log = result.scalar_one_or_none()
    glasses = log.glasses if log else 0
    goal = log.goal if log else 8
    return {"glasses": glasses, "goal": goal, "remaining": max(0, goal - glasses), "percentage": min(100, round(glasses / goal * 100))}

@router.post("/water")
async def log_water(req: WaterEntry, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = req.date or date.today()
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
    today = req.date or date.today()
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
    today = req.date or date.today()
    log = MeditationSession(user_id=current_user.id, duration_minutes=req.duration_minutes, session_type=req.session_type, date=today)
    db.add(log); await db.commit()
    return {"message": "Meditation logged", "duration_minutes": req.duration_minutes}


# ── Wellness Summary ───────────────────────────────────────────────────────────
@router.get("/summary")
async def get_wellness_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    since_7 = today - timedelta(days=6)

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
            "water_glasses": today_water.glasses if today_water else None,
            "water_goal": today_water.goal if today_water else 8,
            "sleep_hours": today_sleep.hours if today_sleep else None,
        },
        "week": {
            "avg_mood": avg_mood,
            "avg_sleep_hours": avg_sleep,
        }
    }

@router.get("/history")
async def get_wellness_history(
    days: int = Query(default=7, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return date-by-date wellness metrics calculated only from saved logs."""
    today = date.today()
    since = today - timedelta(days=days - 1)

    mood_result = await db.execute(select(MoodLog).where(
        MoodLog.user_id == current_user.id, MoodLog.date >= since, MoodLog.date <= today
    ))
    sleep_result = await db.execute(select(SleepLog).where(
        SleepLog.user_id == current_user.id, SleepLog.date >= since, SleepLog.date <= today
    ))
    water_result = await db.execute(select(WaterLog).where(
        WaterLog.user_id == current_user.id, WaterLog.date >= since, WaterLog.date <= today
    ))

    moods = {row.date: row for row in mood_result.scalars().all()}
    sleeps = {row.date: row for row in sleep_result.scalars().all()}
    waters = {row.date: row for row in water_result.scalars().all()}
    history = []

    for offset in range(days - 1, -1, -1):
        entry_date = today - timedelta(days=offset)
        mood_log = moods.get(entry_date)
        sleep_log = sleeps.get(entry_date)
        water_log = waters.get(entry_date)
        components = []
        if mood_log:
            components.append(min(100, round((mood_log.mood_score / 5) * 100)))
        if sleep_log:
            components.append(min(100, round((sleep_log.hours / 8) * 100)))
        if water_log:
            goal = water_log.goal or 8
            components.append(min(100, round((water_log.glasses / goal) * 100)))

        history.append({
            "date": entry_date.isoformat(),
            "mood_score": mood_log.mood_score if mood_log else None,
            "sleep_hours": sleep_log.hours if sleep_log else None,
            "water_glasses": water_log.glasses if water_log else None,
            "water_goal": water_log.goal if water_log else None,
            "score": round(sum(components) / len(components)) if components else None,
            "tracked_metrics": len(components),
        })

    return {"history": history, "days": days}


@router.get("/score")
async def get_wellness_score(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    since_7 = today - timedelta(days=6)

    mood_r = await db.execute(select(func.avg(MoodLog.mood_score)).where(MoodLog.user_id == current_user.id, MoodLog.date >= since_7))
    avg_mood = mood_r.scalar()
    sleep_r = await db.execute(select(func.avg(SleepLog.hours)).where(SleepLog.user_id == current_user.id, SleepLog.date >= since_7))
    avg_sleep = sleep_r.scalar()
    water_r = await db.execute(
        select(WaterLog.glasses, WaterLog.goal).where(
            WaterLog.user_id == current_user.id, WaterLog.date >= since_7
        )
    )
    water_logs = water_r.all()
    water_scores = [
        min(100, round((glasses / (goal or 8)) * 100))
        for glasses, goal in water_logs
    ]

    components = {
        "mood": round((float(avg_mood) / 5) * 100) if avg_mood is not None else None,
        "sleep": min(100, round((float(avg_sleep) / 8) * 100)) if avg_sleep is not None else None,
        "water": round(sum(water_scores) / len(water_scores)) if water_scores else None,
    }
    available_scores = [score for score in components.values() if score is not None]
    overall = round(sum(available_scores) / len(available_scores)) if available_scores else None
    recommendations = []
    if components["water"] is None or components["water"] < 75:
        recommendations.append("Track your water intake and work toward your daily goal.")
    if components["sleep"] is None or components["sleep"] < 75:
        recommendations.append("Aim for a consistent 7-9 hours of sleep.")
    if components["mood"] is None:
        recommendations.append("Log your mood to see how you are feeling over time.")
    elif components["mood"] < 60:
        recommendations.append("Consider taking a break and reaching out to someone you trust.")
    return {
        "overall_score": overall,
        "components": components,
        "trend": "not_enough_data" if overall is None else ("improving" if overall >= 60 else "needs_attention"),
        "recommendations": recommendations,
    }

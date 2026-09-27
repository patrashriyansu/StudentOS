from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, UserActivity

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_analytics(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    activity_result = await db.execute(
        select(func.count(UserActivity.id)).where(UserActivity.user_id == current_user.id)
    )
    total_activities = activity_result.scalar() or 0
    return {
        "total_activities": total_activities,
        "xp_points": current_user.xp_points,
        "level": current_user.level,
        "streak_days": current_user.streak_days,
        "recent_activity_count": min(total_activities, 10)
    }

@router.get("/academic")
async def get_academic_analytics():
    return {
        "current_semester": 5,
        "cgpa": 8.12,
        "sgpa": 8.64,
        "attendance_overall": 83.6,
        "subjects_enrolled": 6,
        "assignments_completed": 18,
        "assignments_pending": 3,
        "study_hours_this_week": 22.5,
        "study_hours_last_week": 19.0,
        "performance_trend": "improving",
        "semester_history": [
            {"semester": 1, "sgpa": 7.2},
            {"semester": 2, "sgpa": 7.8},
            {"semester": 3, "sgpa": 8.1},
            {"semester": 4, "sgpa": 8.4},
            {"semester": 5, "sgpa": 8.6}
        ]
    }

@router.get("/coding")
async def get_coding_analytics():
    return {
        "total_solved": 146,
        "easy": 45,
        "medium": 78,
        "hard": 23,
        "contests_attended": 24,
        "best_rank": 125,
        "average_rank": 850,
        "current_rating": 1642,
        "peak_rating": 1720,
        "monthly_activity": [
            {"month": "Jul", "solved": 20},
            {"month": "Aug", "solved": 25},
            {"month": "Sep", "solved": 18},
            {"month": "Oct", "solved": 30},
            {"month": "Nov", "solved": 28},
            {"month": "Dec", "solved": 25}
        ],
        "topic_breakdown": [
            {"topic": "Arrays", "solved": 35, "total": 50},
            {"topic": "Strings", "solved": 28, "total": 40},
            {"topic": "Linked Lists", "solved": 20, "total": 30},
            {"topic": "Trees", "solved": 25, "total": 45},
            {"topic": "Dynamic Programming", "solved": 18, "total": 50}
        ]
    }

@router.get("/placement")
async def get_placement_analytics():
    return {
        "total_applications": 12,
        "applications_by_status": {"applied": 5, "screening": 3, "interview": 3, "offer": 1, "rejected": 4},
        "interview_rate": 50.0,
        "offer_rate": 8.3,
        "average_response_time_days": 7,
        "top_companies": ["Google", "Microsoft", "Amazon", "Stripe"],
        "applications_trend": [
            {"month": "Oct", "count": 3},
            {"month": "Nov", "count": 5},
            {"month": "Dec", "count": 4}
        ]
    }

@router.get("/wellness")
async def get_wellness_analytics():
    return {
        "average_mood": 3.4,
        "average_sleep_hours": 7.2,
        "average_water_glasses": 4.5,
        "exercise_days_this_week": 3,
        "wellness_score": 72,
        "mood_trend": [
            {"day": "Mon", "score": 3},
            {"day": "Tue", "score": 4},
            {"day": "Wed", "score": 3},
            {"day": "Thu", "score": 4},
            {"day": "Fri", "score": 3},
            {"day": "Sat", "score": 5},
            {"day": "Sun", "score": 4}
        ]
    }

@router.get("/productivity")
async def get_productivity_analytics():
    return {
        "daily_goal_completion": 68.5,
        "focus_hours_today": 4.5,
        "focus_hours_this_week": 28.0,
        "habits_completed": 7,
        "habits_total": 10,
        "pomodoro_sessions_today": 5,
        "productivity_trend": "improving",
        "daily_breakdown": [
            {"day": "Mon", "focus_hours": 4.0, "tasks_completed": 5},
            {"day": "Tue", "focus_hours": 4.5, "tasks_completed": 6},
            {"day": "Wed", "focus_hours": 3.5, "tasks_completed": 4},
            {"day": "Thu", "focus_hours": 5.0, "tasks_completed": 7},
            {"day": "Fri", "focus_hours": 4.0, "tasks_completed": 5},
            {"day": "Sat", "focus_hours": 6.0, "tasks_completed": 8},
            {"day": "Sun", "focus_hours": 1.0, "tasks_completed": 2}
        ]
    }

@router.get("/insights")
async def get_insights():
    return {
        "top_performing_areas": ["Academic", "Coding"],
        "needs_improvement": ["Wellness", "Exercise"],
        "recommendations": [
            "Increase water intake to 8 glasses daily",
            "Add 30 min exercise to daily routine",
            "Maintain consistent sleep schedule",
            "Practice DSA problems on weak topics"
        ],
        "weekly_goal": "Complete all pending assignments and practice 20 DSA problems",
        "monthly_progress": 72.5
    }

@router.get("/activities")
async def get_recent_activities(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserActivity).where(UserActivity.user_id == current_user.id)
        .order_by(UserActivity.created_at.desc()).limit(20)
    )
    activities = result.scalars().all()
    return [{"id": a.id, "type": a.activity_type, "description": a.description, "xp_earned": a.xp_earned, "created_at": a.created_at.isoformat()} for a in activities]

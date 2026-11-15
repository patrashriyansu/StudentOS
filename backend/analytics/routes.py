from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, UserActivity

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Real-time overview pulling from actual user data."""
    from backend.academics.models import Grade, Subject
    from backend.coding.models import CodingProfile
    from backend.placements.models import Application
    from backend.productivity.models import Task

    # CGPA
    grade_res = await db.execute(select(Grade).where(Grade.user_id == current_user.id))
    grades = grade_res.scalars().all()
    if grades:
        total_credits = sum(g.credits for g in grades)
        cgpa = round(sum(g.grade_point * g.credits for g in grades) / total_credits, 2) if total_credits else 0
    else:
        cgpa = None

    # Problems solved
    cp_res = await db.execute(select(CodingProfile).where(CodingProfile.user_id == current_user.id))
    cp = cp_res.scalar_one_or_none()
    total_problems = cp.total_problems_solved if cp else None

    # Placement applications
    app_res = await db.execute(select(func.count(Application.id)).where(Application.user_id == current_user.id))
    placement_apps = app_res.scalar() or 0

    # Tasks completed
    task_res = await db.execute(
        select(func.count(Task.id)).where(Task.user_id == current_user.id, Task.status == "done")
    )
    tasks_completed = task_res.scalar() or 0

    return {
        "cgpa": cgpa,
        "total_problems_solved": total_problems,
        "placement_apps": placement_apps,
        "tasks_completed": tasks_completed,
        "xp_points": current_user.xp_points,
        "level": current_user.level,
        "streak_days": current_user.streak_days,
    }


@router.get("/dashboard")
async def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    activity_result = await db.execute(
        select(func.count(UserActivity.id)).where(UserActivity.user_id == current_user.id)
    )
    total_activities = activity_result.scalar() or 0
    return {
        "total_activities": total_activities,
        "xp_points": current_user.xp_points,
        "level": current_user.level,
        "streak_days": current_user.streak_days,
        "recent_activity_count": min(total_activities, 10),
    }


@router.get("/activities")
async def get_recent_activities(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserActivity)
        .where(UserActivity.user_id == current_user.id)
        .order_by(UserActivity.created_at.desc())
        .limit(20)
    )
    activities = result.scalars().all()
    return [
        {
            "id": a.id,
            "activity_type": a.activity_type,
            "description": a.description,
            "xp_earned": a.xp_earned,
            "created_at": a.created_at.isoformat(),
        }
        for a in activities
    ]

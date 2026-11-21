from datetime import datetime, timezone, date
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.users.models import User, UserActivity

INDIA_TZ = ZoneInfo("Asia/Kolkata")


async def record_daily_visit(user: User, db: AsyncSession) -> dict:
    """Record one active day per student using the Asia/Kolkata calendar date.

    Locking the user row prevents two simultaneous page loads/devices from
    incrementing the same day's streak twice on PostgreSQL.
    """
    locked_result = await db.execute(
        select(User)
        .where(User.id == user.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    locked_user = locked_result.scalar_one_or_none()
    if locked_user is None:
        return {"streak_days": 0, "last_streak_date": None, "message": "user_not_found"}

    now_utc = datetime.now(timezone.utc)
    today = datetime.now(INDIA_TZ).date().isoformat()
    last = locked_user.last_streak_date

    if last != today:
        if last:
            try:
                gap = (date.fromisoformat(today) - date.fromisoformat(last)).days
            except ValueError:
                gap = 0
            locked_user.streak_days = (
                (locked_user.streak_days or 0) + 1 if gap == 1 else 1
            )
        else:
            locked_user.streak_days = 1

        locked_user.last_streak_date = today
        db.add(UserActivity(
            user_id=locked_user.id,
            activity_type="visit",
            description="Visited StudentOS",
            xp_earned=0,
            created_at=now_utc,
        ))

    locked_user.last_login = now_utc
    await db.commit()
    return {
        "streak_days": locked_user.streak_days or 0,
        "last_streak_date": locked_user.last_streak_date,
        "message": "updated" if last != today else "already_active_today",
    }

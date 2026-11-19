from datetime import datetime, timezone, date
from sqlalchemy.ext.asyncio import AsyncSession
from backend.users.models import User, UserActivity


async def record_daily_visit(user: User, db: AsyncSession) -> dict:
    """Persist one active-day event per user per UTC day and maintain their login streak."""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    last = user.last_streak_date

    if last != today:
        if last:
            try:
                gap = (date.fromisoformat(today) - date.fromisoformat(last)).days
            except ValueError:
                gap = 0
            user.streak_days = (user.streak_days or 0) + 1 if gap == 1 else 1
        else:
            user.streak_days = 1

        user.last_streak_date = today
        db.add(UserActivity(
            user_id=user.id,
            activity_type="visit",
            description="Visited StudentOS",
            xp_earned=0,
            created_at=now,
        ))

    user.last_login = now
    await db.commit()
    return {
        "streak_days": user.streak_days or 0,
        "last_streak_date": user.last_streak_date,
        "message": "updated" if last != today else "already_active_today",
    }

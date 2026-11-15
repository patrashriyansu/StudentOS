import asyncio
import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select

from backend.core.database import async_session
from backend.core.email import email_delivery_configured, send_email
from backend.users.models import EmailReminder, User

logger = logging.getLogger("studentos.reminders")
INDIA_TZ = ZoneInfo("Asia/Kolkata")


def to_utc_datetime(value: str | datetime) -> datetime:
    parsed = datetime.fromisoformat(value) if isinstance(value, str) else value
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=INDIA_TZ)
    return parsed.astimezone(timezone.utc)


async def schedule_email_reminder(
    db,
    *,
    user_id: int,
    title: str,
    message: str,
    remind_at: datetime,
    repeat_interval: str = "none",
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> EmailReminder | None:
    if repeat_interval not in {"none", "daily", "weekly"}:
        raise ValueError("Unsupported reminder recurrence")
    if remind_at.tzinfo is None:
        remind_at = remind_at.replace(tzinfo=INDIA_TZ)
    remind_at = remind_at.astimezone(timezone.utc)
    now = datetime.now(timezone.utc)
    if remind_at <= now:
        remind_at = now + timedelta(minutes=2)
    reminder = EmailReminder(
        user_id=user_id,
        title=title,
        message=message,
        remind_at=remind_at,
        repeat_interval=repeat_interval,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(reminder)
    return reminder


async def process_due_email_reminders() -> int:
    if not email_delivery_configured():
        return 0

    sent_count = 0
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(EmailReminder)
            .where(EmailReminder.is_active.is_(True), EmailReminder.remind_at <= now)
            .order_by(EmailReminder.remind_at.asc())
            .limit(25)
        )
        reminders = result.scalars().all()

        for reminder in reminders:
            user = await db.get(User, reminder.user_id)
            if not user or not user.email:
                reminder.is_active = False
                reminder.last_error = "The reminder owner has no email address."
                continue

            try:
                await send_email(
                    user.email,
                    f"StudentOS reminder: {reminder.title}",
                    f"Hello {user.name},\n\n{reminder.message}\n\n"
                    "You are receiving this because email reminders are enabled for this StudentOS item.",
                )
            except Exception as exc:
                reminder.attempts = (reminder.attempts or 0) + 1
                reminder.last_error = str(exc)[:500]
                if reminder.attempts >= 5:
                    reminder.is_active = False
                    logger.exception("Disabling reminder %s after repeated delivery failures", reminder.id)
                else:
                    reminder.remind_at = now + timedelta(minutes=min(60, 5 * reminder.attempts))
                    logger.warning("Email reminder %s failed; retry %s/5", reminder.id, reminder.attempts)
                continue

            reminder.sent_at = now
            reminder.last_error = None
            reminder.attempts = 0
            sent_count += 1

            if reminder.repeat_interval == "weekly":
                reminder.remind_at = reminder.remind_at + timedelta(days=7)
            elif reminder.repeat_interval == "daily":
                reminder.remind_at = reminder.remind_at + timedelta(days=1)
            else:
                reminder.is_active = False

        await db.commit()

    return sent_count


async def reminder_worker() -> None:
    while True:
        try:
            sent = await process_due_email_reminders()
            if sent:
                logger.info("Sent %s scheduled StudentOS reminder emails", sent)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Scheduled reminder worker failed")
        await asyncio.sleep(60)

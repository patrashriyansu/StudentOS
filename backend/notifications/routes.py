from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, Notification, EmailReminder
from backend.core.email import email_delivery_configured
from backend.notifications.service import to_utc_datetime
from pydantic import BaseModel
from typing import Optional, Literal

router = APIRouter()

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str = "info"



class ReminderCreate(BaseModel):
    title: str
    message: str = ""
    remind_at: str
    repeat_interval: Literal["none", "daily", "weekly"] = "none"


@router.get("/reminders/status")
async def get_reminder_status(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count(EmailReminder.id)).where(
            EmailReminder.user_id == current_user.id,
            EmailReminder.is_active.is_(True),
        )
    )
    return {
        "email_configured": email_delivery_configured(),
        "pending_count": result.scalar() or 0,
    }


@router.get("/reminders")
async def get_reminders(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmailReminder)
        .where(EmailReminder.user_id == current_user.id, EmailReminder.is_active.is_(True))
        .order_by(EmailReminder.remind_at.asc())
    )
    reminders = result.scalars().all()
    return [{
        "id": item.id,
        "title": item.title,
        "message": item.message,
        "remind_at": item.remind_at.isoformat(),
        "repeat_interval": item.repeat_interval,
        "entity_type": item.entity_type,
        "sent_at": item.sent_at.isoformat() if item.sent_at else None,
        "last_error": item.last_error,
    } for item in reminders]


@router.post("/reminders")
async def create_reminder(
    req: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not req.title.strip():
        raise HTTPException(status_code=422, detail="Reminder title is required")
    try:
        remind_at = to_utc_datetime(req.remind_at)
    except ValueError:
        raise HTTPException(status_code=422, detail="Enter a valid reminder date and time")
    if remind_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Reminder must be scheduled in the future")
    reminder = EmailReminder(
        user_id=current_user.id,
        title=req.title.strip(),
        message=req.message.strip(),
        remind_at=remind_at,
        repeat_interval=req.repeat_interval,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return {
        "id": reminder.id,
        "message": "Email reminder queued",
        "email_configured": email_delivery_configured(),
    }


@router.delete("/reminders/{reminder_id}")
async def cancel_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmailReminder).where(
            EmailReminder.id == reminder_id,
            EmailReminder.user_id == current_user.id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.is_active = False
    await db.commit()
    return {"message": "Reminder cancelled"}


@router.get("")
@router.get("/")
async def get_notifications(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc()).limit(50)
    )
    notifications = result.scalars().all()
    if not notifications:
        return []
    return [{"id": n.id, "title": n.title, "message": n.message, "type": n.notification_type, "read": n.is_read, "created_at": n.created_at.isoformat()} for n in notifications]

@router.get("/unread-count")
async def get_unread_count(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id, Notification.is_read == False
        )
    )
    return {"unread_count": result.scalar() or 0}

@router.post("/{notification_id}/read")
async def mark_as_read(notification_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id)
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404)
    notification.is_read = True
    await db.commit()
    return {"message": "Marked as read"}

@router.post("/mark-all-read")
async def mark_all_read(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}

@router.post("/create")
async def create_notification(req: NotificationCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    notification = Notification(
        user_id=current_user.id,
        title=req.title,
        message=req.message,
        notification_type=req.notification_type
    )
    db.add(notification)
    await db.commit()
    return {"message": "Notification created", "id": notification.id}

@router.get("/settings")
async def get_notification_settings(current_user: User = Depends(get_current_user)):
    return {
        "email_notifications": email_delivery_configured(),
        "push_notifications": True,
        "in_app_notifications": True,
        "reminders": email_delivery_configured(),
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "08:00"
    }

@router.post("/subscribe")
async def subscribe_push(token: str, current_user: User = Depends(get_current_user)):
    return {"message": "Push subscription updated"}

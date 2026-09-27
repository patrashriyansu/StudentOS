from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from datetime import datetime, timezone
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User, Notification
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str = "info"

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
        "email_notifications": True,
        "push_notifications": True,
        "in_app_notifications": True,
        "reminders": True,
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "08:00"
    }

@router.post("/subscribe")
async def subscribe_push(token: str, current_user: User = Depends(get_current_user)):
    return {"message": "Push subscription updated"}

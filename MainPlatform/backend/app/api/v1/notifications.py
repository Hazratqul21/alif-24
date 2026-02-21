"""
Notifications Router - In-app xabarnomalar
Polling orqali frontend har 30s da so'raydi
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from datetime import datetime, timezone

from shared.database import get_db
from shared.database.models import User
from shared.database.models.in_app_notification import InAppNotification, InAppNotifType
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/notifications")
async def get_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Foydalanuvchining xabarnomalarini olish (polling)"""
    stmt = select(InAppNotification).where(
        InAppNotification.user_id == current_user.id
    )
    if unread_only:
        stmt = stmt.where(InAppNotification.is_read == False)

    stmt = stmt.order_by(InAppNotification.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    notifications = res.scalars().all()

    # O'qilmagan soni
    unread_res = await db.execute(
        select(func.count(InAppNotification.id)).where(
            InAppNotification.user_id == current_user.id,
            InAppNotification.is_read == False,
        )
    )
    unread_count = unread_res.scalar() or 0

    return {
        "success": True,
        "data": {
            "notifications": [n.to_dict() for n in notifications],
            "unread_count": unread_count,
            "total": len(notifications),
        }
    }


@router.post("/notifications/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xabarnomani o'qilgan deb belgilash"""
    res = await db.execute(
        select(InAppNotification).where(
            InAppNotification.id == notification_id,
            InAppNotification.user_id == current_user.id,
        )
    )
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Xabarnoma topilmadi")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    await db.commit()
    return {"success": True, "message": "O'qilgan deb belgilandi"}


@router.post("/notifications/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Barcha xabarnomalarni o'qilgan deb belgilash"""
    await db.execute(
        update(InAppNotification)
        .where(
            InAppNotification.user_id == current_user.id,
            InAppNotification.is_read == False,
        )
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"success": True, "message": "Barcha xabarnomalar o'qildi"}


@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xabarnomani o'chirish"""
    res = await db.execute(
        select(InAppNotification).where(
            InAppNotification.id == notification_id,
            InAppNotification.user_id == current_user.id,
        )
    )
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Xabarnoma topilmadi")

    await db.delete(notif)
    await db.commit()
    return {"success": True, "message": "Xabarnoma o'chirildi"}


@router.get("/notifications/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Faqat o'qilmagan xabarnomalar soni (tez polling uchun)"""
    res = await db.execute(
        select(func.count(InAppNotification.id)).where(
            InAppNotification.user_id == current_user.id,
            InAppNotification.is_read == False,
        )
    )
    count = res.scalar() or 0
    return {"success": True, "data": {"unread_count": count}}

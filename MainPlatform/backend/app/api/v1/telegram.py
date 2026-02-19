from fastapi import APIRouter, Depends, Request, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import os

from shared.database import get_db
from shared.database.models.telegram import TelegramUser
from shared.services.telegram_bot_service import TelegramBotService

router = APIRouter(tags=["telegram"])
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "alif24_rahbariyat26!")


class BroadcastRequest(BaseModel):
    message: str
    parse_mode: Optional[str] = "Markdown"
    filter_type: Optional[str] = None  # None/"all", "students", "parents", "teachers"


async def verify_broadcast_admin(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """Broadcast uchun admin tekshiruvi"""
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin authentication failed")
    return True


@router.post("/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receives updates from Telegram Webhook"""
    if not TELEGRAM_BOT_TOKEN:
        return {"status": "error", "message": "Bot token not configured"}
    
    try:
        update_data = await request.json()
        service = TelegramBotService(db, TELEGRAM_BOT_TOKEN)
        await service.process_webhook_update(update_data)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/broadcast")
async def broadcast_message(
    data: BroadcastRequest,
    admin: bool = Depends(verify_broadcast_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Barcha Telegram foydalanuvchilarga ommaviy xabar jo'natish (admin only).
    
    Headers: X-Admin-Key: admin secret key
    Body: { "message": "Xabar matni", "parse_mode": "Markdown", "filter_type": "all" }
    filter_type: "all" (hammaga), "students", "parents", "teachers"
    """
    if not TELEGRAM_BOT_TOKEN:
        return {"status": "error", "message": "Bot token not configured"}
    
    service = TelegramBotService(db, TELEGRAM_BOT_TOKEN)
    result = await service.broadcast_message(
        message=data.message,
        parse_mode=data.parse_mode,
        filter_type=data.filter_type
    )
    return result


@router.get("/stats")
async def telegram_stats(
    admin: bool = Depends(verify_broadcast_admin),
    db: AsyncSession = Depends(get_db)
):
    """Telegram bot statistikasi (admin only)"""
    total_users = await db.scalar(select(func.count(TelegramUser.id)))
    active_notify = await db.scalar(
        select(func.count(TelegramUser.id)).filter(TelegramUser.notifications_enabled == True)
    )
    linked_users = await db.scalar(
        select(func.count(TelegramUser.id)).filter(TelegramUser.user_id.isnot(None))
    )
    
    return {
        "total_telegram_users": total_users or 0,
        "notifications_enabled": active_notify or 0,
        "linked_to_platform": linked_users or 0,
        "unlinked": (total_users or 0) - (linked_users or 0)
    }

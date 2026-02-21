from fastapi import APIRouter, Depends, Request, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import os
import httpx
import logging

from shared.database import get_db
from shared.database.models.telegram import TelegramUser
from shared.services.telegram_bot_service import TelegramBotService
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["telegram"])
TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
ADMIN_SECRET_KEY = settings.ADMIN_SECRET_KEY


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


@router.post("/register-commands")
async def register_bot_commands(
    admin: bool = Depends(verify_broadcast_admin),
    db: AsyncSession = Depends(get_db)
):
    """Telegram menyusida buyruqlarni ro'yxatdan o'tkazish (bir marta chaqirish kifoya)"""
    if not TELEGRAM_BOT_TOKEN:
        return {"status": "error", "message": "Bot token not configured"}
    
    service = TelegramBotService(db, TELEGRAM_BOT_TOKEN)
    success = await service.register_bot_commands()
    return {"status": "ok" if success else "error"}


@router.post("/set-webhook")
async def set_webhook(
    admin: bool = Depends(verify_broadcast_admin),
):
    """
    Telegram webhook URL ni o'rnatish.
    Bir marta chaqirish kifoya — Telegram eslab qoladi.
    POST /api/v1/telegram/set-webhook
    Headers: X-Admin-Key: alif24_rahbariyat26!
    """
    if not TELEGRAM_BOT_TOKEN:
        return {"status": "error", "message": "Bot token not configured"}
    
    webhook_url = "https://alif24.uz/api/v1/telegram/webhook"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook",
                json={"url": webhook_url, "drop_pending_updates": True},
                timeout=15.0
            )
            data = response.json()
            logger.info(f"Telegram setWebhook response: {data}")
            return {"status": "ok" if data.get("ok") else "error", "data": data}
    except Exception as e:
        logger.error(f"setWebhook error: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/delete-webhook")
async def delete_webhook(
    admin: bool = Depends(verify_broadcast_admin),
):
    """Telegram webhook ni o'chirish (polling rejimiga o'tish uchun)"""
    if not TELEGRAM_BOT_TOKEN:
        return {"status": "error", "message": "Bot token not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteWebhook",
                json={"drop_pending_updates": True},
                timeout=15.0
            )
            data = response.json()
            return {"status": "ok" if data.get("ok") else "error", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/webhook-info")
async def get_webhook_info(
    admin: bool = Depends(verify_broadcast_admin),
):
    """Joriy webhook holatini ko'rish"""
    if not TELEGRAM_BOT_TOKEN:
        return {"status": "error", "message": "Bot token not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getWebhookInfo",
                timeout=15.0
            )
            return response.json()
    except Exception as e:
        return {"status": "error", "message": str(e)}


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

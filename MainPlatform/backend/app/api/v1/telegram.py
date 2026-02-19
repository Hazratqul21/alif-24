from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
import os

from shared.database import get_db
from shared.services.telegram_bot_service import TelegramBotService

router = APIRouter(tags=["telegram"])
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

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

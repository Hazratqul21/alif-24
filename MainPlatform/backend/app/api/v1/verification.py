"""
Phone Verification API Endpoints
Telefon raqamini Telegram orqali tasdiqlash uchun API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional
from shared.database import get_db
from shared.services.telegram_bot_service import TelegramBotService
from app.core.config import settings

router = APIRouter(tags=["verification"])

TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN


class SendCodeRequest(BaseModel):
    """Request to send verification code"""
    phone: str = Field(..., description="Phone number in format +998XXXXXXXXX")
    lang: str = Field(default="uz", description="Language code: uz, ru, en")
    
    class Config:
        json_schema_extra = {
            "example": {
                "phone": "+998901234567",
                "lang": "uz"
            }
        }


class VerifyCodeRequest(BaseModel):
    """Request to verify code"""
    phone: str = Field(..., description="Phone number")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    lang: str = Field(default="uz", description="Language code: uz, ru, en")
    
    class Config:
        json_schema_extra = {
            "example": {
                "phone": "+998901234567",
                "code": "123456",
                "lang": "uz"
            }
        }


class VerificationResponse(BaseModel):
    """Verification response"""
    success: bool
    message: str
    expires_in: Optional[int] = None  # Seconds until code expires


@router.post("/send-code", response_model=VerificationResponse)
async def send_verification_code(
    request: SendCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send verification code to user's Telegram
    
    The user must have previously started the Telegram bot and linked their phone number.
    A 6-digit code will be sent via Telegram message.
    """
    import re
    
    # Validate phone format
    pattern = r'^\+998\d{9}$'
    if not re.match(pattern, request.phone):
        return VerificationResponse(
            success=False,
            message="Noto'g'ri telefon raqam format. Format: +998901234567",
            expires_in=None
        )
    
    if not TELEGRAM_BOT_TOKEN:
        return VerificationResponse(
            success=False,
            message="Telegram bot token not configured",
            expires_in=None
        )
    
    service = TelegramBotService(db, TELEGRAM_BOT_TOKEN)
    result = await service.send_verification_code(request.phone, request.lang)
    
    return VerificationResponse(**result)


@router.post("/verify-code", response_model=VerificationResponse)
async def verify_code(
    request: VerifyCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify the code entered by user
    
    Validates the 6-digit code sent to Telegram.
    """
    if not TELEGRAM_BOT_TOKEN:
        return VerificationResponse(
            success=False,
            message="Telegram bot token not configured",
            expires_in=None
        )
    
    service = TelegramBotService(db, TELEGRAM_BOT_TOKEN)
    result = await service.verify_code(request.phone, request.code)
    
    return VerificationResponse(**result)


@router.get("/check-phone/{phone}")
async def check_phone_linked(
    phone: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if phone number is linked to Telegram
    
    Returns status without sending code.
    """
    from shared.database.models import TelegramUser
    
    stmt = select(TelegramUser).filter(TelegramUser.phone == phone)
    result = await db.execute(stmt)
    tg_user = result.scalar_one_or_none()
    
    return {
        "phone": phone,
        "linked": tg_user is not None,
        "telegram_username": tg_user.telegram_username if tg_user else None,
        "notifications_enabled": tg_user.notifications_enabled if tg_user else False
    }

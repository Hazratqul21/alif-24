"""
Telegram Bot Service
Alif24 Platform - Telegram Bot integratsiyasi
"""

import logging
import httpx
import re
import os
import json
import random
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

logger = logging.getLogger(__name__)

class TelegramBotService:
    """
    Telegram Bot Service
    - Verification codes
    - Parent notifications  
    - Webhook processing
    - Broadcast messages
    """

    def __init__(self, db: AsyncSession, bot_token: Optional[str] = None):
        self.db = db
        self.bot_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.openai_model = "gpt-4o-mini"
        self.openai_fallback_model = "gpt-3.5-turbo"
        self._chat_history: Dict[str, List[Dict]] = {}

    async def send_message(self, chat_id: str, text: str, parse_mode: str = "Markdown") -> bool:
        """Telegram'ga xabar jo'natish"""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{self.api_url}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": parse_mode,
                    },
                )
                data = resp.json()
                if not data.get("ok"):
                    logger.error(f"Telegram send error: {data}")
                return data.get("ok", False)
        except Exception as e:
            logger.error(f"Telegram send_message error: {e}")
            return False

    async def send_verification_code(self, phone: str, lang: str = "uz") -> dict:
        """Telefon raqamiga verification code jo'natish va kodni qaytarish"""
        from shared.database.models.telegram import TelegramUser, PhoneVerification
        
        # Telefon raqamini normalizatsiya
        clean_phone = re.sub(r'[^\d]', '', phone)
        if not clean_phone.startswith('998') and len(clean_phone) == 9:
            clean_phone = '998' + clean_phone
        
        # Telegram user topish (model field: phone)
        result = await self.db.execute(
            select(TelegramUser).where(TelegramUser.phone.contains(clean_phone[-9:]))
        )
        tg_user = result.scalar_one_or_none()
        
        if not tg_user:
            return {
                "success": False,
                "message": "Bu telefon raqam Telegram botga ulanmagan. Avval @Alif24Bot ga /start yuboring.",
                "expires_in": None,
            }
        
        # PhoneVerification orqali kod saqlash
        verification = PhoneVerification.create_for_phone(phone)
        verification.telegram_chat_id = tg_user.telegram_chat_id
        self.db.add(verification)
        await self.db.commit()
        
        code = verification.code
        
        messages = {
            "uz": f"🔐 *Alif24 Tasdiqlash Kodi*\n\nSizning kodingiz: `{code}`\n\n⏰ Kod 5 daqiqa amal qiladi.",
            "ru": f"🔐 *Alif24 Код подтверждения*\n\nВаш код: `{code}`\n\n⏰ Код действует 5 минут.",
            "en": f"🔐 *Alif24 Verification Code*\n\nYour code: `{code}`\n\n⏰ Code expires in 5 minutes.",
        }
        msg = messages.get(lang, messages["uz"])
        
        sent = await self.send_message(str(tg_user.telegram_chat_id), msg)
        
        if sent:
            return {
                "success": True,
                "message": "Tasdiqlash kodi Telegram orqali yuborildi",
                "expires_in": 300,
            }
        return {
            "success": False,
            "message": "Telegram'ga xabar yuborib bo'lmadi. Qayta urinib ko'ring.",
            "expires_in": None,
        }

    async def verify_code(self, phone: str, code: str) -> dict:
        """Verification kodni tekshirish (PhoneVerification table orqali)"""
        from shared.database.models.telegram import PhoneVerification
        from sqlalchemy import desc
        
        # Oxirgi verification kodni topish
        result = await self.db.execute(
            select(PhoneVerification)
            .where(PhoneVerification.phone == phone)
            .where(PhoneVerification.verified == False)
            .order_by(desc(PhoneVerification.created_at))
            .limit(1)
        )
        verification = result.scalar_one_or_none()
        
        if not verification:
            return {"success": False, "message": "Kod topilmadi. Qayta yuborish kerak."}
        
        if verification.is_expired():
            return {"success": False, "message": "Kod muddati tugagan. Qayta yuborish kerak."}
        
        if not verification.can_attempt():
            return {"success": False, "message": "Juda ko'p urinish. Qayta yuborish kerak."}
        
        if verification.verify(code):
            await self.db.commit()
            return {"success": True, "message": "Kod tasdiqlandi!"}
        
        await self.db.commit()  # attempts counter saqlash
        return {"success": False, "message": "Noto'g'ri kod"}

    async def process_webhook_update(self, update_data: dict) -> None:
        """Telegram webhook update ni qayta ishlash"""
        from shared.database.models.telegram import TelegramUser
        
        message = update_data.get("message")
        if not message:
            return
        
        chat = message.get("chat", {})
        chat_id = str(chat.get("id", ""))
        text = message.get("text", "")
        contact = message.get("contact")
        
        if not chat_id:
            return
        
        # /start komandasi
        if text == "/start":
            await self._handle_start(chat_id, chat)
            return
        
        # Kontakt ulashish
        if contact:
            await self._handle_contact(chat_id, contact)
            return
        
        # /help
        if text == "/help":
            help_text = (
                "📚 *Alif24 Bot Buyruqlari:*\n\n"
                "/start - Botni ishga tushirish\n"
                "/help - Yordam\n"
                "/profile - Profilingiz\n\n"
                "📱 Telefon raqamingizni ulashing — platform bilan bog'lanish uchun."
            )
            await self.send_message(chat_id, help_text)
            return
        
        # /profile
        if text == "/profile":
            result = await self.db.execute(
                select(TelegramUser).where(TelegramUser.telegram_chat_id == chat_id)
            )
            tg_user = result.scalar_one_or_none()
            if tg_user:
                profile_text = (
                    f"👤 *Sizning profilingiz:*\n\n"
                    f"📱 Telefon: {tg_user.phone or 'Ulashmagan'}\n"
                    f"🔗 Platform: {'Ulangan ✅' if tg_user.user_id else 'Ulanmagan ❌'}\n"
                    f"🔔 Bildirishnomalar: {'Yoqilgan ✅' if tg_user.notifications_enabled else 'O\\'chirilgan ❌'}"
                )
            else:
                profile_text = "Profilingiz topilmadi. /start ni bosing."
            await self.send_message(chat_id, profile_text)
            return

    async def _handle_start(self, chat_id: str, chat: dict):
        """Handle /start command"""
        from shared.database.models.telegram import TelegramUser
        
        # Foydalanuvchini saqlash/yangilash
        result = await self.db.execute(
            select(TelegramUser).where(TelegramUser.telegram_chat_id == chat_id)
        )
        tg_user = result.scalar_one_or_none()
        
        if not tg_user:
            tg_user = TelegramUser(
                telegram_chat_id=chat_id,
                telegram_first_name=chat.get("first_name", ""),
                telegram_last_name=chat.get("last_name", ""),
                telegram_username=chat.get("username", ""),
                notifications_enabled=True,
            )
            self.db.add(tg_user)
            await self.db.commit()
        
        welcome = (
            "👋 *Salom! Alif24 platformasiga xush kelibsiz!*\n\n"
            "📱 Iltimos, telefon raqamingizni ulashing — "
            "platformadagi hisobingiz bilan bog'lash uchun.\n\n"
            "Quyidagi tugmani bosing 👇"
        )
        
        # Kontakt so'rash tugmasi
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                await client.post(
                    f"{self.api_url}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": welcome,
                        "parse_mode": "Markdown",
                        "reply_markup": {
                            "keyboard": [[{
                                "text": "📱 Telefon raqamni ulashish",
                                "request_contact": True
                            }]],
                            "resize_keyboard": True,
                            "one_time_keyboard": True,
                        },
                    },
                )
        except Exception as e:
            logger.error(f"Start message error: {e}")

    async def _handle_contact(self, chat_id: str, contact: dict):
        """Handle shared contact"""
        from shared.database.models.telegram import TelegramUser
        
        phone = contact.get("phone_number", "")
        if not phone:
            return
        
        # Normalize phone
        clean_phone = re.sub(r'[^\d]', '', phone)
        
        result = await self.db.execute(
            select(TelegramUser).where(TelegramUser.telegram_chat_id == chat_id)
        )
        tg_user = result.scalar_one_or_none()
        
        if tg_user:
            tg_user.phone = clean_phone
            await self.db.commit()
            await self.send_message(
                chat_id,
                f"✅ Telefon raqam saqlandi: +{clean_phone}\n\n"
                "Endi platformada ro'yxatdan o'tishda shu raqamni ishlating."
            )
        else:
            await self.send_message(chat_id, "Xatolik. Iltimos /start ni qayta bosing.")

    async def broadcast_message(
        self,
        message: str,
        parse_mode: str = "Markdown",
        filter_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Barcha Telegram foydalanuvchilarga xabar jo'natish"""
        from shared.database.models.telegram import TelegramUser
        
        query = select(TelegramUser).where(TelegramUser.notifications_enabled == True)
        result = await self.db.execute(query)
        users = result.scalars().all()
        
        sent = 0
        failed = 0
        
        for user in users:
            try:
                success = await self.send_message(str(user.telegram_chat_id), message, parse_mode)
                if success:
                    sent += 1
                else:
                    failed += 1
            except Exception:
                failed += 1
        
        return {
            "status": "ok",
            "total_users": len(users),
            "sent": sent,
            "failed": failed,
        }

    async def register_bot_commands(self) -> bool:
        """Telegram menyusida buyruqlarni ro'yxatdan o'tkazish"""
        commands = [
            {"command": "start", "description": "Botni ishga tushirish"},
            {"command": "help", "description": "Yordam"},
            {"command": "profile", "description": "Mening profilim"},
        ]
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{self.api_url}/setMyCommands",
                    json={"commands": commands},
                )
                data = resp.json()
                return data.get("ok", False)
        except Exception as e:
            logger.error(f"Register commands error: {e}")
            return False
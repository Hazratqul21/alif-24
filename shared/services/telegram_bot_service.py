"""
Telegram Bot Service - OTP, Notifications, AI Chatbot, and Commands
Alif24 Platform - Telegram bot integration

Telefon tasdiqlash, xabarnomalar, AI chatbot va boshqa bot funksiyalari
"""

import logging
import httpx
import re
import os
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc

from shared.database.models import PhoneVerification, TelegramUser, User, StudentProfile

logger = logging.getLogger(__name__)

# Alif24 haqida system prompt (AI chatbot uchun)
ALIF24_SYSTEM_PROMPT = """Sen Alif24 ta'lim platformasining yordamchi botisan. Quyidagi ma'lumotlar asosida foydalanuvchilarga yordam ber:

🏫 Alif24 — bu O'zbekistondagi bolalar va ta'lim tashkilotlari uchun AI-asoslangan zamonaviy ta'lim platformasi.

📚 Platformaning asosiy bo'limlari:
1. SmartKids AI — Sun'iy intellekt yordamida interaktiv o'qitish (4-7 yosh)
2. MathKids AI — Matematika masalalarini AI yordamida yechish
3. Harf — O'zbek, Rus va Ingliz alifbolarini o'rganish
4. TestAI — AI yordamida test yaratish va yechish
5. Live Quiz — Jonli viktorinalar o'qituvchi va o'quvchilar uchun
6. Games — Ta'limiy o'yinlar (Math Monster, Letter Memory)
7. CRM — Ta'lim tashkilotlari uchun boshqaruv tizimi
8. Olimp — Olimpiada masalalari va musobaqalar
9. Lessions — Video darslar va ertaklar

👥 Rollar:
- O'quvchi (Student) — o'rganish, o'yinlar, testlar
- O'qituvchi (Teacher) — dars yaratish, quiz o'tkazish
- Ota-ona (Parent) — bolaning progressini kuzatish
- Ta'lim tashkiloti (Organization) — B2B, maktab/o'quv markazi boshqaruvi

🌐 Tillar: O'zbek, Rus, Ingliz
📱 Veb-sayt: ali24.uz

Qoidalar:
- Doim o'zbek tilida javob ber (agar boshqa tilda so'ralmasa)
- Qisqa va aniq javoblar ber
- Agar bilmagan savolingiz bo'lsa, shunday deb ayting
- Doim do'stona va pozitiv bo'l
- Texnik muammolar bo'lsa, admin bilan bog'lanishni tavsiya qil
"""


class TelegramBotService:
    """
    Telegram Bot Service for Alif24 Platform
    - OTP verification via Telegram
    - User notifications
    - AI Chatbot (OpenAI GPT-4)
    - Parent reports
    - Achievement alerts
    """
    
    def __init__(self, db: AsyncSession, bot_token: Optional[str] = None):
        self.db = db
        self.bot_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_TOKEN_NOT_SET")
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4")
        # Chat tarixi (xotirada, oxirgi 10 ta xabar)
        self._chat_history: Dict[str, List[Dict]] = {}
    
    async def send_verification_code(self, phone: str, lang: str = "uz") -> Dict[str, Any]:
        """
        Send verification code to user's Telegram
        """
        # Validate phone format
        if not self._validate_phone(phone):
            return {"success": False, "message": "Noto'g'ri telefon format"}
        
        # Find Telegram user by phone
        stmt = select(TelegramUser).filter(TelegramUser.phone == phone)
        result = await self.db.execute(stmt)
        tg_user = result.scalar_one_or_none()
        
        if not tg_user:
            return {
                "success": False, 
                "message": "Bu raqam Telegram bot bilan bog'lanmagan. Iltimos, avval @Alif24Bot ni ishga tushuring."
            }
        
        # Create or update verification
        stmt = select(PhoneVerification).filter(
            PhoneVerification.phone == phone,
            PhoneVerification.verified == False
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            await self.db.delete(existing)
            await self.db.commit()
        
        # Create new verification
        verification = PhoneVerification.create_for_phone(phone, expires_minutes=5)
        verification.telegram_chat_id = tg_user.telegram_chat_id
        
        self.db.add(verification)
        await self.db.commit()
        
        # Send message via Telegram
        messages = {
            "uz": f"🔐 Alif24 Platformasi uchun tasdiqlash kodi: {verification.code}\n\nKod 5 daqiqa davomida amal qiladi.",
            "ru": f"🔐 Код подтверждения для Alif24: {verification.code}\n\nКод действителен 5 минут.",
            "en": f"🔐 Alif24 verification code: {verification.code}\n\nCode valid for 5 minutes."
        }
        
        message_text = messages.get(lang, messages["uz"])
        
        try:
            success = await self._send_message(tg_user.telegram_chat_id, message_text)
            
            if success:
                return {
                    "success": True,
                    "message": "Tasdiqlash kodi Telegram'ga yuborildi",
                    "expires_in": 300  # 5 minutes
                }
            else:
                return {
                    "success": False,
                    "message": "Xabar yuborishda xatolik. Iltimos, keyinroq urinib ko'ring."
                }
                
        except Exception as e:
            logger.error(f"Error sending verification: {e}")
            return {
                "success": False,
                "message": "Xatolik yuz berdi"
            }
    
    async def verify_code(self, phone: str, code: str) -> Dict[str, Any]:
        """
        Verify the code entered by user
        """
        stmt = select(PhoneVerification).filter(
            PhoneVerification.phone == phone,
            PhoneVerification.verified == False
        ).order_by(desc(PhoneVerification.created_at)).limit(1)
        
        result = await self.db.execute(stmt)
        verification = result.scalar_one_or_none()
        
        if not verification:
            return {"success": False, "message": "Tasdiqlash kodi topilmadi"}
        
        if verification.is_expired():
            return {"success": False, "message": "Kod muddati tugagan"}
        
        if verification.attempts >= verification.max_attempts:
            return {"success": False, "message": "Urinishlar soni tugagan"}
        
        if verification.verify(code):
            await self.db.commit()
            
            # Link Telegram user to platform user if exists
            stmt = select(TelegramUser).filter(TelegramUser.phone == phone)
            result = await self.db.execute(stmt)
            tg_user = result.scalar_one_or_none()
            
            if tg_user:
                stmt = select(User).filter(User.phone == phone)
                result = await self.db.execute(stmt)
                user = result.scalar_one_or_none()
                
                if user and not tg_user.user_id:
                    tg_user.user_id = user.id
                    await self.db.commit()
            
            return {"success": True, "message": "Tasdiqlash muvaffaqiyatli"}
        else:
            await self.db.commit()  # Save attempt count
            remaining = verification.max_attempts - verification.attempts
            return {
                "success": False, 
                "message": f"Noto'g'ri kod. {remaining} urinish qoldi."
            }
    
    async def send_notification(self, chat_id: str, message: str) -> bool:
        """Send notification to Telegram user"""
        return await self._send_message(chat_id, message)
    
    async def send_parent_report(self, chat_id: str, student_name: str, report_data: Dict) -> bool:
        """
        Send daily/weekly progress report to parent via Telegram
        """
        message = f"""
📊 *{student_name} - Kunlik Hisobot*

📚 O'qilgan darslar: {report_data.get('lessons_completed', 0)}
🎮 O'ynalgan o'yinlar: {report_data.get('games_played', 0)}
⭐ To'plangan tangalar: {report_data.get('coins_earned', 0)}
⏱ O'quv vaqti: {report_data.get('study_time', 0)} daqiqa

Keep up the good work! 🌟
"""
        return await self._send_message(chat_id, message, parse_mode="Markdown")
    
    async def send_achievement_alert(self, chat_id: str, student_name: str, achievement_name: str) -> bool:
        """Send achievement unlocked notification"""
        message = f"""
🏆 *Yangi Yutuq!*

{student_name} *{achievement_name}* yutug'ini qo'lga kiritdi!

Tabriklaymiz! 🎉
"""
        return await self._send_message(chat_id, message, parse_mode="Markdown")
    
    async def link_phone_to_telegram(self, phone: str, telegram_chat_id: str, 
                                       username: Optional[str] = None,
                                       first_name: Optional[str] = None,
                                       last_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Link phone number to Telegram account when user starts bot
        """
        # Check if already linked
        stmt = select(TelegramUser).filter(TelegramUser.telegram_chat_id == telegram_chat_id)
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update phone if changed
            existing.phone = phone
            existing.telegram_username = username
            existing.telegram_first_name = first_name
            existing.telegram_last_name = last_name
            existing.last_interaction_at = datetime.now(timezone.utc)
        else:
            # Create new link
            tg_user = TelegramUser(
                telegram_chat_id=telegram_chat_id,
                telegram_username=username,
                telegram_first_name=first_name,
                telegram_last_name=last_name,
                phone=phone,
                last_interaction_at=datetime.now(timezone.utc)
            )
            self.db.add(tg_user)
        
        await self.db.commit()
        
        return {
            "success": True,
            "message": "Telefon raqami muvaffaqiyatli bog'landi"
        }
    
    async def _get_ai_response(self, chat_id: str, user_message: str) -> str:
        """
        OpenAI GPT-4 orqali foydalanuvchi savoliga javob olish.
        Chat tarixini saqlaydi (oxirgi 10 ta xabar).
        """
        if not self.openai_api_key or self.openai_api_key == "":
            return "⚠️ AI xizmati hozirda mavjud emas. Iltimos, keyinroq urinib ko'ring."
        
        # Chat tarixini olish yoki yangisini yaratish
        if chat_id not in self._chat_history:
            self._chat_history[chat_id] = []
        
        history = self._chat_history[chat_id]
        
        # Foydalanuvchi xabarini tarixga qo'shish
        history.append({"role": "user", "content": user_message})
        
        # Oxirgi 10 ta xabarni saqlash (xotira uchun)
        if len(history) > 10:
            history = history[-10:]
            self._chat_history[chat_id] = history
        
        # OpenAI API ga so'rov
        messages = [
            {"role": "system", "content": ALIF24_SYSTEM_PROMPT},
            *history
        ]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.openai_model,
                        "messages": messages,
                        "max_tokens": 500,
                        "temperature": 0.7,
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    ai_reply = data["choices"][0]["message"]["content"]
                    
                    # AI javobini tarixga qo'shish
                    history.append({"role": "assistant", "content": ai_reply})
                    self._chat_history[chat_id] = history
                    
                    return ai_reply
                else:
                    logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                    return "⚠️ AI javob berishda xatolik yuz berdi. Keyinroq urinib ko'ring."
                    
        except httpx.TimeoutException:
            return "⏳ Javob olishda kutish vaqti tugadi. Iltimos, qayta urinib ko'ring."
        except Exception as e:
            logger.error(f"AI response error: {e}")
            return "⚠️ Texnik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
    
    async def _send_message(self, chat_id: str, message: str, parse_mode: Optional[str] = None) -> bool:
        """Internal method to send Telegram message"""
        try:
            payload = {
                "chat_id": chat_id,
                "text": message
            }
            if parse_mode:
                payload["parse_mode"] = parse_mode
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/sendMessage",
                    json=payload,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    return True
                else:
                    logger.error(f"Telegram API error: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return False
    
    def _validate_phone(self, phone: str) -> bool:
        """Validate Uzbek phone number format"""
        pattern = r'^\+998\d{9}$'
        return bool(re.match(pattern, phone))
    
    async def process_webhook_update(self, update: Dict[str, Any]) -> None:
        """
        Process incoming Telegram webhook update
        Handles /start command, phone linking, and AI chatbot
        """
        try:
            message = update.get("message", {})
            if not message:
                return
                
            chat_id = str(message.get("chat", {}).get("id"))
            text = message.get("text", "")
            username = message.get("from", {}).get("username")
            first_name = message.get("from", {}).get("first_name")
            last_name = message.get("from", {}).get("last_name")
            
            if not text:
                return
            
            # Update last interaction
            stmt = select(TelegramUser).filter(TelegramUser.telegram_chat_id == chat_id)
            result = await self.db.execute(stmt)
            tg_user = result.scalar_one_or_none()
            
            if tg_user:
                tg_user.last_interaction_at = datetime.now(timezone.utc)
                await self.db.commit()
            
            # Handle /start command
            if text.startswith("/start"):
                parts = text.split()
                if len(parts) > 1:
                    # Phone number passed as start parameter
                    phone = parts[1]
                    if self._validate_phone(phone):
                        await self.link_phone_to_telegram(
                            phone=phone,
                            telegram_chat_id=chat_id,
                            username=username,
                            first_name=first_name,
                            last_name=last_name
                        )
                        await self._send_message(
                            chat_id,
                            f"Assalomu alaykum, {first_name or 'Foydalanuvchi'}! 👋\n\n"
                            f"✅ Telefon raqamingiz ({phone}) muvaffaqiyatli bog'landi.\n\n"
                            f"📱 Endi tasdiqlash kodlari shu yerga yuboriladi.\n\n"
                            f"💬 Menga istalgan savolingizni yuboring — men AI yordamchi sifatida javob beraman!"
                        )
                    else:
                        await self._send_message(
                            chat_id,
                            "❌ Noto'g'ri telefon raqam format. Iltimos, platformadan qaytadan urinib ko'ring."
                        )
                else:
                    await self._send_message(
                        chat_id,
                        f"Assalomu alaykum, {first_name or 'Foydalanuvchi'}! 👋\n\n"
                        f"🎓 *Alif24 Platformasi* botiga xush kelibsiz!\n\n"
                        f"📱 Platformada telefon raqamingizni tasdiqlash uchun botni ishga tushuring.\n\n"
                        f"💬 Menga istalgan savolingizni yuboring — men AI yordamchi sifatida javob beraman!\n\n"
                        f"📝 Buyruqlar:\n"
                        f"/start — Botni qayta ishga tushirish\n"
                        f"/help — Yordam\n"
                        f"/about — Alif24 haqida",
                        parse_mode="Markdown"
                    )
            
            # Handle /help command
            elif text.startswith("/help"):
                await self._send_message(
                    chat_id,
                    "🆘 *Yordam*\n\n"
                    "📱 *Telefon bog'lash:* Platformadan ro'yxatdan o'ting, bot avtomatik bog'lanadi.\n"
                    "🔐 *Tasdiqlash:* Kod shu yerga yuboriladi.\n"
                    "💬 *Savol berish:* Istalgan savolingizni yozing, AI javob beradi.\n\n"
                    "❓ Muammo bo'lsa admin bilan bog'laning.",
                    parse_mode="Markdown"
                )
            
            # Handle /about command
            elif text.startswith("/about"):
                await self._send_message(
                    chat_id,
                    "🎓 *Alif24 — AI Ta'lim Platformasi*\n\n"
                    "O'zbekistondagi bolalar uchun sun'iy intellekt asosida ta'lim beruvchi zamonaviy platforma.\n\n"
                    "📚 SmartKids AI, MathKids AI, Harf, TestAI, Live Quiz, Games va boshqalar!\n\n"
                    "🌐 Veb-sayt: ali24.uz",
                    parse_mode="Markdown"
                )
            
            # AI Chatbot — har qanday boshqa xabarga javob berish
            else:
                # "Typing" indikatorni ko'rsatish
                try:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"{self.api_url}/sendChatAction",
                            json={"chat_id": chat_id, "action": "typing"},
                            timeout=5.0
                        )
                except Exception:
                    pass
                
                # AI javobini olish
                ai_response = await self._get_ai_response(chat_id, text)
                await self._send_message(chat_id, ai_response)
                    
        except Exception as e:
            logger.error(f"Error processing webhook update: {e}")

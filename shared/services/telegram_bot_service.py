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
from shared.database.models.achievement import Achievement, StudentAchievement
from shared.database.models.coin import StudentCoin
import asyncio

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

MATH_SYSTEM_PROMPT = """Sen Alif24 platformasining matematika o'qituvchi botisan.
Vazifang:
- Matematika masalalarini bosqichma-bosqich yechishda yordam berish
- Bolalarga (4-12 yosh) tushunarli tilda tushuntirish
- Qo'shish, ayirish, ko'paytirish, bo'lish, kasrlar, geometriya
- Har bir qadamni emoji bilan bezash
- Agar foydalanuvchi masala bersa — yechimni ko'rsat
- Agar savol bersa — tushuntir
- Doim o'zbek tilida javob ber (agar boshqa tilda so'ralmasa)
- Javob oxirida "Yana masala yechmoqchimisiz? 🧮" deb so'ra
"""

TEST_SYSTEM_PROMPT = """Sen Alif24 platformasining test yaratuvchi botisan.
Vazifang:
- Foydalanuvchi so'ragan mavzu bo'yicha 5 ta test savoli yaratish
- Har bir savolda 4 ta variant bo'lsin (A, B, C, D)
- To'g'ri javobni oxirida ko'rsat
- Savollar qiyinlik darajasi: oson, o'rta, qiyin (foydalanuvchi tanlaydi)
- Mavzular: Matematika, Ona tili, Ingliz tili, Tabiatshunoslik, Tarix, va boshqalar
- Agar mavzu ko'rsatilmasa, umumiy bilim savollarini ber
- Format:
  1️⃣ Savol matni
  A) variant  B) variant  C) variant  D) variant
- Doim o'zbek tilida (agar boshqa tilda so'ralmasa)
"""

STORY_SYSTEM_PROMPT = """Sen Alif24 platformasining ertak yaratuvchi botisan.
Vazifang:
- Bolalar uchun qisqa va qiziqarli ertaklar yaratish (4-10 yosh)
- Ertak ta'limiy bo'lsin — oxirida saboq bo'lsin
- Emoji va tasviriy so'zlardan foydalanish
- Agar mavzu berilsa — shu mavzuda ertak yoz
- Agar berilmasa — o'zing qiziqarli mavzu tanla
- Ertak uzunligi: 150-300 so'z
- Oxirida: "📖 Bu ertakdan nima o'rgandik?" deb saboqni yoz
- Doim o'zbek tilida (agar boshqa tilda so'ralmasa)
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
        # OpenAI (legacy - not used)
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4")
        # Azure OpenAI
        self.azure_openai_key = os.getenv("AZURE_OPENAI_KEY", "")
        self.azure_openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
        self.azure_openai_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-5-chat")
        self.azure_openai_api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
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
        
        # Delete all existing unverified codes for this phone
        stmt = delete(PhoneVerification).where(
            PhoneVerification.phone == phone,
            PhoneVerification.verified == False
        )
        await self.db.execute(stmt)
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
                
                if user:
                    user.phone_verified = True
                    if not tg_user.user_id:
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
    
    async def send_notification(self, chat_id: str, message: str, url: Optional[str] = None, url_text: Optional[str] = "Batafsil ko'rish") -> bool:
        """Send notification to Telegram user"""
        reply_markup = None
        if url:
            reply_markup = {
                "inline_keyboard": [
                    [{"text": url_text, "url": url}]
                ]
            }
        return await self._send_message(chat_id, message, reply_markup=reply_markup)
    
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
        reply_markup = {
            "inline_keyboard": [
                [{"text": "📊 To'liq hisobotni ko'rish", "url": "https://ali24.uz/parent"}]
            ]
        }
        return await self._send_message(chat_id, message, parse_mode="Markdown", reply_markup=reply_markup)
    
    async def send_achievement_alert(self, chat_id: str, student_name: str, achievement_name: str) -> bool:
        """Send achievement unlocked notification"""
        message = f"""
🏆 *Yangi Yutuq!*

{student_name} *{achievement_name}* yutug'ini qo'lga kiritdi!

Tabriklaymiz! 🎉
"""
        reply_markup = {
            "inline_keyboard": [
                [{"text": "🏆 Barcha yutuqlarni ko'rish", "url": "https://ali24.uz/student"}]
            ]
        }
        return await self._send_message(chat_id, message, parse_mode="Markdown", reply_markup=reply_markup)
    
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
    
    async def _get_ai_response(self, chat_id: str, user_message: str, system_prompt: Optional[str] = None) -> str:
        """
        Azure OpenAI orqali foydalanuvchi savoliga javob olish.
        Chat tarixini saqlaydi (oxirgi 10 ta xabar).
        system_prompt — maxsus rejim uchun (math, test, story)
        """
        if not self.openai_api_key or self.openai_api_key == "":
            return "⚠️ AI xizmati hozirda mavjud emas. Iltimos, keyinroq urinib ko'ring."
        
        prompt = system_prompt or ALIF24_SYSTEM_PROMPT
        
        # Chat tarixini olish yoki yangisini yaratish
        history_key = f"{chat_id}:{id(prompt)}"
        if history_key not in self._chat_history:
            self._chat_history[history_key] = []
        
        history = self._chat_history[history_key]
        
        # Foydalanuvchi xabarini tarixga qo'shish
        history.append({"role": "user", "content": user_message})
        
        # Oxirgi 10 ta xabarni saqlash (xotira uchun)
        if len(history) > 10:
            history = history[-10:]
            self._chat_history[history_key] = history
        
        # Azure OpenAI API ga so'rov
        messages = [
            {"role": "system", "content": prompt},
            *history
        ]

        # Azure OpenAI
        if self.azure_openai_key and self.azure_openai_endpoint:
            try:
                azure_url = (
                    f"{self.azure_openai_endpoint.rstrip('/')}/openai/deployments/"
                    f"{self.azure_openai_deployment}/chat/completions"
                    f"?api-version={self.azure_openai_api_version}"
                )
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        azure_url,
                        headers={
                            "api-key": self.azure_openai_key,
                            "Content-Type": "application/json"
                        },
                        json={
                            "messages": messages,
                            "max_tokens": 800,
                            "temperature": 0.7,
                        },
                        timeout=30.0
                    )

                    if response.status_code == 200:
                        data = response.json()
                        ai_reply = data["choices"][0]["message"]["content"]
                        history.append({"role": "assistant", "content": ai_reply})
                        self._chat_history[history_key] = history
                        return ai_reply
                    else:
                        logger.error(f"Azure OpenAI error {response.status_code}: {response.text[:200]}")
            except httpx.TimeoutException:
                return "⏳ Javob olishda kutish vaqti tugadi. Iltimos, qayta urinib ko'ring."
            except Exception as e:
                logger.error(f"Azure OpenAI error: {e}")

        return "⚠️ AI xizmati hozirda mavjud emas. Iltimos, keyinroq urinib ko'ring."
    
    async def _get_student_profile(self, chat_id: str) -> Optional[StudentProfile]:
        """Telegram chat_id orqali o'quvchi profilini olish"""
        stmt = select(TelegramUser).filter(TelegramUser.telegram_chat_id == chat_id)
        result = await self.db.execute(stmt)
        tg_user = result.scalar_one_or_none()
        
        if not tg_user or not tg_user.user_id:
            return None
        
        stmt = select(StudentProfile).filter(StudentProfile.user_id == tg_user.user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def handle_progress(self, chat_id: str) -> None:
        """O'quvchining o'quv progressini ko'rsatish"""
        profile = await self._get_student_profile(chat_id)
        
        if not profile:
            await self._send_message(
                chat_id,
                "📊 Progressni ko'rish uchun avval platformada ro'yxatdan o'ting va "
                "botni telefon raqamingiz bilan bog'lang."
            )
            return
        
        # Coin balansini olish
        stmt = select(StudentCoin).filter(StudentCoin.student_id == profile.id)
        result = await self.db.execute(stmt)
        coin = result.scalar_one_or_none()
        coin_balance = coin.current_balance if coin else 0
        
        msg = (
            f"📊 *O'quv Progressi*\n\n"
            f"🎓 Daraja: *{profile.level}*\n"
            f"⭐ Umumiy ball: *{profile.total_points}*\n"
            f"🪙 Coinlar: *{coin_balance}*\n"
            f"📚 Tugatilgan darslar: *{profile.total_lessons_completed}*\n"
            f"🎮 O'ynalgan o'yinlar: *{profile.total_games_played}*\n"
            f"⏱ Umumiy vaqt: *{profile.total_time_spent}* daqiqa\n"
            f"📈 O'rtacha ball: *{profile.average_score:.1f}%*\n"
            f"🔥 Joriy streak: *{profile.current_streak}* kun\n"
            f"🏆 Eng uzun streak: *{profile.longest_streak}* kun\n\n"
            f"Zo'r natijalar! Davom eting! 💪"
        )
        await self._send_message(chat_id, msg, parse_mode="Markdown")
    
    async def handle_achievements(self, chat_id: str) -> None:
        """O'quvchining yutuqlarini ko'rsatish"""
        profile = await self._get_student_profile(chat_id)
        
        if not profile:
            await self._send_message(
                chat_id,
                "🏆 Yutuqlarni ko'rish uchun avval platformada ro'yxatdan o'ting."
            )
            return
        
        stmt = (
            select(StudentAchievement, Achievement)
            .join(Achievement, StudentAchievement.achievement_id == Achievement.id)
            .filter(StudentAchievement.student_id == profile.id)
            .order_by(desc(StudentAchievement.earned_at))
            .limit(10)
        )
        result = await self.db.execute(stmt)
        rows = result.all()
        
        if not rows:
            await self._send_message(
                chat_id,
                "🏆 Hali yutuqlar yo'q.\n\nPlatformada darslarni o'qing, o'yinlar o'ynang "
                "va yutuqlarni qo'lga kiriting! 🎯"
            )
            return
        
        lines = ["🏆 *Sizning Yutuqlaringiz*\n"]
        for sa, ach in rows:
            status = "✅" if sa.is_completed else f"⏳ {sa.progress_current}/{sa.progress_target}"
            lines.append(f"{status} *{ach.name_uz}*")
        
        lines.append(f"\nJami: *{len(rows)}* ta yutuq")
        await self._send_message(chat_id, "\n".join(lines), parse_mode="Markdown")
    
    async def handle_settings(self, chat_id: str, args: str = "") -> None:
        """Foydalanuvchi sozlamalarini boshqarish"""
        stmt = select(TelegramUser).filter(TelegramUser.telegram_chat_id == chat_id)
        result = await self.db.execute(stmt)
        tg_user = result.scalar_one_or_none()
        
        if not tg_user:
            await self._send_message(chat_id, "⚙️ Avval botni /start bilan ishga tushuring.")
            return
        
        # Agar argument berilgan bo'lsa — o'zgartirish
        arg = args.strip().lower()
        if arg == "uz" or arg == "ru" or arg == "en":
            tg_user.language = arg
            await self.db.commit()
            lang_names = {"uz": "O'zbek", "ru": "Русский", "en": "English"}
            await self._send_message(chat_id, f"✅ Til o'zgartirildi: *{lang_names[arg]}*", parse_mode="Markdown")
            return
        
        if arg == "notify_on":
            tg_user.notifications_enabled = True
            await self.db.commit()
            await self._send_message(chat_id, "🔔 Bildirishnomalar yoqildi!")
            return
        
        if arg == "notify_off":
            tg_user.notifications_enabled = False
            await self.db.commit()
            await self._send_message(chat_id, "🔕 Bildirishnomalar o'chirildi.")
            return
        
        # Joriy sozlamalarni ko'rsatish
        lang_names = {"uz": "O'zbek", "ru": "Русский", "en": "English"}
        current_lang = lang_names.get(tg_user.language, "O'zbek")
        notify_status = "Yoqilgan" if tg_user.notifications_enabled else "O'chirilgan"
        report_status = "Yoqilgan" if tg_user.daily_report_enabled else "O'chirilgan"
        
        msg = (
            "⚙️ *Sozlamalar*\n\n"
            f"🌐 Til: *{current_lang}*\n"
            f"📢 Bildirishnomalar: *{notify_status}*\n"
            f"📊 Kunlik hisobot: *{report_status}*\n\n"
            "*O'zgartirish uchun:*\n"
            "/settings uz — O'zbek tili\n"
            "/settings ru — Rus tili\n"
            "/settings en — Ingliz tili\n"
            "/settings notify\\_on — Bildirishnomalarni yoqish\n"
            "/settings notify\\_off — Bildirishnomalarni o'chirish"
        )
        await self._send_message(chat_id, msg, parse_mode="Markdown")
    
    async def broadcast_message(self, message: str, parse_mode: Optional[str] = None,
                                  filter_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Barcha Telegram foydalanuvchilarga ommaviy xabar jo'natish.
        filter_type: None (hammaga), "students", "parents", "teachers"
        Telegram API cheklovi: 30 msg/sec — shuning uchun 0.05s kechikish
        """
        stmt = select(TelegramUser).filter(TelegramUser.notifications_enabled == True)
        result = await self.db.execute(stmt)
        users = result.scalars().all()
        
        if filter_type and filter_type != "all":
            # Filter by user role if needed
            filtered = []
            for tg_user in users:
                if tg_user.user_id:
                    user_stmt = select(User).filter(User.id == tg_user.user_id)
                    user_result = await self.db.execute(user_stmt)
                    user = user_result.scalar_one_or_none()
                    if user and hasattr(user, 'role'):
                        role = str(user.role.value if hasattr(user.role, 'value') else user.role).lower()
                        if filter_type == "students" and role == "student":
                            filtered.append(tg_user)
                        elif filter_type == "parents" and role == "parent":
                            filtered.append(tg_user)
                        elif filter_type == "teachers" and role == "teacher":
                            filtered.append(tg_user)
                    else:
                        # Agar filter bo'lsa lekin role topilmasa — o'tkazib yuborish
                        pass
                else:
                    # user_id bog'lanmagan — faqat "all" da yuborish
                    pass
            users = filtered
        
        total = len(users)
        success_count = 0
        fail_count = 0
        
        for tg_user in users:
            try:
                sent = await self._send_message(tg_user.telegram_chat_id, message, parse_mode=parse_mode)
                if sent:
                    success_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                logger.error(f"Broadcast error for {tg_user.telegram_chat_id}: {e}")
                fail_count += 1
            
            # Telegram API rate limit: 30 msg/sec
            await asyncio.sleep(0.05)
        
        return {
            "success": True,
            "total": total,
            "sent": success_count,
            "failed": fail_count,
            "message": f"Xabar {success_count}/{total} foydalanuvchiga yuborildi."
        }
    
    async def _send_message(self, chat_id: str, message: str, parse_mode: Optional[str] = None,
                              reply_markup: Optional[Dict] = None) -> bool:
        """Internal method to send Telegram message"""
        try:
            payload = {
                "chat_id": chat_id,
                "text": message
            }
            if parse_mode:
                payload["parse_mode"] = parse_mode
            if reply_markup:
                payload["reply_markup"] = reply_markup
            
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
    
    def _contact_keyboard(self) -> Dict:
        """Kontakt ulashish tugmasi (ReplyKeyboardMarkup)"""
        return {
            "keyboard": [
                [{"text": "📱 Kontaktni ulashish", "request_contact": True}]
            ],
            "resize_keyboard": True,
            "one_time_keyboard": True
        }
    
    def _main_menu_keyboard(self) -> Dict:
        """Asosiy menyu tugmalari"""
        return {
            "keyboard": [
                [{"text": "🧮 Matematika"}, {"text": "📝 Test"}],
                [{"text": "📖 Ertak"}, {"text": "📊 Progress"}],
                [{"text": "🏆 Yutuqlar"}, {"text": "⚙️ Sozlamalar"}],
            ],
            "resize_keyboard": True
        }
    
    def _remove_keyboard(self) -> Dict:
        """Klaviaturani olib tashlash"""
        return {"remove_keyboard": True}
    
    def _validate_phone(self, phone: str) -> bool:
        """Validate Uzbek phone number format"""
        pattern = r'^\+998\d{9}$'
        return bool(re.match(pattern, phone))
    
    async def process_webhook_update(self, update: Dict[str, Any]) -> None:
        """
        Process incoming Telegram webhook update
        Handles /start, contact sharing, AI chatbot, and all commands
        """
        try:
            message = update.get("message", {})
            if not message:
                return
                
            chat_id = str(message.get("chat", {}).get("id"))
            text = message.get("text", "")
            contact = message.get("contact")
            username = message.get("from", {}).get("username")
            first_name = message.get("from", {}).get("first_name")
            last_name = message.get("from", {}).get("last_name")
            
            # Update last interaction
            stmt = select(TelegramUser).filter(TelegramUser.telegram_chat_id == chat_id)
            result = await self.db.execute(stmt)
            tg_user = result.scalar_one_or_none()
            
            if tg_user:
                tg_user.last_interaction_at = datetime.now(timezone.utc)
                await self.db.commit()
            
            # ===== CONTACT SHARING — telefon raqamni bog'lash =====
            if contact:
                phone_number = contact.get("phone_number", "")
                # +998 bilan boshlanmasa, qo'shish
                if not phone_number.startswith("+"):
                    phone_number = f"+{phone_number}"
                
                await self.link_phone_to_telegram(
                    phone=phone_number,
                    telegram_chat_id=chat_id,
                    username=username,
                    first_name=first_name,
                    last_name=last_name
                )
                await self._send_message(
                    chat_id,
                    f"✅ Rahmat, {first_name or 'Foydalanuvchi'}!\n\n"
                    f"📱 Telefon raqamingiz ({phone_number}) muvaffaqiyatli bog'landi.\n\n"
                    "🔐 Endi platformada ro'yxatdan o'tganingizda tasdiqlash kodi shu yerga keladi.\n\n"
                    "💬 Quyidagi tugmalar orqali AI yordamchilardan foydalaning!",
                    reply_markup=self._main_menu_keyboard()
                )
                return
            
            if not text:
                return
            
            # ===== BUTTON TEXT MAPPING — tugma matnlarini buyruqlarga moslashtirish =====
            button_map = {
                "🧮 Matematika": "/math",
                "📝 Test": "/test",
                "📖 Ertak": "/story",
                "📊 Progress": "/progress",
                "🏆 Yutuqlar": "/achievements",
                "⚙️ Sozlamalar": "/settings",
            }
            if text in button_map:
                text = button_map[text]
            
            # ===== /start =====
            if text.startswith("/start"):
                parts = text.split()
                if len(parts) > 1:
                    # Deep link — telefon raqam parametr bilan keldi (saytdan)
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
                            "� Endi tasdiqlash kodlari shu yerga yuboriladi.\n\n"
                            "💬 Quyidagi tugmalar orqali AI yordamchilardan foydalaning!",
                            reply_markup=self._main_menu_keyboard()
                        )
                    else:
                        await self._send_message(
                            chat_id,
                            "❌ Noto'g'ri telefon raqam format. Iltimos, platformadan qaytadan urinib ko'ring."
                        )
                elif tg_user and tg_user.phone:
                    # Allaqachon bog'langan — asosiy menyuni ko'rsat
                    await self._send_message(
                        chat_id,
                        f"Assalomu alaykum, {first_name or 'Foydalanuvchi'}! 👋\n\n"
                        "🎓 *Alif24 Platformasi* botiga xush kelibsiz!\n\n"
                        "Quyidagi tugmalardan foydalaning yoki menga savol yuboring! 💬",
                        parse_mode="Markdown",
                        reply_markup=self._main_menu_keyboard()
                    )
                else:
                    # Yangi foydalanuvchi — kontakt so'rash
                    await self._send_message(
                        chat_id,
                        f"Assalomu alaykum, {first_name or 'Foydalanuvchi'}! 👋\n\n"
                        "🎓 *Alif24 Platformasi* botiga xush kelibsiz!\n\n"
                        "📱 Davom etish uchun telefon raqamingizni ulashing.\n"
                        "Pastdagi tugmani bosing:",
                        parse_mode="Markdown",
                        reply_markup=self._contact_keyboard()
                    )
            
            # ===== /cancel =====
            elif text.startswith("/cancel"):
                # Chat tarixini tozalash
                keys_to_remove = [k for k in self._chat_history if k.startswith(f"{chat_id}:")]
                for k in keys_to_remove:
                    del self._chat_history[k]
                await self._send_message(
                    chat_id,
                    "🔄 Bekor qilindi. Asosiy menyuga qaytdingiz.",
                    reply_markup=self._main_menu_keyboard()
                )
            
            # ===== /help =====
            elif text.startswith("/help"):
                await self._send_message(
                    chat_id,
                    "🆘 *Yordam*\n\n"
                    "📱 *Telefon bog'lash:* /start bosing va kontaktingizni ulashing.\n"
                    "🔐 *Tasdiqlash:* 6 xonalik kod shu yerga yuboriladi.\n"
                    "💬 *Savol berish:* Istalgan savolingizni yozing, AI javob beradi.\n\n"
                    "🤖 *AI Chatbotlar:*\n"
                    "🧮 Matematika — masalalarni yechish\n"
                    "📝 Test — mavzu bo'yicha test yaratish\n"
                    "📖 Ertak — bolalar uchun ertak yaratish\n\n"
                    "📊 *Shaxsiy kabinet:*\n"
                    "📊 Progress — o'quv progressingiz\n"
                    "🏆 Yutuqlar — yutuqlaringiz\n"
                    "⚙️ Sozlamalar — til va bildirishnomalar\n\n"
                    "/cancel — AI rejimdan chiqish\n\n"
                    "❓ Muammo bo'lsa admin bilan bog'laning.",
                    parse_mode="Markdown",
                    reply_markup=self._main_menu_keyboard()
                )
            
            # ===== /about =====
            elif text.startswith("/about"):
                await self._send_message(
                    chat_id,
                    "🎓 *Alif24 — AI Ta'lim Platformasi*\n\n"
                    "O'zbekistondagi bolalar uchun sun'iy intellekt asosida ta'lim beruvchi zamonaviy platforma.\n\n"
                    "📚 SmartKids AI, MathKids AI, Harf, TestAI, Live Quiz, Games va boshqalar!\n\n"
                    "🌐 Veb-sayt: alif24.uz",
                    parse_mode="Markdown"
                )
            
            # ===== /math =====
            elif text.startswith("/math"):
                args = text[5:].strip()
                if not args:
                    await self._send_message(
                        chat_id,
                        "🧮 *Matematika Yordamchisi*\n\n"
                        "Menga istalgan matematika masalasini yuboring!\n\n"
                        "Misollar:\n"
                        "/math 125 + 376\n"
                        "/math 15 x 23 ni yech\n"
                        "/math Uchburchakning yuzini top\n\n"
                        "Yoki shunchaki masalani yozing! 📐",
                        parse_mode="Markdown"
                    )
                else:
                    await self._send_typing(chat_id)
                    ai_response = await self._get_ai_response(chat_id, args, MATH_SYSTEM_PROMPT)
                    await self._send_message(chat_id, ai_response)
            
            # ===== /test =====
            elif text.startswith("/test"):
                args = text[5:].strip()
                if not args:
                    await self._send_message(
                        chat_id,
                        "📝 *Test Yaratuvchi*\n\n"
                        "Mavzu va qiyinlik darajasini yozing, men test yarataman!\n\n"
                        "Misollar:\n"
                        "/test Matematika oson\n"
                        "/test Ingliz tili o'rta\n"
                        "/test Tarix qiyin\n"
                        "/test Tabiatshunoslik\n\n"
                        "Qiyinlik: oson, o'rta, qiyin 📚",
                        parse_mode="Markdown"
                    )
                else:
                    await self._send_typing(chat_id)
                    ai_response = await self._get_ai_response(chat_id, args, TEST_SYSTEM_PROMPT)
                    await self._send_message(chat_id, ai_response)
            
            # ===== /story =====
            elif text.startswith("/story"):
                args = text[6:].strip()
                if not args:
                    await self._send_message(
                        chat_id,
                        "📖 *Ertak Yaratuvchi*\n\n"
                        "Mavzu yozing yoki shunchaki /story bosing — men ertak yarataman!\n\n"
                        "Misollar:\n"
                        "/story Mehnatsevar chumoli\n"
                        "/story Kosmosga sayohat\n"
                        "/story Do'stlik haqida\n\n"
                        "Keling, ertak boshlaymiz! ✨",
                        parse_mode="Markdown"
                    )
                    await self._send_typing(chat_id)
                    ai_response = await self._get_ai_response(
                        chat_id, "Menga qiziqarli ta'limiy ertak yarat", STORY_SYSTEM_PROMPT
                    )
                    await self._send_message(chat_id, ai_response)
                else:
                    await self._send_typing(chat_id)
                    ai_response = await self._get_ai_response(
                        chat_id, f"Shu mavzuda ertak yarat: {args}", STORY_SYSTEM_PROMPT
                    )
                    await self._send_message(chat_id, ai_response)
            
            # ===== /progress =====
            elif text.startswith("/progress"):
                await self.handle_progress(chat_id)
            
            # ===== /achievements =====
            elif text.startswith("/achievements"):
                await self.handle_achievements(chat_id)
            
            # ===== /settings =====
            elif text.startswith("/settings"):
                args = text[9:].strip()
                await self.handle_settings(chat_id, args)
            
            # ===== /invitations =====
            elif text.startswith("/invitations") or text.startswith("/sinflar"):
                await self.handle_classroom_invitations(chat_id)
            
            # ===== AI Chatbot — har qanday boshqa xabarga javob berish =====
            else:
                await self._send_typing(chat_id)
                ai_response = await self._get_ai_response(chat_id, text)
                await self._send_message(chat_id, ai_response)
                    
        except Exception as e:
            logger.error(f"Error processing webhook update: {e}")
    
    async def handle_classroom_invitations(self, chat_id: str) -> None:
        """
        Sinf takliflarini ko'rsatish va qabul qilish/rad etish imkoniyatini taqdim etish
        """
        try:
            from shared.database.models.classroom import ClassroomInvitation, Classroom, InvitationStatus
            from shared.database.models.user import User
            
            # Get Telegram user
            stmt = select(TelegramUser).filter(TelegramUser.telegram_chat_id == chat_id)
            result = await self.db.execute(stmt)
            tg_user = result.scalar_one_or_none()
            
            if not tg_user or not tg_user.user_id:
                await self._send_message(
                    chat_id,
                    "❌ Sinf takliflarini ko'rish uchun avval platformaga kiring va telefon raqamingizni bog'lang.\n\n"
                    "📱 /start bosing va kontaktingizni ulashing."
                )
                return
            
            # Get pending invitations for this user
            stmt = (
                select(ClassroomInvitation, Classroom)
                .join(Classroom, ClassroomInvitation.classroom_id == Classroom.id)
                .filter(
                    ClassroomInvitation.identifier == tg_user.phone,
                    ClassroomInvitation.status == InvitationStatus.pending
                )
                .order_by(ClassroomInvitation.created_at.desc())
            )
            result = await self.db.execute(stmt)
            invitations = result.all()
            
            if not invitations:
                await self._send_message(
                    chat_id,
                    "📚 Sizda hozircha kutilayotgan sinf takliflari yo'q.\n\n"
                    "O'qituvchidan taklif kuting yoki platformada sinf kodini kiriting!"
                )
                return
            
            # Show invitations
            message = f"📬 Sizda {len(invitations)} ta sinf taklifi:\n\n"
            
            for idx, (inv, classroom) in enumerate(invitations, 1):
                # Get teacher name
                teacher_stmt = select(User).filter(User.id == inv.invited_by)
                teacher_result = await self.db.execute(teacher_stmt)
                teacher = teacher_result.scalar_one_or_none()
                teacher_name = f"{teacher.first_name} {teacher.last_name}" if teacher else "Noma'lum o'qituvchi"
                
                message += (
                    f"{idx}. 📖 *{classroom.name}*\n"
                    f"   👨‍🏫 O'qituvchi: {teacher_name}\n"
                    f"   📅 Yuborilgan: {inv.created_at.strftime('%d.%m.%Y')}\n\n"
                )
            
            message += (
                "Taklifni qabul qilish yoki rad etish uchun platformaga kiring:\n"
                "🌐 https://alif24.uz/student\n\n"
                "Yoki /start bosing va platforma orqali javob bering."
            )
            
            await self._send_message(chat_id, message, parse_mode="Markdown")
            
        except Exception as e:
            logger.error(f"Error handling classroom invitations: {e}")
            await self._send_message(
                chat_id,
                "❌ Sinf takliflarini yuklashda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring."
            )
    
    async def _send_typing(self, chat_id: str) -> None:
        """Typing indikatorni ko'rsatish"""
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{self.api_url}/sendChatAction",
                    json={"chat_id": chat_id, "action": "typing"},
                    timeout=5.0
                )
        except Exception:
            pass
    
    async def register_bot_commands(self) -> bool:
        """
        Telegram menyusida buyruqlar ro'yxatini ro'yxatdan o'tkazish (setMyCommands).
        Bir marta chaqirish kifoya — Telegram eslab qoladi.
        """
        commands = [
            {"command": "start", "description": "Botni ishga tushirish"},
            {"command": "help", "description": "Yordam"},
            {"command": "about", "description": "Alif24 haqida"},
            {"command": "math", "description": "Matematika yordamchisi"},
            {"command": "test", "description": "Test yaratuvchi"},
            {"command": "story", "description": "Ertak yaratuvchi"},
            {"command": "progress", "description": "O'quv progressi"},
            {"command": "achievements", "description": "Yutuqlar"},
            {"command": "settings", "description": "Sozlamalar"},
            {"command": "cancel", "description": "Bekor qilish"},
        ]
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/setMyCommands",
                    json={"commands": commands},
                    timeout=10.0
                )
                if response.status_code == 200:
                    logger.info("Bot commands registered successfully")
                    return True
                else:
                    logger.error(f"setMyCommands error: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"setMyCommands error: {e}")
            return False

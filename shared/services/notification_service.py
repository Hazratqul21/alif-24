"""
Notification Service - SMS, Email, Telegram notifications
Alif24 Platform - xabarnomalar tizimi
"""
import logging
import httpx
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from shared.database.models import NotificationLog, NotificationType, NotificationStatus, TelegramUser

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Notification Service - SMS, Email, Telegram
    Eskiz.uz orqali SMS, SMTP orqali Email, Telegram Bot orqali xabarlar
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        # Read from environment variables
        self.telegram_bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.eskiz_email = os.getenv("ESKIZ_EMAIL", "")
        self.eskiz_password = os.getenv("ESKIZ_PASSWORD", "")
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("EMAILS_FROM_EMAIL", "info@alif24.uz")
    
    async def send_sms(self, recipient: str, message: str, user_id: Optional[str] = None) -> bool:
        """
        Send SMS via Eskiz.uz
        """
        # Create log entry
        log = NotificationLog(
            user_id=user_id,
            notification_type=NotificationType.SMS,
            recipient=recipient,
            message=message,
            status=NotificationStatus.PENDING
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        
        try:
            # Get Token from Eskiz
            async with httpx.AsyncClient(timeout=30.0) as client:
                auth_response = await client.post(
                    "https://notify.eskiz.uz/api/auth/login",
                    data={"email": self.eskiz_email, "password": self.eskiz_password}
                )
                
                if auth_response.status_code != 200:
                    raise Exception(f"Eskiz Auth Failed: {auth_response.text}")
                
                token = auth_response.json()["data"]["token"]
                
                # Send SMS
                send_response = await client.post(
                    "https://notify.eskiz.uz/api/message/sms/send",
                    headers={"Authorization": f"Bearer {token}"},
                    data={
                        "mobile_phone": recipient.replace("+", "").replace(" ", ""),
                        "message": message,
                        "from": "4546"
                    }
                )
                
                if send_response.status_code != 200:
                    raise Exception(f"Eskiz Send Failed: {send_response.text}")
                
                # Update log
                log.status = NotificationStatus.SENT
                log.sent_at = datetime.now(timezone.utc)
                await self.db.commit()
                return True
                
        except Exception as e:
            logger.error(f"SMS Error: {e}")
            log.status = NotificationStatus.FAILED
            log.error_message = str(e)
            await self.db.commit()
            return False
    
    async def send_telegram(self, chat_id: str, message: str, user_id: Optional[str] = None) -> bool:
        """
        Send Telegram Message
        """
        log = NotificationLog(
            user_id=user_id,
            notification_type=NotificationType.TELEGRAM,
            recipient=chat_id,
            message=message,
            status=NotificationStatus.PENDING
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        
        try:
            if not self.telegram_bot_token:
                raise Exception("Telegram Bot Token not configured")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage",
                    json={"chat_id": chat_id, "text": message}
                )
                
                if response.status_code != 200:
                    raise Exception(f"Telegram Send Failed: {response.text}")
                
                # Update log
                log.status = NotificationStatus.SENT
                log.sent_at = datetime.now(timezone.utc)
                await self.db.commit()
                return True
                
        except Exception as e:
            logger.error(f"Telegram Error: {e}")
            log.status = NotificationStatus.FAILED
            log.error_message = str(e)
            await self.db.commit()
            return False
    
    async def send_telegram_to_user(self, user_id: str, message: str) -> bool:
        """
        Send Telegram message to user by user_id
        """
        # Find user's Telegram
        stmt = select(TelegramUser).filter(TelegramUser.user_id == user_id)
        result = await self.db.execute(stmt)
        tg_user = result.scalar_one_or_none()
        
        if not tg_user or not tg_user.telegram_chat_id:
            logger.warning(f"No Telegram linked for user {user_id}")
            return False
        
        return await self.send_telegram(tg_user.telegram_chat_id, message, user_id)
    
    async def send_email(self, recipient: str, subject: str, html_content: str, user_id: Optional[str] = None) -> bool:
        """
        Send Email via SMTP
        """
        log = NotificationLog(
            user_id=user_id,
            notification_type=NotificationType.EMAIL,
            recipient=recipient,
            message=f"Subject: {subject}",
            status=NotificationStatus.PENDING
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        
        try:
            import aiosmtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = recipient
            msg['Subject'] = subject
            
            msg.attach(MIMEText(html_content, 'html'))
            
            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=self.smtp_port == 465,
                start_tls=self.smtp_port == 587
            )
            
            # Update log
            log.status = NotificationStatus.SENT
            log.sent_at = datetime.now(timezone.utc)
            await self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Email Error: {e}")
            log.status = NotificationStatus.FAILED
            log.error_message = str(e)
            await self.db.commit()
            return False

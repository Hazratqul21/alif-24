"""
Notification Service - SMS, Email, Telegram
Alif24 Platform - Eskiz.uz orqali SMS, SMTP orqali Email, Telegram Bot orqali xabarlar
"""

import os
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any

class NotificationService:
    """
    Notification Service - SMS, Email, Telegram
    Eskiz.uz orqali SMS, SMTP orqali Email, Telegram Bot orqali xabarlar
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        # Read from environment variables with fallback to old hardcoded values
        self.telegram_bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "8379431489:AAH2xUGuEy0_FZV8vnN8_vyIII13VqDPryU")
        self.eskiz_email = os.getenv("ESKIZ_EMAIL", "")
        self.eskiz_password = os.getenv("ESKIZ_PASSWORD", "")
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("EMAILS_FROM_EMAIL", "info@alif24.uz")
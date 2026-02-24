"""
Telegram Bot Service
Alif24 Platform - Telegram Bot integratsiyasi
"""

import logging
import httpx
import re
import os
import json
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

class TelegramBotService:
    """
    Telegram Bot Service
    - Verification codes
    - Parent notifications
    - AI Chat (GPT)
    """

    def __init__(self, db: AsyncSession, bot_token: Optional[str] = None):
        self.db = db
        # Read from environment variables with fallback to old hardcoded values
        self.bot_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN", "8379431489:AAH2xUGuEy0_FZV8vnN8_vyIII13VqDPryU")
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "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")
        self.openai_model = "gpt-4o-mini"
        self.openai_fallback_model = "gpt-3.5-turbo"
        # Chat tarixi (xotirada, oxirgi 10 ta xabar)
        self._chat_history: Dict[str, List[Dict]] = {}
"""
Azure Speech Service - STT (Speech-to-Text) va TTS (Text-to-Speech)
Alif24 Platform - Azure Cognitive Services integratsiyasi

Qo'llab-quvvatlanadigan tillar:
- O'zbek (uz-UZ) — MadinaNeural / SardorNeural
- Rus (ru-RU) — SvetlanaNeural / DmitryNeural
- Ingliz (en-US) — AriaNeural / GuyNeural
"""
import httpx
import os
import logging
import time
from typing import Optional, Dict, Any
from xml.sax.saxutils import escape
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# ===== Ovoz konfiguratsiyasi =====

class AzureSpeechService:
    """
    Azure Speech Service - TTS va STT uchun
    - TTS: Matnni ovozga aylantirish
    - STT: Ovozni matnga aylantirish
    - Token caching (9 daqiqa)
    - Ko'p tilli qo'llab-quvvatlash
    """

    def __init__(self, speech_key: Optional[str] = None, speech_region: Optional[str] = None):
        # Read from environment variables with fallback to hardcoded value
        self.speech_key = speech_key or os.getenv(
            "AZURE_SPEECH_KEY",
            "54V9TJPS3HtXlzdnmUY0sgRv6NtugLsgFcf2s3yZlwS0Ogint3u6JQQJ99BLACYeBjFXJ3w3AAAYACOGlQP9"
        )
        self.speech_region = speech_region or os.getenv("AZURE_SPEECH_REGION", "eastus")
        self.token_url = f"https://{self.speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
        self.tts_url = f"https://{self.speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
        self.stt_url = f"https://{self.speech_region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
        # Token caching — tokenlar 10 daqiqa amal qiladi, 9 daqiqada yangilaymiz
        self._cached_token: Optional[str] = None
        self._token_expiry: float = 0
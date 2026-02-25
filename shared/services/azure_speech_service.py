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

VOICE_MAP = {
    "uz": {"female": "uz-UZ-MadinaNeural", "male": "uz-UZ-SardorNeural"},
    "ru": {"female": "ru-RU-SvetlanaNeural", "male": "ru-RU-DmitryNeural"},
    "en": {"female": "en-US-AriaNeural", "male": "en-US-GuyNeural"},
}

# Backwards compatibility alias
def get_voice_for_language(language_code: str, gender: str = "female") -> str:
    lang = language_code[:2]
    return VOICE_MAP.get(lang, VOICE_MAP["uz"]).get(gender, "uz-UZ-MadinaNeural")

class AzureSpeechService:
    """
    Azure Speech Service - TTS va STT uchun
    - TTS: Matnni ovozga aylantirish
    - STT: Ovozni matnga aylantirish
    - Token caching (9 daqiqa)
    - Ko'p tilli qo'llab-quvvatlash
    """

    def __init__(self, speech_key: Optional[str] = None, speech_region: Optional[str] = None):
        self.speech_key = speech_key or os.getenv("AZURE_SPEECH_KEY", "")
        self.speech_region = speech_region or os.getenv("AZURE_SPEECH_REGION", "eastus")
        self.token_url = f"https://{self.speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
        self.tts_url = f"https://{self.speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
        self.stt_url = f"https://{self.speech_region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
        # Token caching — tokenlar 10 daqiqa amal qiladi, 9 daqiqada yangilaymiz
        self._cached_token: Optional[str] = None
        self._token_expiry: float = 0

    async def _get_token(self) -> str:
        """Azure Speech uchun auth token olish (cached)"""
        if self._cached_token and time.time() < self._token_expiry:
            return self._cached_token

        if not self.speech_key:
            raise HTTPException(status_code=500, detail="AZURE_SPEECH_KEY sozlanmagan")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    self.token_url,
                    headers={"Ocp-Apim-Subscription-Key": self.speech_key},
                )
                resp.raise_for_status()
                self._cached_token = resp.text
                self._token_expiry = time.time() + 540  # 9 daqiqa
                return self._cached_token
        except Exception as e:
            logger.error(f"Azure Speech token olishda xatolik: {e}")
            raise HTTPException(status_code=500, detail=f"Speech token xatoligi: {str(e)}")

    async def get_token_for_client(self) -> Dict[str, Any]:
        """Frontend uchun token qaytarish (SpeechConfig.fromAuthorizationToken uchun)"""
        token = await self._get_token()
        return {
            "token": token,
            "region": self.speech_region,
            "expires_in": 540,
        }

    def get_available_voices(self) -> Dict[str, Any]:
        """Mavjud ovozlar ro'yxati"""
        return {
            "voices": VOICE_MAP,
            "languages": list(VOICE_MAP.keys()),
        }

    async def speech_to_text(self, audio_data: bytes, language: str = "uz") -> Dict[str, Any]:
        """
        Ovozni matnga aylantirish (Azure STT)

        Args:
            audio_data: Ovoz fayli baytlari (webm, wav, mp3)
            language: Til kodi (uz, ru, en)

        Returns:
            dict: {transcript, duration, confidence}
        """
        if not self.speech_key:
            raise HTTPException(status_code=500, detail="AZURE_SPEECH_KEY sozlanmagan")

        # Tilga mos STT endpoint
        lang_code_map = {
            "uz": "uz-UZ",
            "ru": "ru-RU",
            "en": "en-US",
        }
        stt_lang = lang_code_map.get(language, "uz-UZ")

        # STT URL — conversation mode (eng yaxshi natija)
        stt_url = f"https://{self.speech_region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language={stt_lang}"

        try:
            token = await self._get_token()
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    stt_url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "audio/webm; codecs=opus",  # Default webm
                    },
                    content=audio_data,
                )

                if resp.status_code != 200:
                    logger.error(f"Azure STT xatoligi: {resp.status_code} - {resp.text}")
                    raise HTTPException(status_code=500, detail=f"STT xatoligi: {resp.status_code}")

                result = resp.json()

                # Azure STT response format
                # {"RecognitionStatus": "Success", "DisplayText": "...", "Duration": "..."}
                if result.get("RecognitionStatus") == "Success":
                    return {
                        "transcript": result.get("DisplayText", ""),
                        "duration": result.get("Duration", 0),
                        "success": True,
                    }
                elif result.get("RecognitionStatus") == "NoMatch":
                    return {
                        "transcript": "",
                        "duration": 0,
                        "success": False,
                        "error": "Ovoz tanib olinmadi",
                    }
                else:
                    return {
                        "transcript": "",
                        "duration": 0,
                        "success": False,
                        "error": result.get("RecognitionStatus", "Noma'lum xatolik"),
                    }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Azure STT xatoligi: {e}")
            raise HTTPException(status_code=500, detail=f"STT xatoligi: {str(e)}")

    async def text_to_speech(self, text: str, language: str = "uz", gender: str = "female") -> bytes:
        """Matnni ovozga aylantirish (Azure TTS)"""
        if not self.speech_key:
            raise HTTPException(status_code=500, detail="AZURE_SPEECH_KEY sozlanmagan")

        voice_info = VOICE_MAP.get(language, VOICE_MAP["uz"])
        voice_name = voice_info.get(gender, voice_info["female"])

        ssml = f"""<speak version='1.0' xml:lang='{language}'>
            <voice name='{voice_name}'>
                <prosody rate='0.9'>{escape(text)}</prosody>
            </voice>
        </speak>"""

        try:
            token = await self._get_token()
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    self.tts_url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/ssml+xml",
                        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
                    },
                    content=ssml,
                )
                resp.raise_for_status()
                return resp.content
        except Exception as e:
            logger.error(f"Azure TTS xatoligi: {e}")
            raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


# Module-level singleton — speech_token_router.py imports this
speech_service = AzureSpeechService()
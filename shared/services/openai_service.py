"""
OpenAI Service - STT (Whisper) va TTS uchun
Alif24 Platform - OpenAI integratsiyasi
"""
import os
import logging
from typing import Optional, Dict, Any
from io import BytesIO
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# TTS voices for OpenAI
VOICE_MAP = {
    "uz": {"female": "alloy", "male": "onyx"},
    "ru": {"female": "echo", "male": "onyx"},
    "en": {"female": "alloy", "male": "onyx"},
}


class OpenAIService:
    """
    OpenAI Service - Whisper (STT) va TTS uchun
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY sozlanmagan")

    async def speech_to_text(self, audio_data: bytes, language: str = "uz") -> Dict[str, Any]:
        """
        Ovozni matnga aylantirish (OpenAI Whisper)

        Args:
            audio_data: Ovoz fayli baytlari
            language: Til kodi (hozircha faqat Whisper auto-detect ishlatiladi)

        Returns:
            dict: {transcript, duration, success}
        """
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.api_key)

            # Audio ni fayl sifatida yuborish
            audio_file = BytesIO(audio_data)
            audio_file.name = "audio.webm"

            # Whisper transcription
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="json",
                language=language if language != "uz" else "uz",  # Whisper supports Uzbek
            )

            transcript = response.text.strip()

            if not transcript:
                return {
                    "transcript": "",
                    "success": False,
                    "error": "Ovoz tanib olinmadi",
                }

            return {
                "transcript": transcript,
                "success": True,
            }

        except Exception as e:
            logger.error(f"OpenAI Whisper xatoligi: {e}")
            return {
                "transcript": "",
                "success": False,
                "error": str(e),
            }

    async def text_to_speech(
        self,
        text: str,
        language: str = "uz",
        gender: str = "female"
    ) -> bytes:
        """
        Matnni ovozga aylantirish (OpenAI TTS)

        Args:
            text: Matn
            language: Til
            gender: jins (female/male)

        Returns:
            bytes: Audio data (MP3)
        """
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.api_key)

            # Voice tanlash
            voice = VOICE_MAP.get(language, VOICE_MAP["uz"]).get(gender, "alloy")

            # TTS request
            response = await client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text,
                response_format="mp3",
            )

            # Bytes olarak qaytarish
            return response.content

        except Exception as e:
            logger.error(f"OpenAI TTS xatoligi: {e}")
            raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


# Singleton
_openai_service: Optional[OpenAIService] = None


def get_openai_service() -> OpenAIService:
    """OpenAI service olish"""
    global _openai_service
    if _openai_service is None:
        try:
            _openai_service = OpenAIService()
        except ValueError as e:
            logger.error(f"OpenAI service initialization failed: {e}")
            return None
    return _openai_service
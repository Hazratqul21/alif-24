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
VOICE_CONFIG: Dict[str, Dict[str, Any]] = {
    "uz-UZ": {
        "female": "uz-UZ-MadinaNeural",
        "male": "uz-UZ-SardorNeural",
        "default": "uz-UZ-MadinaNeural",
        "gender": "Female",
        "name": "O'zbek",
    },
    "ru-RU": {
        "female": "ru-RU-SvetlanaNeural",
        "male": "ru-RU-DmitryNeural",
        "default": "ru-RU-SvetlanaNeural",
        "gender": "Female",
        "name": "Русский",
    },
    "en-US": {
        "female": "en-US-AriaNeural",
        "male": "en-US-GuyNeural",
        "default": "en-US-AriaNeural",
        "gender": "Female",
        "name": "English",
    },
}

# Audio format konfiguratsiyasi
AUDIO_FORMATS = {
    "mp3": "audio-16khz-128kbitrate-mono-mp3",
    "mp3-hd": "audio-24khz-160kbitrate-mono-mp3",
    "wav": "riff-16khz-16bit-mono-pcm",
    "ogg": "ogg-16khz-16bit-mono-opus",
}


def get_voice_for_language(language: str, gender: str = "female", custom_voice: Optional[str] = None) -> str:
    """Til va jins bo'yicha ovoz nomini qaytarish"""
    if custom_voice:
        return custom_voice
    config = VOICE_CONFIG.get(language, VOICE_CONFIG["uz-UZ"])
    return config.get(gender, config["default"])


def get_language_from_voice(voice_name: str) -> str:
    """Ovoz nomidan tilni aniqlash"""
    for lang, config in VOICE_CONFIG.items():
        if voice_name in (config["female"], config["male"], config["default"]):
            return lang
    return "uz-UZ"


class AzureSpeechService:
    """
    Azure Cognitive Services Speech Service
    - Text-to-Speech (TTS) — to'liq SSML bilan
    - Speech-to-Text (STT) — Azure REST API bilan
    - Token caching (9 daqiqa)
    - Ko'p tilli qo'llab-quvvatlash
    """
    
    def __init__(self, speech_key: Optional[str] = None, speech_region: Optional[str] = None):
        # Read from environment variables
        self.speech_key = speech_key or os.getenv("AZURE_SPEECH_KEY", "")
        self.speech_region = speech_region or os.getenv("AZURE_SPEECH_REGION", "eastus")
        self.token_url = f"https://{self.speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
        self.tts_url = f"https://{self.speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
        self.stt_url = f"https://{self.speech_region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
        # Token caching — tokenlar 10 daqiqa amal qiladi, 9 daqiqada yangilaymiz
        self._cached_token: Optional[str] = None
        self._token_expiry: float = 0
    
    def _check_config(self):
        """Azure konfiguratsiyasini tekshirish"""
        if not self.speech_key:
            raise HTTPException(status_code=500, detail="Azure Speech key sozlanmagan")
        if not self.speech_region:
            raise HTTPException(status_code=500, detail="Azure Speech region sozlanmagan")
    
    async def _get_access_token(self) -> str:
        """
        Azure Speech access token olish (caching bilan).
        Token 10 daqiqa amal qiladi — 9 daqiqada yangilaymiz.
        """
        self._check_config()
        
        # Cache tekshirish
        if self._cached_token and time.time() < self._token_expiry:
            return self._cached_token
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.token_url,
                    headers={"Ocp-Apim-Subscription-Key": self.speech_key}
                )
                response.raise_for_status()
                self._cached_token = response.text
                self._token_expiry = time.time() + 540  # 9 daqiqa
                return self._cached_token
        except httpx.HTTPStatusError as e:
            logger.error(f"Azure Speech auth failed: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=500, detail=f"Azure Speech autentifikatsiya xatoligi: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Azure Speech auth error: {e}")
            raise HTTPException(status_code=500, detail=f"Azure Speech ulanish xatoligi: {e}")
    
    def _build_ssml(self, text: str, voice_name: str, language: Optional[str] = None,
                     rate: str = "0%", pitch: str = "0%") -> str:
        """
        Professional SSML yaratish — til, ovoz, tezlik, ohang bilan.
        """
        lang = language or get_language_from_voice(voice_name)
        escaped_text = escape(text)
        
        config = VOICE_CONFIG.get(lang, VOICE_CONFIG["uz-UZ"])
        gender = config["gender"]
        
        # Agar custom ovoz bo'lsa, gender ni aniqlash
        if voice_name in (config.get("male"), ):
            gender = "Male"
        
        ssml = (
            f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{lang}'>"
            f"<voice name='{voice_name}'>"
            f"<prosody rate='{rate}' pitch='{pitch}'>"
            f"{escaped_text}"
            f"</prosody>"
            f"</voice>"
            f"</speak>"
        )
        return ssml
    
    # ===== TTS — Text-to-Speech =====
    
    async def generate_speech(
        self,
        text: str,
        voice_name: str = "uz-UZ-MadinaNeural",
        language: Optional[str] = None,
        audio_format: str = "mp3",
        rate: str = "0%",
        pitch: str = "0%",
    ) -> bytes:
        """
        Matnni nutqqa aylantirish (TTS).
        
        Args:
            text: Aylantirilishi kerak bo'lgan matn
            voice_name: Azure ovoz nomi (masalan: uz-UZ-MadinaNeural)
            language: Til kodi (masalan: uz-UZ). None bo'lsa, ovozdan aniqlanadi
            audio_format: Audio formati: mp3, mp3-hd, wav, ogg
            rate: Tezlik (-50% dan +50% gacha)
            pitch: Ohang (-50% dan +50% gacha)
            
        Returns:
            bytes: Audio ma'lumotlar
        """
        self._check_config()
        
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Matn kiritilmadi")
        
        token = await self._get_access_token()
        ssml = self._build_ssml(text, voice_name, language, rate, pitch)
        
        output_format = AUDIO_FORMATS.get(audio_format, AUDIO_FORMATS["mp3"])
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": output_format,
            "User-Agent": "Alif24-Platform"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.tts_url,
                    headers=headers,
                    content=ssml.encode("utf-8")
                )
                response.raise_for_status()
                logger.info(f"TTS success: voice={voice_name}, len={len(text)} chars, audio={len(response.content)} bytes")
                return response.content
        except httpx.HTTPStatusError as e:
            error_text = e.response.text[:200] if e.response else "Unknown"
            logger.error(f"Azure TTS HTTP error: {e.response.status_code} - {error_text}")
            raise HTTPException(status_code=500, detail=f"TTS xatoligi: {e.response.status_code}")
        except httpx.TimeoutException:
            logger.error("Azure TTS timeout")
            raise HTTPException(status_code=504, detail="TTS vaqt tugadi. Qayta urinib ko'ring.")
        except Exception as e:
            logger.error(f"Azure TTS error: {e}")
            raise HTTPException(status_code=500, detail=f"TTS xatoligi: {e}")
    
    async def generate_speech_for_language(
        self,
        text: str,
        language: str = "uz-UZ",
        gender: str = "female",
        audio_format: str = "mp3",
    ) -> bytes:
        """
        Til kodi bo'yicha TTS — ovozni avtomatik tanlaydi.
        
        Args:
            text: Matn
            language: uz-UZ, ru-RU, en-US
            gender: female yoki male
            audio_format: mp3, mp3-hd, wav, ogg
        """
        voice_name = get_voice_for_language(language, gender)
        return await self.generate_speech(text, voice_name, language, audio_format)
    
    # ===== STT — Speech-to-Text =====
    
    async def recognize_speech(
        self,
        audio_data: bytes,
        language: str = "uz-UZ",
        audio_format: str = "audio/wav",
    ) -> Dict[str, Any]:
        """
        Nutqni matnga aylantirish (STT) — Azure Speech REST API.
        
        Args:
            audio_data: Audio ma'lumotlar (WAV, OGG, MP3)
            language: Til kodi (uz-UZ, ru-RU, en-US)
            audio_format: Audio content-type (audio/wav, audio/ogg, audio/mpeg)
            
        Returns:
            dict: {
                "text": "Tanilgan matn",
                "confidence": 0.95,
                "language": "uz-UZ",
                "status": "Success" | "NoMatch" | "Error"
            }
        """
        self._check_config()
        
        if not audio_data:
            return {"text": "", "confidence": 0, "language": language, "status": "Error", "error": "Audio ma'lumot yo'q"}
        
        token = await self._get_access_token()
        
        stt_url = f"{self.stt_url}?language={language}&format=detailed"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": audio_format,
            "Accept": "application/json",
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    stt_url,
                    headers=headers,
                    content=audio_data
                )
                response.raise_for_status()
                result = response.json()
                
                recognition_status = result.get("RecognitionStatus", "Error")
                
                if recognition_status == "Success":
                    # Detailed formatda NBest massivi keladi
                    nbest = result.get("NBest", [])
                    if nbest:
                        best = nbest[0]
                        text = best.get("Display", best.get("Lexical", ""))
                        confidence = best.get("Confidence", 0)
                    else:
                        text = result.get("DisplayText", "")
                        confidence = 0.9
                    
                    logger.info(f"STT success: lang={language}, text='{text[:50]}...', confidence={confidence}")
                    return {
                        "text": text,
                        "confidence": confidence,
                        "language": language,
                        "status": "Success"
                    }
                elif recognition_status == "NoMatch":
                    logger.info(f"STT NoMatch: lang={language}")
                    return {
                        "text": "",
                        "confidence": 0,
                        "language": language,
                        "status": "NoMatch",
                        "error": "Ovoz aniqlanmadi"
                    }
                else:
                    logger.warning(f"STT status: {recognition_status}")
                    return {
                        "text": "",
                        "confidence": 0,
                        "language": language,
                        "status": recognition_status,
                        "error": f"STT holati: {recognition_status}"
                    }
                    
        except httpx.HTTPStatusError as e:
            error_text = e.response.text[:200] if e.response else "Unknown"
            logger.error(f"Azure STT HTTP error: {e.response.status_code} - {error_text}")
            return {
                "text": "", "confidence": 0, "language": language,
                "status": "Error", "error": f"STT xatoligi: {e.response.status_code}"
            }
        except httpx.TimeoutException:
            logger.error("Azure STT timeout")
            return {
                "text": "", "confidence": 0, "language": language,
                "status": "Error", "error": "STT vaqt tugadi"
            }
        except Exception as e:
            logger.error(f"Azure STT error: {e}")
            return {
                "text": "", "confidence": 0, "language": language,
                "status": "Error", "error": str(e)
            }
    
    # ===== Yordamchi metodlar =====
    
    async def get_token_for_client(self) -> Dict[str, str]:
        """
        Frontend SDK uchun token va region qaytarish.
        Frontend bu tokenni SpeechConfig.fromAuthorizationToken() da ishlatadi.
        """
        token = await self._get_access_token()
        return {
            "token": token,
            "region": self.speech_region
        }
    
    def get_available_voices(self) -> Dict[str, Any]:
        """Mavjud ovozlar ro'yxatini qaytarish"""
        return {
            lang: {
                "name": config["name"],
                "female": config["female"],
                "male": config["male"],
                "default": config["default"],
            }
            for lang, config in VOICE_CONFIG.items()
        }


# Singleton instance
speech_service = AzureSpeechService()

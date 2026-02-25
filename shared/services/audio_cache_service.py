"""
Audio Cache Service — TTS audio fayllarni cache qilish uchun
 Hikoyalar uchun TTS audio tezroq va arzonroq xizmat qilish uchun
"""
import hashlib
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from shared.database.models.audio_cache import AudioCache

logger = logging.getLogger(__name__)


class AudioCacheService:
    """
    TTS audio caching — bir xil matn uchun audio bir marta yaratiladi
    Keyingi so'rovlarda cached audio qaytariladi
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def generate_cache_key(text: str, language: str = "uz", voice_gender: str = "female") -> str:
        """Cache key yaratish — matn hash + til + ovoz"""
        text_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
        return f"tts_{language}_{voice_gender}_{text_hash}"

    @staticmethod
    def generate_text_hash(text: str) -> str:
        """Matn SHA256 hash"""
        return hashlib.sha256(text.encode()).hexdigest()

    async def get_cached_audio(
        self,
        text: str,
        language: str = "uz",
        voice_gender: str = "female"
    ) -> Optional[dict]:
        """Cache dan audio olish (agar mavjud bo'lsa)"""
        cache_key = self.generate_cache_key(text, language, voice_gender)

        result = await self.db.execute(
            select(AudioCache).where(AudioCache.cache_key == cache_key)
        )
        cached = result.scalars().first()

        if cached:
            # Hit count oshirish
            cached.hit_count += 1
            await self.db.commit()

            logger.info(f"Audio cache HIT: {cache_key} (hits: {cached.hit_count})")
            return {
                "audio_data": cached.audio_data,
                "audio_url": cached.audio_url,
                "file_size": cached.file_size,
                "duration_seconds": cached.duration_seconds,
                "cached": True,
            }

        logger.info(f"Audio cache MISS: {cache_key}")
        return None

    async def save_audio_to_cache(
        self,
        text: str,
        audio_data: str,  # Base64 encoded
        language: str = "uz",
        voice_gender: str = "female",
        file_size: Optional[int] = None,
        duration_seconds: Optional[float] = None,
    ) -> AudioCache:
        """Audio ni cache ga saqlash"""
        cache_key = self.generate_cache_key(text, language, voice_gender)
        text_hash = self.generate_text_hash(text)

        # Eski cache ni tekshirish
        result = await self.db.execute(
            select(AudioCache).where(AudioCache.cache_key == cache_key)
        )
        existing = result.scalars().first()

        if existing:
            # Yangilash
            existing.audio_data = audio_data
            existing.audio_url = None
            existing.file_size = file_size
            existing.duration_seconds = duration_seconds
            existing.hit_count += 1
            await self.db.commit()
            await self.db.refresh(existing)
            logger.info(f"Audio cache UPDATED: {cache_key}")
            return existing

        # Yangi yaratish
        cached = AudioCache(
            cache_key=cache_key,
            text_hash=text_hash,
            language=language,
            voice_gender=voice_gender,
            audio_data=audio_data,
            file_size=file_size,
            duration_seconds=duration_seconds,
            hit_count=1,
        )
        self.db.add(cached)
        await self.db.commit()
        await self.db.refresh(cached)

        logger.info(f"Audio cache CREATED: {cache_key}")
        return cached


# Singleton helper
_cache_service_instance = None


def get_audio_cache_service(db: AsyncSession) -> AudioCacheService:
    """Audio cache service olish"""
    return AudioCacheService(db)

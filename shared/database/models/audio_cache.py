"""
Audio Cache Model — TTS audio fayllarni cache qilish uchun
Hikoyalar uchun TTS audio tezroq va arzonroq xizmat qilish uchun
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class AudioCache(Base):
    """
    Hikoya TTS audio cache — bir marta yaratiladi, ko'p marta ishlatiladi
    """
    __tablename__ = "audio_cache"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)

    # Cache kaliti — text hash yoki story_id + language + voice
    cache_key = Column(String(100), unique=True, nullable=False, index=True)

    # Audio fayl ma'lumotlari
    text_hash = Column(String(64), nullable=False)  # SHA256 hash of text
    language = Column(String(10), default="uz")
    voice_gender = Column(String(10), default="female")  # male/female

    # Audio fayl (blob yoki file path)
    audio_data = Column(Text, nullable=True)  # Base64 encoded audio (for small files)
    audio_url = Column(String(500), nullable=True)  # URL for larger files (Azure Blob)

    # Metadata
    file_size = Column(Integer, nullable=True)  # bytes
    duration_seconds = Column(Float, nullable=True)  # audio duration

    # Stats
    hit_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<AudioCache key={self.cache_key} hits={self.hit_count}>"


__all__ = ["AudioCache"]

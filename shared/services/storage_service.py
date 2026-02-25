"""
Storage Service — Ovoz yozuvlarini serverda saqlash
Local file system — /app/uploads/audio/
"""
import os
import uuid
import logging
import aiofiles
from typing import Optional

logger = logging.getLogger(__name__)

# Local storage config
UPLOAD_DIR = os.getenv("AUDIO_UPLOAD_DIR", "/app/uploads/audio")
# Public URL prefix — Nginx /api/uploads/ ga proxy qilgan
AUDIO_URL_PREFIX = os.getenv("AUDIO_URL_PREFIX", "/api/uploads/audio")


class StorageService:
    """
    Voice recordings storage — Local file system
    """

    def __init__(self):
        self.upload_dir = UPLOAD_DIR
        self.url_prefix = AUDIO_URL_PREFIX
        # Papka mavjudligini tekshirish
        os.makedirs(self.upload_dir, exist_ok=True)

    def _generate_filename(self, session_id: str, extension: str = "webm") -> str:
        """Yangi fayl nomi yaratish"""
        unique_id = uuid.uuid4().hex[:8]
        return f"reading_{session_id}_{unique_id}.{extension}"

    async def save_audio(
        self,
        audio_data: bytes,
        session_id: str,
        extension: str = "webm"
    ) -> dict:
        """
        Ovoz faylini local serverga saqlash

        Args:
            audio_data: Ovoz fayli baytlari
            session_id: Reading session ID
            extension: Fayl kengaytmasi (webm, wav, mp3)

        Returns:
            dict: {url, filename, file_size}
        """
        filename = self._generate_filename(session_id, extension)
        filepath = os.path.join(self.upload_dir, filename)

        try:
            async with aiofiles.open(filepath, "wb") as f:
                await f.write(audio_data)

            file_size = len(audio_data)
            file_url = f"{self.url_prefix}/{filename}"

            logger.info(f"Saved audio: {filename} ({file_size} bytes)")

            return {
                "url": file_url,
                "filename": filename,
                "file_size": file_size,
            }

        except Exception as e:
            logger.error(f"Audio save error: {e}")
            raise Exception(f"Audio saqlashda xatolik: {str(e)}")

    async def delete_audio(self, filename: str) -> bool:
        """Ovoz faylini o'chirish"""
        try:
            filepath = os.path.join(self.upload_dir, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"Deleted audio: {filename}")
                return True
            return False
        except Exception as e:
            logger.error(f"Audio delete error: {e}")
            return False

    async def get_audio_url(self, filename: str) -> Optional[str]:
        """Fayl URL olish"""
        return f"{self.url_prefix}/{filename}"

    async def get_audio_data(self, filename: str) -> Optional[bytes]:
        """Fayl ma'lumotlarini olish"""
        try:
            filepath = os.path.join(self.upload_dir, filename)
            if not os.path.exists(filepath):
                return None
            async with aiofiles.open(filepath, "rb") as f:
                return await f.read()
        except Exception as e:
            logger.error(f"Audio read error: {e}")
            return None


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Storage service olish (singleton)"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
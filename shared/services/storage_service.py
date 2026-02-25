"""
Storage Service — Ovoz yozuvlarini saqlash uchun
Azure Blob Storage ishlatiladi
"""
import os
import uuid
import logging
from typing import Optional
from io import BytesIO

logger = logging.getLogger(__name__)

# Azure Blob config
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME", "audiostories")
BLOB_BASE_URL = os.getenv("BLOB_BASE_URL", "https://alif24storage.blob.core.windows.net/audiostories")


class StorageService:
    """
    Voice recordings storage — Azure Blob Storage
    """

    def __init__(self):
        self.container_name = AZURE_CONTAINER_NAME
        self.base_url = BLOB_BASE_URL
        self.connection_string = AZURE_STORAGE_CONNECTION_STRING
        self._blob_service = None

    def _get_blob_service(self):
        """Azure Blob Service olish (lazy load)"""
        if self._blob_service is None:
            from azure.storage.blob import BlobServiceClient
            self._blob_service = BlobServiceClient.from_connection_string(
                self.connection_string
            )
        return self._blob_service

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
        Ovoz faylini Azure Blob Storage ga saqlash

        Args:
            audio_data: Ovoz fayli baytlari
            session_id: Reading session ID
            extension: Fayl kengaytmasi (webm, wav, mp3)

        Returns:
            dict: {url, filename, file_size}
        """
        filename = self._generate_filename(session_id, extension)

        try:
            blob_service = self._get_blob_service()
            container_client = blob_service.get_container_client(self.container_name)
            blob_client = container_client.get_blob_client(filename)

            # Upload blob
            blob_client.upload_blob(audio_data, overwrite=True)

            file_size = len(audio_data)
            file_url = f"{self.base_url}/{filename}"

            logger.info(f"Saved audio to Azure Blob: {filename} ({file_size} bytes)")

            return {
                "url": file_url,
                "filename": filename,
                "file_size": file_size,
            }

        except Exception as e:
            logger.error(f"Azure Blob upload error: {e}")
            raise Exception(f"Audio saqlashda xatolik: {str(e)}")

    async def delete_audio(self, filename: str) -> bool:
        """Ovoz faylini o'chirish"""
        try:
            blob_service = self._get_blob_service()
            container_client = blob_service.get_container_client(self.container_name)
            blob_client = container_client.get_blob_client(filename)

            blob_client.delete_blob()
            logger.info(f"Deleted audio from Azure Blob: {filename}")
            return True

        except Exception as e:
            logger.error(f"Azure Blob delete error: {e}")
            return False

    async def get_audio_url(self, filename: str) -> Optional[str]:
        """Fayl URL olish"""
        return f"{self.base_url}/{filename}"

    async def get_audio_data(self, filename: str) -> Optional[bytes]:
        """Fayl ma'lumotlarini olish"""
        try:
            blob_service = self._get_blob_service()
            container_client = blob_service.get_container_client(self.container_name)
            blob_client = container_client.get_blob_client(filename)

            download = blob_client.download_blob()
            return download.readall()

        except Exception as e:
            logger.error(f"Azure Blob download error: {e}")
            return None


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Storage service olish (singleton)"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
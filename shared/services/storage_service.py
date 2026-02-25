"""
Storage Service — Ovoz yozuvlarini serverda saqlash
Azure Blob Storage Container
"""
import os
import uuid
import logging
from typing import Optional
from azure.storage.blob.aio import BlobServiceClient
from azure.core.exceptions import ResourceExistsError

logger = logging.getLogger(__name__)

AZURE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME", "audiostories")

class StorageService:
    """
    Voice recordings storage — Azure Blob Storage (Cloud)
    """

    def __init__(self):
        self.connection_string = AZURE_CONNECTION_STRING
        self.container_name = CONTAINER_NAME
        self.blob_service_client = None
        self.container_client = None

        if self.connection_string:
            try:
                self.blob_service_client = BlobServiceClient.from_connection_string(self.connection_string)
                self.container_client = self.blob_service_client.get_container_client(self.container_name)
                logger.info("Successfully connected to Azure Blob Storage.")
            except Exception as e:
                logger.error(f"Failed to initialize Azure Blob Storage: {e}")

    async def _ensure_container(self):
        """Konteyner mavjudligini tekshiradi va yo'q bo'lsa yaratadi."""
        if self.container_client:
            try:
                await self.container_client.create_container()
            except ResourceExistsError:
                pass
            except Exception as e:
                logger.error(f"Error checking/creating container: {e}")

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
        Ovoz faylini Azure Blob ga saqlash

        Args:
            audio_data: Ovoz fayli baytlari
            session_id: Reading session ID
            extension: Fayl kengaytmasi (webm, wav, mp3)

        Returns:
            dict: {url, filename, file_size}
        """
        if not self.container_client:
            raise Exception("Azure Storage is not configured properly. Missing AZURE_STORAGE_CONNECTION_STRING.")

        await self._ensure_container()
        filename = self._generate_filename(session_id, extension)
        
        try:
            blob_client = self.container_client.get_blob_client(filename)
            await blob_client.upload_blob(audio_data, overwrite=True)
            
            # Using the primary endpoint URL of the blob
            file_url = blob_client.url
            file_size = len(audio_data)

            logger.info(f"Saved audio to Azure: {filename} ({file_size} bytes)")

            return {
                "url": file_url,
                "filename": filename,
                "file_size": file_size,
            }

        except Exception as e:
            logger.error(f"Azure audio save error: {e}")
            raise Exception(f"Audio saqlashda xatolik: {str(e)}")

    async def delete_audio(self, filename: str) -> bool:
        """Ovoz faylini Azure'dan o'chirish"""
        if not self.container_client:
            return False
            
        try:
            blob_client = self.container_client.get_blob_client(filename)
            await blob_client.delete_blob()
            logger.info(f"Deleted audio from Azure: {filename}")
            return True
        except Exception as e:
            logger.error(f"Azure audio delete error: {e}")
            return False

    async def get_audio_url(self, filename: str) -> Optional[str]:
        """Fayl public URL manzilini olish"""
        if not self.container_client:
            return None
        return self.container_client.get_blob_client(filename).url

    async def get_audio_data(self, filename: str) -> Optional[bytes]:
        """Fayl ma'lumotlarini (bytes) o'qib olish (Masalan STT qilish uchun)"""
        if not self.container_client:
            return None
            
        try:
            blob_client = self.container_client.get_blob_client(filename)
            download_stream = await blob_client.download_blob()
            return await download_stream.readall()
        except Exception as e:
            logger.error(f"Azure audio read error: {e}")
            return None


# Singleton instance
_storage_service: Optional[StorageService] = None

def get_storage_service() -> StorageService:
    """Storage service olish (singleton)"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
"""Harf Platform Configuration - Fallback to default values"""

import os
from typing import Optional

class Settings:
    APP_NAME: str = "Harf Platform"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:alif24_secure_password@postgres:5432/alif24"
    )

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secure_jwt_secret_key_for_local_development_only_12345")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Azure Speech (optional)
    AZURE_SPEECH_KEY: Optional[str] = os.getenv("AZURE_SPEECH_KEY", None)
    AZURE_SPEECH_REGION: str = os.getenv("AZURE_SPEECH_REGION", "eastus")

    # Azure Storage (optional)
    AZURE_STORAGE_CONNECTION: Optional[str] = os.getenv("AZURE_STORAGE_CONNECTION_STRING", None)

    # Audio
    AUDIO_BASE_URL: str = os.getenv("AUDIO_BASE_URL", "https://alif24storage.blob.core.windows.net/harflar")


settings = Settings()
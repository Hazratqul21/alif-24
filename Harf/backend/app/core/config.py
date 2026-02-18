"""Harf Platform Configuration"""

import os
from typing import Optional


class Settings:
    """Application settings"""
    
    # App
    APP_NAME: str = "Harf Platform"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    API_PREFIX: str = "/api/v1"
    
    # Database (from shared - requires DATABASE_URL env var)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # JWT (from shared)
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Azure Services
    AZURE_SPEECH_KEY: Optional[str] = os.getenv("AZURE_SPEECH_KEY")
    AZURE_SPEECH_REGION: str = os.getenv("AZURE_SPEECH_REGION", "eastus")
    
    # Storage
    AZURE_STORAGE_CONNECTION: Optional[str] = os.getenv("AZURE_STORAGE_CONNECTION")
    
    # Audio Settings
    AUDIO_BASE_URL: str = os.getenv(
        "AUDIO_BASE_URL",
        "https://alif24storage.blob.core.windows.net/harflar"
    )


settings = Settings()

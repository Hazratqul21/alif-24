"""Harf Platform Configuration — hardcoded for VDS"""

import os
from typing import Optional


class Settings:
    # App
    APP_NAME: str = "Harf Platform"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:alif24_secure_password@postgres:5432/alif24"
    )

    # JWT
    JWT_SECRET: str = "super_secure_jwt_secret_key_for_local_development_only_12345"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Azure Speech
    AZURE_SPEECH_KEY: str = "54V9TJPS3HtXlzdnmUY0sgRv6NtugLsgFcf2s3yZlwS0Ogint3u6JQQJ99BLACYeBjFXJ3w3AAAYACOGlQP9"
    AZURE_SPEECH_REGION: str = "eastus"

    # Azure Storage
    AZURE_STORAGE_CONNECTION: str = "DefaultEndpointsProtocol=https;AccountName=alifbe24;AccountKey=kNOPukOWmPce4VbxB7FSXL4SgVMml4zXkMTPdouqFhRLJwvp0Cp3rNpxFb3pkA766hfa00BBHSjR+AStteDO3Q==;EndpointSuffix=core.windows.net"

    # Audio
    AUDIO_BASE_URL: str = "https://alif24storage.blob.core.windows.net/harflar"


settings = Settings()

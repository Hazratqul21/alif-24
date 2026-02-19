"""Lessions Platform Configuration — hardcoded for VDS"""

import os
from typing import Optional


class Settings:
    # App
    APP_NAME: str = "Lessions Platform"
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


settings = Settings()

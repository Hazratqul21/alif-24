"""Olimp Platform Configuration"""

import os
from typing import Optional


class Settings:
    """Application settings"""

    # App
    APP_NAME: str = "Olimp Platform"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    API_PREFIX: str = "/api/v1"

    # Database (from shared - requires DATABASE_URL env var)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # JWT (from shared)
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30


settings = Settings()

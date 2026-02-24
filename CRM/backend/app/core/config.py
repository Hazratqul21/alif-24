"""CRM Platform Configuration"""

import os

class Settings:
    APP_NAME: str = "CRM Platform"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    API_PREFIX: str = "/api/v1"

    # Database — REQUIRED
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is required!")

    # JWT — REQUIRED
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    if not JWT_SECRET:
        raise ValueError("JWT_SECRET environment variable is required!")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Telegram (optional)
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")


settings = Settings()
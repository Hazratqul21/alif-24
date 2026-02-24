"""CRM Platform Configuration - Fallback to default values"""

import os

class Settings:
    APP_NAME: str = "CRM Platform"
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

    # Telegram (optional)
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "8379431489:AAH2xUGuEy0_FZV8vnN8_vyIII13VqDPryU")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "234413715")


settings = Settings()
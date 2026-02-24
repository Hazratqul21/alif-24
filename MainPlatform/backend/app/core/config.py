"""
Configuration for MainPlatform
All secrets MUST be set via environment variables
"""

import os
from typing import Optional

class Settings:
    # Server
    NODE_ENV: str = os.getenv("NODE_ENV", "production")
    PORT: int = int(os.getenv("PORT", "8000"))
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is required!")

    # JWT — REQUIRED
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    if not JWT_SECRET:
        raise ValueError("JWT_SECRET environment variable is required!")

    JWT_EXPIRES_IN: str = os.getenv("JWT_EXPIRES_IN", "7d")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "")
    if not JWT_REFRESH_SECRET:
        raise ValueError("JWT_REFRESH_SECRET environment variable is required!")
    JWT_REFRESH_EXPIRES_IN: str = os.getenv("JWT_REFRESH_EXPIRES_IN", "30d")
    JWT_ALGORITHM: str = "HS256"

    # OpenAI (SmartKids / MathKids) — REQUIRED
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable is required!")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Azure OpenAI (optional - fallback)
    AZURE_OPENAI_KEY: Optional[str] = os.getenv("AZURE_OPENAI_KEY", None)
    AZURE_OPENAI_ENDPOINT: Optional[str] = os.getenv("AZURE_OPENAI_ENDPOINT", None)
    AZURE_OPENAI_DEPLOYMENT_NAME: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
    AZURE_OPENAI_REGION: Optional[str] = os.getenv("AZURE_OPENAI_REGION", None)

    # Azure Speech (optional - for TTS/STT)
    AZURE_SPEECH_KEY: Optional[str] = os.getenv("AZURE_SPEECH_KEY", None)
    AZURE_SPEECH_REGION: str = os.getenv("AZURE_SPEECH_REGION", "eastus")

    # Azure Storage (optional - for file uploads)
    AZURE_STORAGE_CONNECTION_STRING: Optional[str] = os.getenv("AZURE_STORAGE_CONNECTION_STRING", None)
    AZURE_CONTAINER_NAME: str = os.getenv("AZURE_CONTAINER_NAME", "audiostories")

    # Admin & Security — REQUIRED
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "")
    if not ADMIN_SECRET_KEY:
        raise ValueError("ADMIN_SECRET_KEY environment variable is required!")

    # Telegram — REQUIRED
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required!")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    if not TELEGRAM_CHAT_ID:
        raise ValueError("TELEGRAM_CHAT_ID environment variable is required!")

    # Eskiz SMS (optional)
    ESKIZ_EMAIL: Optional[str] = os.getenv("ESKIZ_EMAIL", None)
    ESKIZ_PASSWORD: Optional[str] = os.getenv("ESKIZ_PASSWORD", None)

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN", None)

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")

    # Rate Limiting
    RATE_LIMIT_WINDOW_MS: int = int(os.getenv("RATE_LIMIT_WINDOW_MS", "900000"))
    RATE_LIMIT_MAX: int = int(os.getenv("RATE_LIMIT_MAX", "100"))


settings = Settings()
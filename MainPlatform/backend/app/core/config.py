"""
Configuration for MainPlatform
All secrets must be provided via environment variables (.env file)
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    # Server
    NODE_ENV: str = os.getenv("NODE_ENV", "production")
    PORT: int = int(os.getenv("PORT", "8000"))
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Database (uses shared - DATABASE_URL from .env)
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

    # JWT (uses shared)
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_EXPIRES_IN: str = os.getenv("JWT_EXPIRES_IN", "7d")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "")
    JWT_REFRESH_EXPIRES_IN: str = os.getenv("JWT_REFRESH_EXPIRES_IN", "30d")
    JWT_ALGORITHM: str = "HS256"

    # OpenAI (SmartKids/MathKids)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")

    # Azure
    AZURE_STORAGE_CONNECTION_STRING: str = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
    AZURE_CONTAINER_NAME: str = os.getenv("AZURE_CONTAINER_NAME", "audiostories")
    AZURE_SPEECH_KEY: str = os.getenv("AZURE_SPEECH_KEY", "")
    AZURE_SPEECH_REGION: str = os.getenv("AZURE_SPEECH_REGION", "eastus")
    AZURE_OPENAI_KEY: str = os.getenv("AZURE_OPENAI_KEY", "")
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_REGION: Optional[str] = os.getenv("AZURE_OPENAI_REGION")
    AZURE_OPENAI_DEPLOYMENT_NAME: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-5-chat")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

    # Admin & Security
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "alif24_rahbariyat26!")

    # Telegram & Notification
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    ESKIZ_EMAIL: Optional[str] = os.getenv("ESKIZ_EMAIL")
    ESKIZ_PASSWORD: Optional[str] = os.getenv("ESKIZ_PASSWORD")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")

    # CORS - comma-separated origins, e.g. "https://alif24.uz,https://harf.alif24.uz"
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")

    # Rate Limiting
    RATE_LIMIT_WINDOW_MS: int = 900000
    RATE_LIMIT_MAX: int = 100

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"

settings = Settings()


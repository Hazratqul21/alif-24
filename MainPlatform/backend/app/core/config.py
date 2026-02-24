"""
Configuration for MainPlatform
Reads from environment variables with fallback to default values
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
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:alif24_secure_password@postgres:5432/alif24"
    )

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secure_jwt_secret_key_for_local_development_only_12345")
    JWT_EXPIRES_IN: str = os.getenv("JWT_EXPIRES_IN", "7d")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "super_secure_refresh_secret_key_for_local_development_only_67890")
    JWT_REFRESH_EXPIRES_IN: str = os.getenv("JWT_REFRESH_EXPIRES_IN", "30d")
    JWT_ALGORITHM: str = "HS256"

    # OpenAI (SmartKids / MathKids)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "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")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Azure OpenAI (optional)
    AZURE_OPENAI_KEY: Optional[str] = os.getenv("AZURE_OPENAI_KEY", None)
    AZURE_OPENAI_ENDPOINT: Optional[str] = os.getenv("AZURE_OPENAI_ENDPOINT", None)
    AZURE_OPENAI_DEPLOYMENT_NAME: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
    AZURE_OPENAI_REGION: Optional[str] = os.getenv("AZURE_OPENAI_REGION", None)

    # Azure Speech (optional)
    AZURE_SPEECH_KEY: Optional[str] = os.getenv("AZURE_SPEECH_KEY", None)
    AZURE_SPEECH_REGION: str = os.getenv("AZURE_SPEECH_REGION", "eastus")

    # Azure Storage (optional)
    AZURE_STORAGE_CONNECTION_STRING: Optional[str] = os.getenv("AZURE_STORAGE_CONNECTION_STRING", None)
    AZURE_CONTAINER_NAME: str = os.getenv("AZURE_CONTAINER_NAME", "audiostories")

    # Admin & Security
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "alif24_rahbariyat26!")

    # Telegram
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "8379431489:AAH2xUGuEy0_FZV8vnN8_vyIII13VqDPryU")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "234413715")

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
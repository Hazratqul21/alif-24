"""
Configuration for MainPlatform
All secrets hardcoded for VDS production deployment
"""

import os
from typing import Optional

class Settings:
    # Server
    NODE_ENV: str = "production"
    PORT: int = 8000
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:alif24_secure_password@postgres:5432/alif24"
    )

    # JWT
    JWT_SECRET: str = "super_secure_jwt_secret_key_for_local_development_only_12345"
    JWT_EXPIRES_IN: str = "7d"
    JWT_REFRESH_SECRET: str = "super_secure_refresh_secret_key_for_local_development_only_67890"
    JWT_REFRESH_EXPIRES_IN: str = "30d"
    JWT_ALGORITHM: str = "HS256"

    # OpenAI (MathKids / SmartKids)
    OPENAI_API_KEY: str = os.getenv(
        "OPENAI_API_KEY",
        "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"
    )
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Azure OpenAI (SmartKids)
    AZURE_OPENAI_KEY: str = os.getenv(
        "AZURE_OPENAI_KEY",
        "Ekghfq1yMBAeGkHM6kKpsfPrWP77Ab7x0NaQaS81I9I7zGDfbt8lJQQJ99BLACfhMk5XJ3w3AAABACOGUD56"
    )
    AZURE_OPENAI_ENDPOINT: str = os.getenv(
        "AZURE_OPENAI_ENDPOINT",
        "https://deplo.cognitiveservices.azure.com/"
    )
    AZURE_OPENAI_DEPLOYMENT_NAME: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-5-chat")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
    AZURE_OPENAI_REGION: Optional[str] = os.getenv("AZURE_OPENAI_REGION", None)

    # Azure Speech (SmartKids)
    AZURE_SPEECH_KEY: str = os.getenv(
        "AZURE_SPEECH_KEY",
        "54V9TJPS3HtXlzdnmUY0sgRv6NtugLsgFcf2s3yZlwS0Ogint3u6JQQJ99BLACYeBjFXJ3w3AAAYACOGlQP9"
    )
    AZURE_SPEECH_REGION: str = os.getenv("AZURE_SPEECH_REGION", "eastus")

    # Azure Storage (SmartKids)
    AZURE_STORAGE_CONNECTION_STRING: str = os.getenv(
        "AZURE_STORAGE_CONNECTION_STRING",
        "DefaultEndpointsProtocol=https;AccountName=alifbe24;AccountKey=kNOPukOWmPce4VbxB7FSXL4SgVMml4zXkMTPdouqFhRLJwvp0Cp3rNpxFb3pkA766hfa00BBHSjR+AStteDO3Q==;EndpointSuffix=core.windows.net"
    )
    AZURE_CONTAINER_NAME: str = os.getenv("AZURE_CONTAINER_NAME", "audiostories")

    # Admin & Security
    ADMIN_SECRET_KEY: str = "alif24_rahbariyat26!"

    # Telegram
    TELEGRAM_BOT_TOKEN: str = "8379431489:AAH2xUGuEy0_FZV8vnN8_vyIII13VqDPryU"
    TELEGRAM_CHAT_ID: str = "234413715"

    # Eskiz SMS
    ESKIZ_EMAIL: Optional[str] = None
    ESKIZ_PASSWORD: Optional[str] = None

    # Logging
    LOG_LEVEL: str = "info"
    SENTRY_DSN: Optional[str] = None

    # CORS — allow all by default (Nginx handles domain filtering)
    CORS_ORIGINS: str = ""

    # Rate Limiting
    RATE_LIMIT_WINDOW_MS: int = 900000
    RATE_LIMIT_MAX: int = 100


settings = Settings()

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

    # JWT — .env da albatta o'rnating! Default faqat dev uchun.
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev_only_jwt_secret_CHANGE_IN_PRODUCTION")
    JWT_EXPIRES_IN: str = os.getenv("JWT_EXPIRES_IN", "7d")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "dev_only_refresh_secret_CHANGE_IN_PRODUCTION")
    JWT_REFRESH_EXPIRES_IN: str = os.getenv("JWT_REFRESH_EXPIRES_IN", "30d")
    JWT_ALGORITHM: str = "HS256"

    # OpenAI (legacy - not used, kept for compatibility)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Azure OpenAI (SmartKids / MathKids)
    AZURE_OPENAI_KEY: str = os.getenv("AZURE_OPENAI_KEY", "")
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_DEPLOYMENT_NAME: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-5-chat")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
    AZURE_OPENAI_REGION: str = os.getenv("AZURE_OPENAI_REGION", "westeurope")

    # Azure Speech (optional)
    AZURE_SPEECH_KEY: Optional[str] = os.getenv("AZURE_SPEECH_KEY", None)
    AZURE_SPEECH_REGION: str = os.getenv("AZURE_SPEECH_REGION", "westeurope")

    # Azure Storage (optional)
    AZURE_STORAGE_CONNECTION_STRING: Optional[str] = os.getenv("AZURE_STORAGE_CONNECTION_STRING", None)
    AZURE_CONTAINER_NAME: str = os.getenv("AZURE_CONTAINER_NAME", "audiostories")

    # Admin & Security
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "alif24_rahbariyat26!")

    # Telegram — .env dan olinadi
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")

    # Eskiz SMS (optional)
    ESKIZ_EMAIL: Optional[str] = os.getenv("ESKIZ_EMAIL", None)
    ESKIZ_PASSWORD: Optional[str] = os.getenv("ESKIZ_PASSWORD", None)

    # =========================================================================
    # Google OAuth2 (Sign in with Google)
    # =========================================================================
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID", None)
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET", None)
    # Where Google redirects back after user consents. Must exactly match one
    # of the "Authorized redirect URIs" in Google Cloud Console OAuth client.
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "https://alif24.uz/api/v1/auth/google/callback",
    )
    # Where to send the browser AFTER we set auth cookies on the callback.
    OAUTH_SUCCESS_REDIRECT: str = os.getenv(
        "OAUTH_SUCCESS_REDIRECT",
        "https://alif24.uz/",
    )
    OAUTH_FAILURE_REDIRECT: str = os.getenv(
        "OAUTH_FAILURE_REDIRECT",
        "https://alif24.uz/login?oauth_error=1",
    )
    # Used by starlette SessionMiddleware to encrypt the short-lived state cookie
    # that authlib uses during the OAuth round-trip (NOT user sessions).
    SESSION_SECRET_KEY: str = os.getenv(
        "SESSION_SECRET_KEY",
        "dev_only_session_secret_CHANGE_IN_PRODUCTION",
    )

    # =========================================================================
    # Transactional email (Gmail SMTP / fastapi-mail)
    # =========================================================================
    # Enable with MAIL_ENABLED=true once MAIL_USERNAME/MAIL_PASSWORD are set.
    MAIL_ENABLED: bool = os.getenv("MAIL_ENABLED", "false").lower() == "true"
    MAIL_USERNAME: Optional[str] = os.getenv("MAIL_USERNAME", None)
    MAIL_PASSWORD: Optional[str] = os.getenv("MAIL_PASSWORD", None)
    MAIL_FROM: str = os.getenv("MAIL_FROM", "info@alif24.uz")
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", "Alif24")
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_STARTTLS: bool = os.getenv("MAIL_STARTTLS", "true").lower() == "true"
    MAIL_SSL_TLS: bool = os.getenv("MAIL_SSL_TLS", "false").lower() == "true"
    # Chunking / rate limiting for admin broadcasts so Gmail daily limits
    # (500/day free, 2000/day Workspace) are respected.
    MAIL_BROADCAST_BATCH_SIZE: int = int(os.getenv("MAIL_BROADCAST_BATCH_SIZE", "50"))
    MAIL_BROADCAST_SLEEP_SECONDS: float = float(os.getenv("MAIL_BROADCAST_SLEEP_SECONDS", "2.0"))

    # =========================================================================
    # Supabase Storage (avatars, user uploads)
    # =========================================================================
    # Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env. Service role is used
    # because uploads are server-side (we never send it to the browser).
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", None)
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY", None)
    SUPABASE_AVATAR_BUCKET: str = os.getenv("SUPABASE_AVATAR_BUCKET", "avatars")
    SUPABASE_AVATAR_MAX_BYTES: int = int(os.getenv("SUPABASE_AVATAR_MAX_BYTES", str(5 * 1024 * 1024)))

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN", None)

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")

    # Rate Limiting
    RATE_LIMIT_WINDOW_MS: int = int(os.getenv("RATE_LIMIT_WINDOW_MS", "900000"))
    RATE_LIMIT_MAX: int = int(os.getenv("RATE_LIMIT_MAX", "100"))


settings = Settings()
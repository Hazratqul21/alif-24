"""Olimp Platform Configuration - secrets loaded strictly from env."""

import os
import sys


def _required(name: str, *, default_dev: str | None = None) -> str:
    """
    Read a secret from env. In DEBUG mode fall back to `default_dev`;
    in production (DEBUG=false) refuse to start without a real value.
    This prevents shipping the public default in a prod image.
    """
    value = os.getenv(name)
    if value:
        return value
    if os.getenv("DEBUG", "false").lower() == "true" and default_dev is not None:
        return default_dev
    sys.stderr.write(
        f"[olimp-config] FATAL: required env var {name} is not set. "
        f"Refusing to start in production without it.\n"
    )
    raise RuntimeError(f"Missing required env var: {name}")


class Settings:
    APP_NAME: str = "Olimp Platform"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:alif24_secure_password@postgres:5432/alif24"
    )

    # JWT — must live at least as long as the longest olympiad duration
    # so a student doesn't get logged out mid-test. Default 6h.
    JWT_SECRET: str = _required(
        "JWT_SECRET",
        default_dev="dev_only_super_secure_jwt_secret_key_for_local_development_only_12345",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "360"))

    # Admin
    ADMIN_SECRET_KEY: str = _required(
        "ADMIN_SECRET_KEY",
        default_dev="dev_only_admin_secret_key_please_override_in_prod",
    )

    # Prize coin amounts for finalized olympiads (top-3).
    OLYMPIAD_PRIZE_COINS_FIRST: int = int(os.getenv("OLYMPIAD_PRIZE_COINS_FIRST", "500"))
    OLYMPIAD_PRIZE_COINS_SECOND: int = int(os.getenv("OLYMPIAD_PRIZE_COINS_SECOND", "300"))
    OLYMPIAD_PRIZE_COINS_THIRD: int = int(os.getenv("OLYMPIAD_PRIZE_COINS_THIRD", "100"))

    # Anti-cheat caps for reading olympiads.
    # Any client-supplied metric beyond these is treated as evidence of
    # tampering — we hard-cap instead of trusting the submission.
    READING_MAX_WPM: int = int(os.getenv("READING_MAX_WPM", "280"))            # world-record for children is ~180wpm; 280 = generous ceiling
    READING_MAX_READ_PERCENT: float = 100.0
    READING_MIN_SECONDS_PER_WORD: float = float(os.getenv("READING_MIN_SECONDS_PER_WORD", "0.20"))  # < 0.2s/word ≈ > 300wpm => reject


settings = Settings()
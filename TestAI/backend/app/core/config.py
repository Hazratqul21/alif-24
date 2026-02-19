"""TestAI Platform Configuration — hardcoded for VDS"""

import os
from typing import Optional


class Settings:
    # App
    APP_NAME: str = "TestAI Platform"
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

    # OpenAI
    OPENAI_API_KEY: str = "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"
    OPENAI_MODEL: str = "gpt-4"

    # Quiz Settings
    MAX_PARTICIPANTS_PER_QUIZ: int = 40
    DEFAULT_TIME_PER_QUESTION: int = 30


settings = Settings()

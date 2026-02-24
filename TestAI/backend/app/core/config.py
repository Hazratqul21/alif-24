"""TestAI Platform Configuration - Fallback to default values"""

import os

class Settings:
    APP_NAME: str = "TestAI Platform"
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

    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "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")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Quiz Settings
    MAX_PARTICIPANTS_PER_QUIZ: int = int(os.getenv("MAX_PARTICIPANTS_PER_QUIZ", "40"))
    DEFAULT_TIME_PER_QUESTION: int = int(os.getenv("DEFAULT_TIME_PER_QUESTION", "30"))


settings = Settings()
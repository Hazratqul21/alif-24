"""TestAI Platform Configuration"""

import os

class Settings:
    APP_NAME: str = "TestAI Platform"
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

    # OpenAI — REQUIRED
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable is required!")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Quiz Settings
    MAX_PARTICIPANTS_PER_QUIZ: int = int(os.getenv("MAX_PARTICIPANTS_PER_QUIZ", "40"))
    DEFAULT_TIME_PER_QUESTION: int = int(os.getenv("DEFAULT_TIME_PER_QUESTION", "30"))


settings = Settings()
"""TestAI Platform Configuration"""

import os
from typing import Optional


class Settings:
    """Application settings"""
    
    # App
    APP_NAME: str = "TestAI Platform"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    API_PREFIX: str = "/api/v1"
    
    # Database (from shared - requires DATABASE_URL env var)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # JWT (from shared)
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # OpenAI for AI test generation
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    
    # Quiz Settings
    MAX_PARTICIPANTS_PER_QUIZ: int = 40
    DEFAULT_TIME_PER_QUESTION: int = 30


settings = Settings()

from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    # Server
    NODE_ENV: str = "development"
    PORT: int = 5000  # Docker Compose bilan mos
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: Optional[str] = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "alif24_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_DIALECT: str = "postgresql"
    
    # JWT
    JWT_SECRET: str = "your-secret-key-change-this-in-production"
    JWT_EXPIRES_IN: str = "7d"
    JWT_REFRESH_SECRET: str = "your-refresh-secret-change-this-in-production"
    JWT_REFRESH_EXPIRES_IN: str = "30d"
    JWT_ALGORITHM: str = "HS256"
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4"
    
    # Azure
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_CONTAINER_NAME: str = "alif24-assets"
    AZURE_SPEECH_KEY: Optional[str] = None
    AZURE_SPEECH_REGION: str = "westeurope"
    AZURE_OPENAI_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_REGION: Optional[str] = None
    AZURE_OPENAI_DEPLOYMENT_NAME: Optional[str] = None
    AZURE_OPENAI_API_VERSION: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = "ERROR"  # Production: faqat ERROR va yuqori
    
    # CORS
    CORS_ORIGINS: Optional[str] = None
    CORS_ORIGIN: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_WINDOW_MS: int = 15 * 60 * 1000
    RATE_LIMIT_MAX: int = 100
    
    class Config:
        # .env faylini backend papkasidan qidirish
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"
    
    @property
    def get_database_url(self) -> str:
        # If DATABASE_URL is provided directly (standard for Docker), use it
        if self.DATABASE_URL:
            return self.DATABASE_URL
            
        # PostgreSQL (default)
        dialect = "postgresql" if self.DB_DIALECT in ("postgresql", "postgres") else self.DB_DIALECT
        password_part = f":{self.DB_PASSWORD}" if self.DB_PASSWORD else ""
        return f"{dialect}://{self.DB_USER}{password_part}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def is_development(self) -> bool:
        return self.NODE_ENV == "development"
    
    @property
    def is_production(self) -> bool:
        return self.NODE_ENV == "production"
    
    @property
    def is_test(self) -> bool:
        return self.NODE_ENV == "test"

import logging

# Configure local logger for settings
logger = logging.getLogger(__name__)

# Settings obyektini yaratish
try:
    settings = Settings()
    logger.info(f"✅ Settings loaded from: {os.path.abspath('.env')}")
except Exception as e:
    logger.error(f"❌ Error loading settings: {e}")
    # Fallback settings
    settings = Settings(_env_file=None)
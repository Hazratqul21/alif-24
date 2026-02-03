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
    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or "postgresql://postgres:Xazrat_ali571@db.rvboscxljclteqvlxmeo.supabase.co:5432/postgres"
    DB_HOST: str = "db.rvboscxljclteqvlxmeo.supabase.co"
    DB_PORT: int = 5432
    DB_NAME: str = "postgres"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "Xazrat_ali571"
    DB_DIALECT: str = "postgresql"
    
    # JWT
    JWT_SECRET: str = "f3611a8f90f3e156a3e018e52289758c0bd68e6c6e372c2cfb036f75a2ff2cfa"
    JWT_EXPIRES_IN: str = "7d"
    JWT_REFRESH_SECRET: str = "8d1be0276394ed5252926104b25a0bfb1444e15be3cfd4c0fefd51bb14a96fa2"
    JWT_REFRESH_EXPIRES_IN: str = "30d"
    JWT_ALGORITHM: str = "HS256"
    
    # OpenAI
    OPENAI_API_KEY: str = "your_openai_api_key_here"
    OPENAI_MODEL: str = "gpt-4"
    
    # Azure
    AZURE_STORAGE_CONNECTION_STRING: str = "DefaultEndpointsProtocol=https;AccountName=alifbe24;AccountKey=kNOPukOWmPce4VbxB7FSXL4SgVMml4zXkMTPdouqFhRLJwvp0Cp3rNpxFb3pkA766hfa00BBHSjR+AStteDO3Q==;EndpointSuffix=core.windows.net"
    AZURE_CONTAINER_NAME: str = "audiostories"
    AZURE_SPEECH_KEY: Optional[str] = "54V9TJPS3HtXlzdnmUY0sgRv6NtugLsgFcf2s3yZlwS0Ogint3u6JQQJ99BLACYeBjFXJ3w3AAAYACOGlQP9"
    AZURE_SPEECH_REGION: str = "eastus"
    AZURE_OPENAI_KEY: Optional[str] = "Ekghfq1yMBAeGkHM6kKpsfPrWP77Ab7x0NaQaS81I9I7zGDfbt8lJQQJ99BLACfhMk5XJ3w3AAABACOGUD56"
    AZURE_OPENAI_ENDPOINT: Optional[str] = "https://deplo.cognitiveservices.azure.com/"
    AZURE_OPENAI_REGION: Optional[str] = None
    AZURE_OPENAI_DEPLOYMENT_NAME: Optional[str] = "gpt-5-chat"
    AZURE_OPENAI_API_VERSION: Optional[str] = "2025-01-01-preview"
    
    # Logging
    LOG_LEVEL: str = "info"  # Production: faqat ERROR va yuqori
    
    # CORS
    CORS_ORIGINS: str = "*"
    CORS_ORIGIN: str = "*"
    
    # Rate Limiting
    RATE_LIMIT_WINDOW_MS: int = 900000
    RATE_LIMIT_MAX: int = 100
    
    ADMIN_SECRET_KEY: str = "nurali_secret_2026"
    
    class Config:
        # .env faylini backend papkasidan qidirish
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"
    
    @property
    def get_database_url(self) -> str:
        # If DATABASE_URL is provided directly (standard for Docker/hardcoded), use it
        url = self.DATABASE_URL
        
        # FIX: Vercel serverless functions often don't support IPv6 outbound, but Supabase DNS returns IPv6 first.
        # We must resolve the hostname to an IPv4 address manually to prevent "Cannot assign requested address" errors.
        try:
            if url and "supabase.co" in url:
                import socket
                from urllib.parse import urlparse, urlunparse
                
                parsed = urlparse(url)
                hostname = parsed.hostname
                
                # Resolve to IPv4
                ip_address = socket.gethostbyname(hostname)
                
                # Reconstruct URL with IP address
                # Note: We must pass 'sslmode=require' because using IP might mismatch cert validation 
                # strictly speaking, but usually Supabase allows it if we don't verify-full, 
                # OR we just rely on the fact that we are replacing the host in the string.
                # Actually, sqlalchemy might complain if we replace host with IP without updating headers,
                # but let's try just standard replacement first.
                
                # Better approach: Keep hostname but force IPv4? hard in python url.
                # Let's use the IP. 
                
                # Replace hostname with IP in the netloc
                new_netloc = parsed.netloc.replace(hostname, ip_address)
                parsed = parsed._replace(netloc=new_netloc)
                url = urlunparse(parsed)
                
                # Ensure sslmode is present (Supabase requires it)
                if "sslmode" not in url:
                    if "?" in url:
                        url += "&sslmode=require"
                    else:
                        url += "?sslmode=require"
                        
        except Exception as e:
            print(f"⚠️ DNS Resolution Warning: {e}")
            # Fallback to original URL if resolution fails
            pass

        if url:
             if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql://", 1)
             return url

        # PostgreSQL (default) - Fallback for local dev
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
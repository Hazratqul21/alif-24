"""
Shared Database Session - Umumiy Database sessiyasi
Barcha platformalar uchun bir xil database connection

Production: PostgreSQL ishlatiladi
DATABASE_URL environment variable orqali beriladi
"""
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os

logger = logging.getLogger(__name__)

# Database URL - Environment variable'dan olinadi
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable sozlanmagan! "
        "PostgreSQL connection string kiriting, masalan: "
        "DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/alif24"
    )

# Supabase/Heroku format: postgres:// -> postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Async engine configuration
engine_args = {
    "echo": os.getenv("DB_ECHO", "false").lower() == "true"
}

if "sqlite" in DATABASE_URL:
    raise RuntimeError(
        "SQLite qo'llab-quvvatlanmaydi! Faqat PostgreSQL ishlatiladi. "
        "DATABASE_URL ni PostgreSQL connection string ga o'zgartiring."
    )
elif os.getenv("VERCEL") or os.getenv("SERVERLESS"):
    engine_args["poolclass"] = NullPool
else:
    engine_args["pool_pre_ping"] = True
    engine_args["pool_size"] = int(os.getenv("DB_POOL_SIZE", "10"))
    engine_args["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    engine_args["pool_recycle"] = 300

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    **engine_args
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)


async def get_db():
    """
    Async Database session dependency
    FastAPI Depends() bilan ishlatiladi
    """
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()


async def init_db():
    """
    Database'ni initialize qilish (jadvallarni yaratish)
    """
    from shared.database.base import Base
    # Import all models
    from shared.database import models  # noqa

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("[OK] Database tables created successfully (Async)")


__all__ = ["engine", "AsyncSessionLocal", "get_db", "init_db"]

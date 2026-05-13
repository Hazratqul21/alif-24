"""
Alembic Migration Environment
Alif24 Platform - Database Migrations
"""
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

try:
    from dotenv import load_dotenv
    # Load environment variables from project root
    load_dotenv(project_root / ".env")
except ImportError:
    pass

# Import shared database base directly to avoid session initialization if possible
from shared.database.base import Base
from shared.database.models import *  # Import all shared models

# Platform-specific models
_platform_imports = [
    "MainPlatform.backend.app.models.ai_cache",
    "MainPlatform.backend.app.models.reading_analysis",
    "Olimp.backend.app.gamification.models",
    "Olimp.backend.app.social.models",
    "Lessions.backend.app.lessons.models",
]

for _mod in _platform_imports:
    try:
        if _mod not in sys.modules:
            __import__(_mod)
    except ModuleNotFoundError:
        if "MainPlatform.backend." in _mod:
            _local_mod = _mod.replace("MainPlatform.backend.", "")
            try:
                if _local_mod not in sys.modules:
                    __import__(_local_mod)
            except ModuleNotFoundError:
                pass
        pass

# this is the Alembic Config object
config = context.config

# Override sqlalchemy.url from DATABASE_URL environment variable
database_url = os.getenv("DATABASE_URL")
if database_url:
    # Alembic needs sync driver (psycopg2)
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://")
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for migrations
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

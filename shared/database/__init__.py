"""
Shared Database Package - Umumiy database modullari

Import qilish:
    from shared.database.base import Base
    from shared.database.session import get_db, init_db
    from shared.database.models import User, StudentProfile, StudentCoin
"""

from shared.database.base import Base
from shared.database.session import engine, AsyncSessionLocal, get_db, init_db

__all__ = ["Base", "engine", "AsyncSessionLocal", "get_db", "init_db"]

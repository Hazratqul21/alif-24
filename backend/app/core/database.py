from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.logging import logger

engine = create_engine(
    settings.get_database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False  # Production: SQLAlchemy loglarini o'chirish
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def init_db():
    """Initialize database"""
    try:
        # Test connection
        with engine.connect() as conn:
            pass  # Connection test successful
            # logger.info("Database connection established successfully")  # Production: o'chirilgan
    except Exception as e:
        logger.error(f"Unable to connect to the database: {e}")
        raise


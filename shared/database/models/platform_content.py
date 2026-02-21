import uuid
from sqlalchemy import Column, String, JSON, DateTime
from datetime import datetime, timezone
from shared.database.database import Base

class PlatformContent(Base):
    __tablename__ = "platform_content"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

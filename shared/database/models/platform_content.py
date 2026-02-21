from sqlalchemy import Column, String, JSON, DateTime
from datetime import datetime, timezone
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

class PlatformContent(Base):
    __tablename__ = "platform_content"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

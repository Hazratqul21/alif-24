from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

class Story(Base):
    __tablename__ = "ertaklar"
    __table_args__ = {'extend_existing': True}

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String(5), default="uz")
    age_group = Column(String(10), default="6-8")
    has_audio = Column(Boolean, default=False)
    audio_url = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True) # Rasm yuklanishi uchun qator
    view_count = Column(Integer, default=0)
    # Savollar: [{"question": "...", "answer": "..."}]
    questions = Column(JSON, nullable=True, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

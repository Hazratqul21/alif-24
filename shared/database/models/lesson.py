from sqlalchemy import Column, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = {'extend_existing': True}

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    teacher_id = Column(String(8), ForeignKey("teacher_profiles.id", use_alter=True, name="fk_lesson_teacher"), nullable=True)
    organization_id = Column(String(8), ForeignKey("organization_profiles.id", use_alter=True, name="fk_lesson_org"), nullable=True)
    title = Column(String(300), nullable=False)
    subject = Column(String(100), nullable=True)
    grade_level = Column(String(20), nullable=True)
    content = Column(Text, nullable=True)
    language = Column(String(10), nullable=True, default="uz")
    video_url = Column(String(500), nullable=True)
    attachments = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


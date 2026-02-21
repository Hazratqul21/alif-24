import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from shared.database.database import Base

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String, ForeignKey("teacher_profiles.id"), nullable=False)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    grade_level = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    video_url = Column(String, nullable=True)
    attachments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    teacher = relationship("TeacherProfile")

"""
SavedTest Model — TestAI platformasida yaratilgan testlar
O'qituvchi/admin yaratgan testlar DB ga saqlanadi
Boshqa platformalar (Reading Competition, Assignment) dan import qilinishi mumkin
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
import enum
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class SavedTestStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class SavedTest(Base):
    """Test yaratuvchi tomonidan saqlangan testlar"""
    __tablename__ = "saved_tests"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    creator_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(200), nullable=True)
    topic = Column(String(500), nullable=True)
    difficulty = Column(String(50), default="medium")
    language = Column(String(10), default="uz")
    status = Column(String(20), default=SavedTestStatus.draft.value)
    # Questions: [{"question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..."}]
    questions = Column(JSON, default=list)
    questions_count = Column(Integer, default=0)
    # AI orqali yaratilganmi
    ai_generated = Column(String(10), default="no")  # "no", "openai", "manual"
    # Qaysi platformadan yaratilgan (redirect uchun)
    source_platform = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

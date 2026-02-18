from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

class ReadingAnalysis(Base):
    """
    SmartReaderTTS o'qish sessiyalarining tahlili
    StudentDashboard-da ko'rsatish uchun
    """
    __tablename__ = "reading_analyses"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id"), nullable=False, index=True)
    
    # Sessiya ma'lumotlari
    session_date = Column(DateTime(timezone=True), default=func.now(), server_default=func.now())
    story_title = Column(String(255), nullable=True)  # Ertak nomi (agar bo'lsa)
    
    # O'qish ko'rsatkichlari
    total_words_read = Column(Integer, default=0)  # Jami o'qilgan so'zlar soni
    reading_time_seconds = Column(Integer, default=0)  # O'qish vaqti (soniyalarda)
    
    # Nutq tahlili
    speech_errors = Column(Integer, default=0)  # Nutqdagi xatolar soni
    pronunciation_score = Column(Float, default=0.0)  # Talaffuz ballari (0-100)
    fluency_score = Column(Float, default=0.0)  # Ravonlik ballari (0-100)
    
    # Fikr bayoni tahlili
    comprehension_score = Column(Float, default=0.0)  # Tushunish ballari (0-100)
    expression_quality = Column(Float, default=0.0)  # Fikrini bayon qilish sifati (0-100)
    
    # Savollarga javoblar tahlili
    total_questions = Column(Integer, default=0)  # Jami savollar soni
    correct_answers = Column(Integer, default=0)  # To'g'ri javoblar soni
    answer_quality_score = Column(Float, default=0.0)  # Javoblar sifati (0-100)
    
    # Qo'shimcha ma'lumotlar
    conversation_history = Column(JSON, nullable=True)  # Suhbat tarixi
    detailed_analysis = Column(JSON, nullable=True)  # Batafsil tahlil ma'lumotlari
    ai_feedback = Column(Text, nullable=True)  # AI ning umumiy fikrini
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=func.now(), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationship
    user = relationship("User", backref="reading_analyses")
    
    def __repr__(self):
        return f"<ReadingAnalysis(id={self.id}, user_id={self.user_id}, date={self.session_date})>"

"""
Quiz Models - Telegram bot quiz va savollar
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class QuizQuestion(Base):
    """
    Quiz savollari - Telegram bot va platforma uchun
    """
    __tablename__ = "quiz_questions"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    question_text = Column(String, nullable=False)
    options = Column(JSON, nullable=False)  # List of strings ["Option A", "Option B", ...]
    correct_option_index = Column(Integer, nullable=False)  # 0, 1, 2...
    coins_reward = Column(Integer, default=10)
    category = Column(String, default="General")  # Math, English, Logic
    difficulty = Column(String, default="Medium")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    attempts = relationship("QuizAttempt", back_populates="question")

    def __repr__(self):
        return f"<QuizQuestion {self.category} - {self.question_text[:30]}...>"


class QuizAttempt(Base):
    """
    Quiz urinishlari - foydalanuvchi javoblari
    """
    __tablename__ = "quiz_attempts"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id"), nullable=False)
    question_id = Column(String(8), ForeignKey("quiz_questions.id"), nullable=False)
    chosen_option_index = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    coins_earned = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    question = relationship("QuizQuestion", back_populates="attempts")
    user = relationship("User", backref="quiz_attempts")

    def __repr__(self):
        return f"<QuizAttempt user={self.user_id} correct={self.is_correct}>"


__all__ = ["QuizQuestion", "QuizAttempt"]

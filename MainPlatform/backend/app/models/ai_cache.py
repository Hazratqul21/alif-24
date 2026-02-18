from sqlalchemy import Column, String, Text, DateTime, Integer
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

class AICache(Base):
    """
    Semantic Cache for AI Responses.
    Stores the hash of (prompt + context) and the resulting AI response.
    """
    __tablename__ = "ai_cache"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    prompt_hash = Column(String(64), index=True, nullable=False, unique=True) # SHA256 hash
    prompt_text = Column(Text, nullable=True) # For debugging (optional, can be truncated)
    response_json = Column(Text, nullable=False) # JSON string of the response
    
    model_name = Column(String(50), default="gpt-4")
    tokens_used = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=func.now(), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<AICache(hash={self.prompt_hash}, model={self.model_name})>"

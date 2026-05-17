"""
Olympiad Stage Models — Ko'p bosqichli olimpiada uchun
Har bir bosqich (maktab, tuman, viloyat, respublika) alohida jadvalda saqlanadi.
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


# ============================================================
# ENUMS
# ============================================================

class ScopeType(str, enum.Enum):
    """Bosqich qamrovi"""
    school = "school"         # 1-bosqich: maktab miqyosi
    district = "district"     # 2-bosqich: tuman miqyosi
    region = "region"         # 3-bosqich: viloyat miqyosi
    republic = "republic"     # 4-bosqich: respublika miqyosi


class StageContentType(str, enum.Enum):
    """Bosqich kontent turi"""
    test = "test"           # Faqat test savollari
    reading = "reading"     # Faqat o'qish (ertak/matn + STT)
    mixed = "mixed"         # O'qish + test


# ============================================================
# OLYMPIAD STAGE
# ============================================================

class OlympiadStage(Base):
    """
    Olimpiada bosqichi — har bir bosqichning o'z vaqti, qamrovi va kontenti bor.
    Faqat is_multi_stage=True bo'lgan olimpiadalar uchun ishlatiladi.
    """
    __tablename__ = "olympiad_stages"
    __table_args__ = (
        Index("ix_stage_olympiad_id", "olympiad_id"),
        Index("ix_stage_number", "olympiad_id", "stage_number"),
    )

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    olympiad_id = Column(String(8), ForeignKey("olympiads.id", ondelete="CASCADE"), nullable=False)

    # Bosqich raqami va nomi
    stage_number = Column(Integer, nullable=False)   # 1, 2, 3, 4, 5
    title = Column(String(200), nullable=True)       # "1-bosqich: Maktab tanlovi"
    
    # Qamrov turi
    scope_type = Column(SQLEnum(ScopeType), nullable=False, default=ScopeType.school)
    
    # Kontent turi
    content_type = Column(SQLEnum(StageContentType), nullable=False, default=StageContentType.test)

    # Vaqt oralig'i
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)

    # Shartlar (faqat shu bosqichga o'tganlarga ko'rinadi)
    requirements = Column(Text, nullable=True)

    # Foizli kvota formulasi
    passing_percent = Column(Float, default=30.0)       # Guruhdan top X% o'tadi
    passing_min_count = Column(Integer, default=1)       # Kamida N kishi o'tadi

    # Vaqt
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    olympiad = relationship("Olympiad", backref="stages")
    results = relationship("OlympiadStageResult", back_populates="stage", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<OlympiadStage {self.stage_number} ({self.scope_type.value})>"


# ============================================================
# OLYMPIAD STAGE RESULT
# ============================================================

class OlympiadStageResult(Base):
    """
    Ishtirokchining bosqich natijasi.
    Har bir (participant, stage) juftligi uchun yagona yozuv.
    """
    __tablename__ = "olympiad_stage_results"
    __table_args__ = (
        Index("ix_stage_result_participant", "participant_id"),
        Index("ix_stage_result_stage", "stage_id"),
    )

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    participant_id = Column(String(8), ForeignKey("olympiad_participants.id", ondelete="CASCADE"), nullable=False)
    stage_id = Column(String(8), ForeignKey("olympiad_stages.id", ondelete="CASCADE"), nullable=False)

    # Natijalar
    score = Column(Float, default=0)
    duration_seconds = Column(Integer, default=0)
    rank_in_group = Column(Integer, nullable=True)          # Guruh ichidagi o'rni
    is_passed = Column(Boolean, default=False)              # Keyingi bosqichga o'tdimi?

    # Vaqt
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    participant = relationship("OlympiadParticipant", backref="stage_results")
    stage = relationship("OlympiadStage", back_populates="results")

    def __repr__(self):
        return f"<OlympiadStageResult rank={self.rank_in_group} passed={self.is_passed}>"


__all__ = [
    "ScopeType",
    "StageContentType",
    "OlympiadStage",
    "OlympiadStageResult",
]

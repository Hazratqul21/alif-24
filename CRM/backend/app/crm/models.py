from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

# Shared database imports
import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))
from shared.database.base import Base, BaseModel
from shared.database.id_generator import generate_8_digit_id

class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    TRIAL_LESSON = "trial_lesson"
    NEGOTIATION = "negotiation"
    WON = "won"  # Converted to Student
    LOST = "lost"

class ActivityType(str, enum.Enum):
    CALL = "call"
    MEETING = "meeting"
    NOTE = "note"
    TASK = "task"

class Lead(BaseModel):
    __tablename__ = "crm_leads"

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=False, index=True)
    source = Column(String, nullable=True)  # e.g., "Instagram", "Website", "Referral"
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    notes = Column(Text, nullable=True)
    
    # Foreign Keys - 8-digit string IDs
    assigned_to_id = Column(String(8), ForeignKey("users.id"), nullable=True)
    organization_id = Column(String(8), ForeignKey("organization_profiles.id", ondelete="CASCADE"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    assigned_to = relationship("User", backref="leads")
    activities = relationship("Activity", back_populates="lead", cascade="all, delete-orphan")

class Activity(BaseModel):
    __tablename__ = "crm_activities"

    lead_id = Column(String(8), ForeignKey("crm_leads.id"), nullable=False)
    type = Column(Enum(ActivityType), default=ActivityType.NOTE)
    summary = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_completed = Column(Boolean, default=False)
    
    # Foreign Keys - 8-digit string IDs
    created_by_id = Column(String(8), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lead = relationship("Lead", back_populates="activities")
    created_by = relationship("User")

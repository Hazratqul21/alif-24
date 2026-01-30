from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base

class RelationshipType(str, enum.Enum):
    PARENT = "parent"
    GUARDIAN = "guardian"

class ProfileFamilyLink(Base):
    __tablename__ = "profile_family_links"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_profile_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    child_nickname = Column(String(50), nullable=False, index=True)
    relationship_type = Column(SQLEnum(RelationshipType), default=RelationshipType.PARENT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent_profile = relationship("User", foreign_keys=[parent_profile_id])


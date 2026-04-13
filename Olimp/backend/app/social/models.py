import enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class FriendshipStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    requester_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(FriendshipStatus), default=FriendshipStatus.pending)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    requester = relationship("User", foreign_keys=[requester_id], backref="sent_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="received_requests")

"""
Gamification Database Models
Nishonlar (Badges), Streak va Coin Shop modellari
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

# --- Badges ---
class BadgeType(str, enum.Enum):
    participation = "participation"
    score = "score"
    speed = "speed"
    streak = "streak"
    special = "special"

class Badge(Base):
    __tablename__ = "gamification_badges"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(255), nullable=True)
    badge_type = Column(Enum(BadgeType), default=BadgeType.special)
    condition_value = Column(Integer, default=1) # e.g. 3ta musobaqa, 7 kun streak
    coin_reward = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user_badges = relationship("UserBadge", back_populates="badge")

class UserBadge(Base):
    __tablename__ = "gamification_user_badges"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    badge_id = Column(String(8), ForeignKey("gamification_badges.id", ondelete="CASCADE"), nullable=False)
    awarded_at = Column(DateTime(timezone=True), server_default=func.now())

    badge = relationship("Badge", back_populates="user_badges")

# --- Daily Streak ---
class DailyActivity(Base):
    __tablename__ = "gamification_daily_activity"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    last_active_date = Column(DateTime(timezone=True), server_default=func.now())
    current_streak = Column(Integer, default=1)
    longest_streak = Column(Integer, default=1)

# --- Coin Shop ---
class ShopItemType(str, enum.Enum):
    avatar_frame = "avatar_frame"
    profile_theme = "profile_theme"
    power_up = "power_up"
    certificate = "certificate"

class ShopItem(Base):
    __tablename__ = "gamification_shop_items"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    item_type = Column(Enum(ShopItemType), default=ShopItemType.avatar_frame)
    price = Column(Integer, nullable=False, default=100)
    image_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserPurchase(Base):
    __tablename__ = "gamification_user_purchases"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(String(8), ForeignKey("gamification_shop_items.id", ondelete="CASCADE"), nullable=False)
    price_paid = Column(Integer, nullable=False)
    purchased_at = Column(DateTime(timezone=True), server_default=func.now())
    is_equipped = Column(Boolean, default=False)

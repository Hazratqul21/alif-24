"""
Coin Models - Coin tizimi (mukofot tizimi)
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


# ============================================================
# ENUMS
# ============================================================

class TransactionType(str, enum.Enum):
    """Coin tranzaksiya turlari"""
    lesson_complete = "lesson_complete"              # Darsni tugatish +10
    game_win = "game_win"                            # O'yinni yutish +5
    quiz_correct = "quiz_correct"                    # Quiz to'g'ri javob +2
    olympiad_first = "olympiad_first"                # Olimpiada 1-o'rin +500
    olympiad_second = "olympiad_second"              # Olimpiada 2-o'rin +300
    olympiad_third = "olympiad_third"                # Olimpiada 3-o'rin +100
    olympiad_participation = "olympiad_participation" # Qatnashish +10
    daily_bonus = "daily_bonus"                      # Kunlik bonus +5
    withdrawal = "withdrawal"                        # Yechib olish (minus)
    prize_redemption = "prize_redemption"            # Yutiq sotib olish (minus)
    admin_adjustment = "admin_adjustment"            # Admin tomonidan o'zgartirish


class WithdrawalStatus(str, enum.Enum):
    """Yechib olish holati"""
    pending = "pending"       # Kutilmoqda
    processing = "processing" # Jarayonda
    completed = "completed"   # Bajarildi
    rejected = "rejected"     # Rad etildi


class PrizeCategory(str, enum.Enum):
    """Yutiq kategoriyalari"""
    toy = "toy"               # O'yinchoq
    book = "book"             # Kitob
    stationery = "stationery" # Kantselyariya
    game = "game"             # O'yin
    digital = "digital"       # Raqamli (premium kontent)
    other = "other"           # Boshqa


# ============================================================
# STUDENT COIN BALANCE
# ============================================================

class StudentCoin(Base):
    """
    O'quvchining coin balansi
    """
    __tablename__ = "student_coins"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_id = Column(String(8), ForeignKey("student_profiles.id"), nullable=False, unique=True)
    
    # Balans
    total_earned = Column(Integer, default=0)      # Jami yig'ilgan
    total_spent = Column(Integer, default=0)       # Jami sarflangan
    total_withdrawn = Column(Integer, default=0)   # Jami yechib olingan
    current_balance = Column(Integer, default=0)   # Hozirgi balans
    
    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    student = relationship("StudentProfile", backref="coin_balance", uselist=False)
    transactions = relationship("CoinTransaction", back_populates="student_coin", cascade="all, delete-orphan")
    
    def add_coins(self, amount: int):
        """Coin qo'shish"""
        self.total_earned += amount
        self.current_balance += amount
        
    def spend_coins(self, amount: int):
        """Coin sarflash (yutiqlar uchun)"""
        if self.current_balance >= amount:
            self.total_spent += amount
            self.current_balance -= amount
            return True
        return False
    
    def __repr__(self):
        return f"<StudentCoin balance={self.current_balance}>"


# ============================================================
# COIN TRANSACTION
# ============================================================

class CoinTransaction(Base):
    """
    Coin tranzaksiya tarixi - Barcha coin operatsiyalari
    """
    __tablename__ = "coin_transactions"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_coin_id = Column(String(8), ForeignKey("student_coins.id"), nullable=False)
    
    # Tranzaksiya ma'lumotlari
    type = Column(SQLEnum(TransactionType), nullable=False)
    amount = Column(Integer, nullable=False)  # Musbat yoki manfiy
    description = Column(String(500), nullable=True)
    
    # Bog'liq ma'lumotlar (ixtiyoriy)
    reference_id = Column(String(8), nullable=True)  # Lesson/Game/Quiz/Olympiad ID
    reference_type = Column(String(50), nullable=True)        # "lesson", "game", "quiz", "olympiad"
    
    # Vaqt tamg'asi
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    student_coin = relationship("StudentCoin", back_populates="transactions")
    
    def __repr__(self):
        return f"<CoinTransaction {self.type.value} {self.amount:+d}>"


# ============================================================
# COIN WITHDRAWAL
# ============================================================

class CoinWithdrawal(Base):
    """
    Coin yechib olish so'rovi - Coinni pulga ayirboshlash
    1000 coin = 1000 UZS
    """
    __tablename__ = "coin_withdrawals"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_coin_id = Column(String(8), ForeignKey("student_coins.id"), nullable=False)
    
    # Yechib olish ma'lumotlari
    coin_amount = Column(Integer, nullable=False)  # Necha coin
    money_amount = Column(Integer, nullable=False) # Necha so'm (1:1)
    status = Column(SQLEnum(WithdrawalStatus), default=WithdrawalStatus.pending)
    
    # Ota-ona ma'lumotlari (to'lov oluvchi)
    parent_id = Column(String(8), ForeignKey("parent_profiles.id"), nullable=False)
    payment_method = Column(String(50), nullable=True)  # "click", "payme", "uzum", "bank_card"
    payment_details = Column(String(500), nullable=True) # Karta raqami yoki telefon
    
    # Admin tomonidan
    processed_by = Column(String(8), ForeignKey("users.id"), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    
    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    student_coin = relationship("StudentCoin", backref="withdrawals")
    parent = relationship("ParentProfile", backref="coin_withdrawals")
    processor = relationship("User", foreign_keys=[processed_by])
    
    def __repr__(self):
        return f"<CoinWithdrawal {self.coin_amount} coins ({self.status.value})>"


# ============================================================
# PRIZE (YUTIQ)
# ============================================================

class Prize(Base):
    """
    Yutiq katalogi - Coin bilan sotib olinadigan yutuqlar
    """
    __tablename__ = "prizes"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    
    # Yutiq ma'lumotlari
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SQLEnum(PrizeCategory), default=PrizeCategory.other)
    image_url = Column(String(500), nullable=True)
    
    # Narx
    coin_price = Column(Integer, nullable=False)
    
    # Mavjudlik
    stock_quantity = Column(Integer, default=100)  # Mavjud soni
    is_active = Column(Boolean, default=True)
    is_digital = Column(Boolean, default=False)    # Raqamli yutiq
    
    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    redemptions = relationship("PrizeRedemption", back_populates="prize", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Prize {self.name} ({self.coin_price} coins)>"


# ============================================================
# PRIZE REDEMPTION
# ============================================================

class PrizeRedemption(Base):
    """
    Yutiq sotib olish tarixi
    """
    __tablename__ = "prize_redemptions"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_coin_id = Column(String(8), ForeignKey("student_coins.id"), nullable=False)
    prize_id = Column(String(8), ForeignKey("prizes.id"), nullable=False)
    
    # Ma'lumotlar
    coin_spent = Column(Integer, nullable=False)
    quantity = Column(Integer, default=1)
    
    # Yetkazib berish (jismoniy yutuqlar uchun)
    delivery_address = Column(String(500), nullable=True)
    delivery_status = Column(String(50), default="pending")  # pending, shipped, delivered
    
    # Vaqt tamg'asi
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    student_coin = relationship("StudentCoin", backref="prize_redemptions")
    prize = relationship("Prize", back_populates="redemptions")
    
    def __repr__(self):
        return f"<PrizeRedemption {self.prize_id}>"


__all__ = [
    "TransactionType",
    "WithdrawalStatus",
    "PrizeCategory",
    "StudentCoin",
    "CoinTransaction",
    "CoinWithdrawal",
    "Prize",
    "PrizeRedemption"
]

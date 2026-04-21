import enum
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

class WalletTransactionType(str, enum.Enum):
    sale = "sale"                # Resource sold
    commission = "commission"    # Platform fee (deduction from gross)
    withdrawal = "withdrawal"    # Paid out to teacher
    bonus = "bonus"              # Platform reward
    adjustment = "adjustment"    # Admin correction

class TeacherWallet(Base):
    """
    Financial balance for sellers (Teachers)
    """
    __tablename__ = "teacher_wallets"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Balances
    total_earned = Column(Integer, default=0)      # Lifetime gross earnings
    total_commission = Column(Integer, default=0)  # Lifetime platform fees
    total_withdrawn = Column(Integer, default=0)   # Total ever paid out
    
    current_balance = Column(Integer, default=0)   # Net available balance
    pending_balance = Column(Integer, default=0)   # Earnings waiting for clearance (e.g. 7 day escrow)
    
    currency = Column(String(10), default="UZS")
    
    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="wallet", uselist=False)
    transactions = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TeacherWallet balance={self.current_balance} {self.currency}>"


class WalletTransaction(Base):
    """
    History of money movement in teacher wallet
    """
    __tablename__ = "wallet_transactions"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    wallet_id = Column(String(8), ForeignKey("teacher_wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    
    type = Column(SQLEnum(WalletTransactionType), nullable=False)
    amount = Column(Integer, nullable=False) # Positive or negative
    description = Column(String(500), nullable=True)
    
    # Traceability
    marketplace_purchase_id = Column(String(8), ForeignKey("marketplace_purchases.id"), nullable=True)
    payment_transaction_id = Column(String(8), ForeignKey("payment_transactions.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    wallet = relationship("TeacherWallet", back_populates="transactions")
    purchase = relationship("MarketplacePurchase")
    payment = relationship("PaymentTransaction")

    def __repr__(self):
        return f"<WalletTransaction {self.type.value} {self.amount}>"

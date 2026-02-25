"""
Coin Service - Coin tizimini boshqarish
Barcha platformalar uchun bir xil coin tizimi
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional, List
from shared.database.models import (
    StudentCoin,
    CoinTransaction,
    TransactionType,
    StudentProfile
)


async def get_or_create_coin_balance(db: AsyncSession, student_id: str) -> StudentCoin:
    """
    O'quvchining coin balansini olish yoki yaratish
    """
    stmt = select(StudentCoin).filter_by(student_id=student_id)
    result = await db.execute(stmt)
    coin_balance = result.scalars().first()
    
    if not coin_balance:
        coin_balance = StudentCoin(
            student_id=student_id,
            total_earned=0,
            total_spent=0,
            total_withdrawn=0,
            current_balance=0
        )
        db.add(coin_balance)
        await db.commit()
        await db.refresh(coin_balance)
    
    return coin_balance


async def add_coins(
    db: AsyncSession,
    student_id: str,
    amount: int,
    transaction_type: TransactionType,
    description: Optional[str] = None,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None
) -> StudentCoin:
    """
    O'quvchiga coin qo'shish
    """
    # Coin balansini olish yoki yaratish
    coin_balance = await get_or_create_coin_balance(db, student_id)
    
    # Coin qo'shish
    coin_balance.add_coins(amount)
    
    # Tranzaksiya yaratish
    transaction = CoinTransaction(
        student_coin_id=coin_balance.id,
        type=transaction_type,
        amount=amount,
        description=description or f"{transaction_type.value}: +{amount} coin",
        reference_id=reference_id,
        reference_type=reference_type
    )
    db.add(transaction)
    
    # O'quvchi profilini yangilash
    stmt = select(StudentProfile).filter_by(id=student_id)
    result = await db.execute(stmt)
    student = result.scalars().first()
    
    if student:
        student.total_coins = coin_balance.current_balance
    
    await db.commit()
    await db.refresh(coin_balance)
    
    return coin_balance


async def deduct_coins(
    db: AsyncSession,
    student_id: str,
    amount: int,
    transaction_type: TransactionType,
    description: Optional[str] = None,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None
) -> Optional[StudentCoin]:
    """
    O'quvchidan coin ayirish
    """
    coin_balance = await get_or_create_coin_balance(db, student_id)
    
    # Coin yetarli ekanligini tekshirish
    if coin_balance.current_balance < amount:
        return None
    
    # Coin ayirish
    if not coin_balance.spend_coins(amount):
        return None
    
    # Tranzaksiya yaratish
    transaction = CoinTransaction(
        student_coin_id=coin_balance.id,
        type=transaction_type,
        amount=-amount,  # Manfiy qiymat
        description=description or f"{transaction_type.value}: -{amount} coin",
        reference_id=reference_id,
        reference_type=reference_type
    )
    db.add(transaction)
    
    # O'quvchi profilini yangilash
    stmt = select(StudentProfile).filter_by(id=student_id)
    result = await db.execute(stmt)
    student = result.scalars().first()
    
    if student:
        student.total_coins = coin_balance.current_balance
    
    await db.commit()
    await db.refresh(coin_balance)
    
    return coin_balance


async def get_coin_balance(db: AsyncSession, student_id: str) -> int:
    """
    O'quvchining joriy coin balansini olish
    """
    coin_balance = await get_or_create_coin_balance(db, student_id)
    return coin_balance.current_balance


async def get_transaction_history(db: AsyncSession, student_id: str, limit: int = 50) -> List[CoinTransaction]:
    """
    O'quvchining coin tranzaksiyalari tarixini olish
    """
    coin_balance = await get_or_create_coin_balance(db, student_id)
    
    stmt = select(CoinTransaction)\
        .filter_by(student_coin_id=coin_balance.id)\
        .order_by(desc(CoinTransaction.created_at))\
        .limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().all()


# Coin mukofotlari - Har xil faoliyat uchun

COIN_REWARDS = {
    "lesson_complete": 10,
    "game_win": 5,
    "quiz_correct": 2,
    "olympiad_first": 500,
    "olympiad_second": 300,
    "olympiad_third": 100,
    "olympiad_participation": 10,
    "daily_bonus": 5
}


async def reward_lesson_completion(db: AsyncSession, student_id: str, lesson_id: str) -> StudentCoin:
    """Dars tugatganda coin berish"""
    return await add_coins(
        db, student_id,
        amount=COIN_REWARDS["lesson_complete"],
        transaction_type=TransactionType.lesson_complete,
        description="Dars muvaffaqiyatli tugatildi!",
        reference_id=lesson_id,
        reference_type="lesson"
    )


async def reward_game_win(db: AsyncSession, student_id: str, amount: int, game_name: str) -> StudentCoin:
    """O'yinni yutganda coin berish"""
    return await add_coins(
        db, student_id,
        amount=amount,
        transaction_type=TransactionType.game_win,
        description=f"{game_name} o'yinida yutdingiz!",
        reference_type="game"
    )


async def reward_quiz_correct(db: AsyncSession, student_id: str, quiz_id: str) -> StudentCoin:
    """Quiz to'g'ri javob berganda coin berish"""
    return await add_coins(
        db, student_id,
        amount=COIN_REWARDS["quiz_correct"],
        transaction_type=TransactionType.quiz_correct,
        description="To'g'ri javob!",
        reference_id=quiz_id,
        reference_type="quiz"
    )


async def reward_olympiad(db: AsyncSession, student_id: str, olympiad_id: str, place: int) -> StudentCoin:
    """Olimpiada uchun coin berish"""
    rewards = {
        1: (COIN_REWARDS["olympiad_first"], TransactionType.olympiad_first, "🥇 1-o'rin!"),
        2: (COIN_REWARDS["olympiad_second"], TransactionType.olympiad_second, "🥈 2-o'rin!"),
        3: (COIN_REWARDS["olympiad_third"], TransactionType.olympiad_third, "🥉 3-o'rin!")
    }
    
    if place in rewards:
        reward_amount, tx_type, description = rewards[place]
    else:
        reward_amount = COIN_REWARDS["olympiad_participation"]
        tx_type = TransactionType.olympiad_participation
        description = "Olimpiadada qatnashdingiz!"
    
    return await add_coins(
        db, student_id,
        amount=reward_amount,
        transaction_type=tx_type,
        description=description,
        reference_id=olympiad_id,
        reference_type="olympiad"
    )


__all__ = [
    "get_or_create_coin_balance",
    "add_coins",
    "deduct_coins",
    "get_coin_balance",
    "get_transaction_history",
    "reward_lesson_completion",
    "reward_game_win",
    "reward_quiz_correct",
    "reward_olympiad",
    "COIN_REWARDS"
]

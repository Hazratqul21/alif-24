"""
Coins Router - O'quvchilar uchun coin tizimi
Balance, daily bonus, transactions
"""
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from shared.database import get_db
from shared.database.models import User, UserRole, StudentProfile
from shared.database.models.coin import StudentCoin, CoinTransaction, TransactionType
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

DAILY_BONUS_AMOUNT = 5


async def get_or_create_coin_balance(db: AsyncSession, user: User) -> StudentCoin:
    """O'quvchining coin balansini olish yoki yaratish"""
    # Get student profile
    res = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == user.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        profile = StudentProfile(user_id=user.id)
        db.add(profile)
        await db.flush()

    # Get or create coin balance
    res = await db.execute(
        select(StudentCoin).where(StudentCoin.student_id == profile.id)
    )
    coin = res.scalar_one_or_none()
    if not coin:
        coin = StudentCoin(student_id=profile.id, current_balance=0, total_earned=0, total_spent=0, total_withdrawn=0)
        db.add(coin)
        await db.flush()
    return coin


@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'quvchining coin balansini olish"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    coin = await get_or_create_coin_balance(db, current_user)
    await db.commit()

    return {
        "success": True,
        "data": {
            "current_balance": coin.current_balance,
            "total_earned": coin.total_earned,
            "total_spent": coin.total_spent,
            "total_withdrawn": coin.total_withdrawn,
            "money_equivalent_uzs": coin.current_balance,
        }
    }


@router.post("/daily-bonus")
async def claim_daily_bonus(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kunlik bonus olish (+5 coin, kuniga 1 marta)"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    coin = await get_or_create_coin_balance(db, current_user)

    # Check if already claimed today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    res = await db.execute(
        select(CoinTransaction).where(
            CoinTransaction.student_coin_id == coin.id,
            CoinTransaction.type == TransactionType.daily_bonus,
            CoinTransaction.created_at >= today_start,
        )
    )
    existing = res.scalar_one_or_none()
    if existing:
        return {
            "success": True,
            "data": {
                "coins_earned": 0,
                "new_balance": coin.current_balance,
                "message": "Bugungi bonus allaqachon olingan",
                "already_claimed": True,
            }
        }

    # Award daily bonus
    coin.add_coins(DAILY_BONUS_AMOUNT)
    tx = CoinTransaction(
        student_coin_id=coin.id,
        type=TransactionType.daily_bonus,
        amount=DAILY_BONUS_AMOUNT,
        description="Kunlik kirish bonusi",
    )
    db.add(tx)
    await db.commit()

    return {
        "success": True,
        "data": {
            "coins_earned": DAILY_BONUS_AMOUNT,
            "new_balance": coin.current_balance,
            "message": f"+{DAILY_BONUS_AMOUNT} coin kunlik bonus!",
            "already_claimed": False,
        }
    }


@router.post("/game-reward")
async def award_game_coins(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'yin yutqazish/yutish uchun coin berish"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    coin = await get_or_create_coin_balance(db, current_user)

    game_reward = 5
    coin.add_coins(game_reward)
    tx = CoinTransaction(
        student_coin_id=coin.id,
        type=TransactionType.game_win,
        amount=game_reward,
        description="O'yin mukofoti",
    )
    db.add(tx)
    await db.commit()

    return {
        "success": True,
        "data": {
            "coins_earned": game_reward,
            "new_balance": coin.current_balance,
        }
    }


@router.get("/transactions")
async def get_transactions(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Coin tranzaksiya tarixini olish"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    coin = await get_or_create_coin_balance(db, current_user)
    await db.commit()

    res = await db.execute(
        select(CoinTransaction)
        .where(CoinTransaction.student_coin_id == coin.id)
        .order_by(CoinTransaction.created_at.desc())
        .limit(limit)
    )
    transactions = res.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": tx.id,
                "type": tx.type.value,
                "amount": tx.amount,
                "description": tx.description,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
            }
            for tx in transactions
        ]
    }

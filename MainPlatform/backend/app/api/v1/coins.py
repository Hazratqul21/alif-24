"""
Coins Router - O'quvchilar uchun coin tizimi
Balance, daily bonus, transactions
"""
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

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
    profile = res.scalars().first()
    if not profile:
        profile = StudentProfile(user_id=user.id)
        db.add(profile)
        await db.flush()

    # Get or create coin balance
    res = await db.execute(
        select(StudentCoin).where(StudentCoin.student_id == profile.id)
    )
    coin = res.scalars().first()
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
    existing = res.scalars().first()
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

    # Check daily limit (150 coins)
    from sqlalchemy import func as sqlfunc
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    stmt = select(sqlfunc.sum(CoinTransaction.amount)).where(
        CoinTransaction.student_coin_id == coin.id,
        CoinTransaction.type == TransactionType.game_win,
        CoinTransaction.created_at >= today_start
    )
    res = await db.execute(stmt)
    today_total = res.scalar() or 0

    game_reward = 5
    if today_total + game_reward > 150:
        return {
            "success": True,
            "data": {
                "coins_earned": 0,
                "new_balance": coin.current_balance,
                "message": "Kunlik limit (150 coin) ga yetdingiz. Ertaga davom eting!"
            }
        }

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



def get_date_range(period: str, year: int = None, month: int = None, week: int = None):
    """Vaqt oralig'ini hisoblash"""
    now = datetime.now(timezone.utc)
    target_year = year or now.year

    if period == 'weekly':
        if week:
            # ISO hafta bo'yicha dushanbani topish
            start = datetime.strptime(f'{target_year}-W{week}-1', "%G-W%V-%u").replace(tzinfo=timezone.utc)
        else:
            # Joriy hafta dushanbasi
            start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
        return start, end

    if period == 'monthly':
        target_month = month or now.month
        start = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
        if target_month == 12:
            end = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(target_year, target_month + 1, 1, tzinfo=timezone.utc)
        return start, end

    if period == 'yearly':
        start = datetime(target_year, 1, 1, tzinfo=timezone.utc)
        end = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc)
        return start, end

    return None, None


@router.get("/leaderboard")
async def get_leaderboard(
    period: str = "all",  # all, weekly, monthly, yearly
    year: int = None,
    month: int = None,
    week: int = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Coin bo'yicha reyting (Umumiy, Haftalik, Oylik, Yillik)"""
    
    if period == "all":
        # Eski logika - jami yig'ilgan coinlar bo'yicha
        res = await db.execute(
            select(StudentCoin, StudentProfile, User)
            .join(StudentProfile, StudentCoin.student_id == StudentProfile.id)
            .join(User, StudentProfile.user_id == User.id)
            .where(User.role == UserRole.student)
            .where(StudentCoin.total_earned > 0)
            .order_by(StudentCoin.total_earned.desc())
            .limit(limit)
        )
        rows = res.all()
        
        leaderboard = []
        for rank, (coin, profile, user) in enumerate(rows, 1):
            leaderboard.append({
                "rank": rank,
                "student_id": profile.id,
                "student_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or "O'quvchi",
                "avatar_initial": (user.first_name or "O")[0].upper(),
                "total_earned": coin.total_earned,
                "grade": getattr(profile, 'grade', None),
            })
    else:
        # Davriy reyting - Tranzaksiyalar summasi bo'yicha
        start_date, end_date = get_date_range(period, year, month, week)
        
        # Faqat coin qo'shilgan (earning) tranzaksiyalarni hisoblaymiz (amount > 0)
        # Type bo'yicha ham filterlash mumkin (ixtiyoriy)
        stmt = (
            select(
                StudentProfile.id,
                User.first_name,
                User.last_name,
                StudentProfile.grade,
                func.sum(CoinTransaction.amount).label('period_total')
            )
            .join(StudentCoin, StudentProfile.id == StudentCoin.student_id)
            .join(User, StudentProfile.user_id == User.id)
            .join(CoinTransaction, StudentCoin.id == CoinTransaction.student_coin_id)
            .where(User.role == UserRole.student)
            .where(CoinTransaction.amount > 0)
            .where(CoinTransaction.created_at >= start_date)
            .where(CoinTransaction.created_at < end_date)
            .group_by(StudentProfile.id, User.id)
            .order_by(desc('period_total'))
            .limit(limit)
        )
        
        res = await db.execute(stmt)
        rows = res.all()
        
        leaderboard = []
        for rank, (pid, fname, lname, grade, total) in enumerate(rows, 1):
            leaderboard.append({
                "rank": rank,
                "student_id": pid,
                "student_name": f"{fname or ''} {lname or ''}".strip() or "O'quvchi",
                "avatar_initial": (fname or "O")[0].upper(),
                "total_earned": int(total),
                "grade": grade,
            })

    return {
        "success": True, 
        "period": period,
        "leaderboard": leaderboard, 
        "total": len(leaderboard)
    }


@router.get("/my-rank")
async def get_my_rank(
    period: str = "all",
    year: int = None,
    month: int = None,
    week: int = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'quvchining joriy davrdagi reytingini olish"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    coin = await get_or_create_coin_balance(db, current_user)
    
    if period == "all":
        # Jami earned bo'yicha rank
        higher_count = await db.execute(
            select(func.count(StudentCoin.id))
            .where(StudentCoin.total_earned > coin.total_earned)
        )
        rank = (higher_count.scalar() or 0) + 1
        total_earned = coin.total_earned
        
        total_res = await db.execute(
            select(func.count(StudentCoin.id))
            .where(StudentCoin.total_earned > 0)
        )
        total_students = total_res.scalar() or 0
    else:
        # Belgilangan davr bo'yicha rank
        start_date, end_date = get_date_range(period, year, month, week)
        
        # Mening summam
        my_sum_res = await db.execute(
            select(func.sum(CoinTransaction.amount))
            .where(CoinTransaction.student_coin_id == coin.id)
            .where(CoinTransaction.amount > 0)
            .where(CoinTransaction.created_at >= start_date)
            .where(CoinTransaction.created_at < end_date)
        )
        total_earned = my_sum_res.scalar() or 0
        
        # Boshqalarning summasi (Subquery ishlatamiz rankni hisoblash uchun)
        # Davr ichida kamida 1 coin yig'ganlar
        ranking_sub = (
            select(
                CoinTransaction.student_coin_id,
                func.sum(CoinTransaction.amount).label('sum_amount')
            )
            .where(CoinTransaction.amount > 0)
            .where(CoinTransaction.created_at >= start_date)
            .where(CoinTransaction.created_at < end_date)
            .group_by(CoinTransaction.student_coin_id)
            .subquery()
        )
        
        higher_count = await db.execute(
            select(func.count(ranking_sub.c.student_coin_id))
            .where(ranking_sub.c.sum_amount > total_earned)
        )
        rank = (higher_count.scalar() or 0) + 1
        
        total_res = await db.execute(
            select(func.count(ranking_sub.c.student_coin_id))
        )
        total_students = total_res.scalar() or 0

    return {
        "success": True,
        "data": {
            "rank": rank,
            "total_students": total_students,
            "total_earned": int(total_earned),
            "period": period,
            "student_name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(),
        }
    }


# ============================================================
# STUDENT SUBSCRIPTION ENDPOINTS
# ============================================================

@router.get("/subscription/plans")
async def get_subscription_plans(
    db: AsyncSession = Depends(get_db),
):
    """Faol obuna planlarini olish (ochiq — hamma ko'ra oladi)"""
    from shared.database.models.subscription import SubscriptionPlanConfig

    res = await db.execute(
        select(SubscriptionPlanConfig)
        .where(SubscriptionPlanConfig.is_active == True)
        .order_by(SubscriptionPlanConfig.sort_order)
    )
    plans = res.scalars().all()

    return {
        "success": True,
        "plans": [p.to_dict() for p in plans]
    }


@router.get("/subscription/my")
async def get_my_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'quvchining hozirgi obuna holatini olish"""
    from shared.database.models.subscription import UserSubscription, SubscriptionPlanConfig, SubscriptionStatus

    res = await db.execute(
        select(UserSubscription)
        .where(
            UserSubscription.user_id == current_user.id,
            UserSubscription.status == SubscriptionStatus.active.value,
        )
        .order_by(UserSubscription.created_at.desc())
        .limit(1)
    )
    sub = res.scalars().first()

    if not sub:
        return {"success": True, "has_subscription": False, "subscription": None}

    # Get plan info
    plan_res = await db.execute(
        select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.id == sub.plan_config_id)
    )
    plan = plan_res.scalars().first()

    return {
        "success": True,
        "has_subscription": True,
        "subscription": {
            "id": sub.id,
            "plan_name": plan.name if plan else "Noma'lum",
            "plan_price": plan.price if plan else 0,
            "status": sub.status,
            "started_at": sub.started_at.isoformat() if sub.started_at else None,
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
            "amount_paid": sub.amount_paid,
        }
    }



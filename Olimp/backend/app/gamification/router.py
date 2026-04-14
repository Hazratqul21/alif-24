from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, select
from sqlalchemy.orm import selectinload
from datetime import datetime

import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from shared.database import get_db
from shared.database.models.student import StudentProfile
from shared.database.models.coin import StudentCoin
from app.dependencies import get_current_user_data
from app.gamification.models import Badge, UserBadge, DailyActivity, ShopItem, UserPurchase

router = APIRouter(prefix="/gamification", tags=["Gamification"])


async def _resolve_profile_id(db: AsyncSession, user_id: str) -> str:
    """JWT user_id (users.id) ni student_profiles.id ga aylantiradi"""
    res = await db.execute(
        select(StudentProfile.id).where(StudentProfile.user_id == user_id)
    )
    profile_id = res.scalar_one_or_none()
    if not profile_id:
        raise HTTPException(status_code=404, detail="Talaba profili topilmadi")
    return profile_id


@router.get("/profile")
async def get_gamification_profile(
    db: AsyncSession = Depends(get_db),
    user_data: dict = Depends(get_current_user_data)
):
    user_id = user_data["user_id"]
    student_id = await _resolve_profile_id(db, user_id)

    coin_res = await db.execute(
        select(StudentCoin.current_balance).where(StudentCoin.student_id == student_id)
    )
    total_coins = coin_res.scalar_one_or_none() or 0
    
    activity_res = await db.execute(select(DailyActivity).filter(DailyActivity.user_id == student_id))
    activity = activity_res.scalars().first()
    streak = activity.current_streak if activity else 0
    longest_streak = activity.longest_streak if activity else 0
    
    # Get Badges
    ub_res = await db.execute(
        select(UserBadge)
        .options(selectinload(UserBadge.badge))
        .filter(UserBadge.user_id == student_id)
    )
    user_badges = ub_res.scalars().all()
    badges = [
        {
            "id": ub.badge.id,
            "name": ub.badge.name,
            "description": ub.badge.description,
            "icon_url": ub.badge.icon_url,
            "awarded_at": ub.awarded_at
        } for ub in user_badges if ub.badge
    ]
    
    return {
        "success": True,
        "data": {
            "coins": total_coins,
            "current_streak": streak,
            "longest_streak": longest_streak,
            "badges": badges
        }
    }

# --- Badges ---
@router.get("/badges/all")
async def get_all_badges(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Badge))
    badges = res.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": b.id,
                "name": b.name,
                "description": b.description,
                "icon_url": b.icon_url,
                "type": b.badge_type,
                "reward": b.coin_reward
            } for b in badges
        ]
    }

# --- Coin Shop ---
@router.get("/shop")
async def get_shop_items(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ShopItem).filter(ShopItem.is_active == True))
    items = res.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "type": item.item_type,
                "price": item.price,
                "image_url": item.image_url
            } for item in items
        ]
    }

@router.post("/shop/purchase/{item_id}")
async def purchase_shop_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    user_data: dict = Depends(get_current_user_data)
):
    user_id = user_data["user_id"]
    student_id = await _resolve_profile_id(db, user_id)
    
    item_res = await db.execute(select(ShopItem).filter(ShopItem.id == item_id, ShopItem.is_active == True))
    item = item_res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item topilmadi")
    
    pur_res = await db.execute(select(UserPurchase).filter(
        UserPurchase.user_id == student_id,
        UserPurchase.item_id == item_id
    ))
    existing_purchase = pur_res.scalars().first()
    
    if existing_purchase:
        raise HTTPException(status_code=400, detail="Siz bu mahsulotni allaqachon sotib olgansiz")

    coin_res = await db.execute(
        select(StudentCoin).where(StudentCoin.student_id == student_id)
    )
    coin_record = coin_res.scalars().first()
    if not coin_record or coin_record.current_balance < item.price:
        raise HTTPException(status_code=400, detail="Yetarli coin mavjud emas")

    coin_record.spend_coins(item.price)

    purchase = UserPurchase(
        user_id=student_id,
        item_id=item_id,
        price_paid=item.price
    )
    
    db.add(purchase)
    await db.commit()
    
    return {
        "success": True,
        "message": "Muvaffaqiyatli xarid qilindi",
        "remaining_balance": coin_record.current_balance
    }

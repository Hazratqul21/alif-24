from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from shared.database import get_db
from shared.auth import verify_token
from app.gamification.models import Badge, UserBadge, DailyActivity, ShopItem, UserPurchase

router = APIRouter(prefix="/gamification", tags=["Gamification"])

# --- User Profile / Activity ---
@router.get("/profile")
async def get_gamification_profile(
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    student_id = user_data["user_id"]
    
    # Get total coins (mock logic for now or fetch from a centralized user table if added)
    total_coins = 500 # Default/Mock Value
    
    # Get Streak
    activity = db.query(DailyActivity).filter(DailyActivity.user_id == student_id).first()
    streak = activity.current_streak if activity else 0
    longest_streak = activity.longest_streak if activity else 0
    
    # Get Badges
    user_badges = db.query(UserBadge).filter(UserBadge.user_id == student_id).all()
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
async def get_all_badges(db: Session = Depends(get_db)):
    badges = db.query(Badge).all()
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
async def get_shop_items(db: Session = Depends(get_db)):
    items = db.query(ShopItem).filter(ShopItem.is_active == True).all()
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
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    student_id = user_data["user_id"]
    
    item = db.query(ShopItem).filter(ShopItem.id == item_id, ShopItem.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item topilmadi")
    
    # Note: In a real app, check user's coin balance before purchase and deduct
    # Mock behavior for MVP
    
    # Check if already purchased
    existing_purchase = db.query(UserPurchase).filter(
        UserPurchase.user_id == student_id,
        UserPurchase.item_id == item_id
    ).first()
    
    if existing_purchase:
         raise HTTPException(status_code=400, detail="Siz bu mahsulotni allaqachon sotib olgansiz")
         
    purchase = UserPurchase(
        user_id=student_id,
        item_id=item_id,
        price_paid=item.price
    )
    
    db.add(purchase)
    db.commit()
    
    return {
        "success": True,
        "message": "Muvaffaqiyatli xarid qilindi"
    }

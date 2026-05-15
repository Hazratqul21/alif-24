from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from shared.database import get_db
from shared.database.models.marketplace import MarketplaceItem, MarketplaceReview, MarketplacePurchase, MarketplaceItemType, MarketplaceStatus
from shared.database.models.user import User, UserRole
from app.middleware.auth import get_current_user
from shared.database.id_generator import generate_8_digit_id

router = APIRouter()

# ============================================================
# STOREFRONT (Public/Authenticated)
# ============================================================

@router.get("/")
async def list_marketplace_items(
    subject: Optional[str] = None,
    grade: Optional[str] = None,
    item_type: Optional[MarketplaceItemType] = None,
    search: Optional[str] = None,
    sort_by: str = Query("newest", regex="^(newest|price_asc|price_desc|top_rated|popular)$"),
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """List items on the storefront with filters."""
    stmt = select(MarketplaceItem).where(MarketplaceItem.status == MarketplaceStatus.published)
    
    # Filters
    if subject:
        stmt = stmt.where(MarketplaceItem.subject == subject)
    if grade:
        stmt = stmt.where(MarketplaceItem.grade_level == grade)
    if item_type:
        stmt = stmt.where(MarketplaceItem.resource_type == item_type)
    if search:
        stmt = stmt.where(MarketplaceItem.title.ilike(f"%{search}%"))

    # Sorting
    if sort_by == "newest":
        stmt = stmt.order_by(MarketplaceItem.created_at.desc())
    elif sort_by == "price_asc":
        stmt = stmt.order_by(MarketplaceItem.price.asc())
    elif sort_by == "price_desc":
        stmt = stmt.order_by(MarketplaceItem.price.desc())
    elif sort_by == "top_rated":
        stmt = stmt.order_by(MarketplaceItem.average_rating.desc())
    elif sort_by == "popular":
        stmt = stmt.order_by(MarketplaceItem.sales_count.desc())

    # Pagination
    total_res = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = total_res.scalar()
    
    res = await db.execute(stmt.offset(skip).limit(limit))
    items = res.scalars().all()

    return {
        "success": True,
        "total": total,
        "items": items
    }

@router.get("/{id}")
async def get_marketplace_item(id: str, db: AsyncSession = Depends(get_db)):
    """Get detailed info about a specific item."""
    stmt = select(MarketplaceItem).where(MarketplaceItem.id == id)
    res = await db.execute(stmt)
    item = res.scalars().first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Resurs topilmadi")
    
    return {"success": True, "data": item}


# ============================================================
# SELLER ACTIONS (Teachers)
# ============================================================

@router.post("/list-resource")
async def list_resource_for_sale(
    data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List an existing lesson or test in the marketplace."""
    if current_user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Faqat o'qituvchilar resurs sotishi mumkin")

    # Accept both resource_id and test_id (frontend compatibility)
    res_id = data.get("resource_id") or data.get("test_id")
    res_type = data.get("resource_type", "test")
    
    if not res_id:
        raise HTTPException(status_code=400, detail="resource_id yoki test_id majburiy")

    # Ownership Verification
    if res_type == MarketplaceItemType.lesson:
        from shared.database.models.lesson import Lesson
        res_check = await db.execute(select(Lesson).where(and_(Lesson.id == res_id, Lesson.teacher_id == current_user.id)))
    elif res_type == MarketplaceItemType.test:
        from shared.database.models.saved_test import SavedTest
        res_check = await db.execute(select(SavedTest).where(and_(SavedTest.id == res_id, SavedTest.creator_id == current_user.id)))
    elif res_type == MarketplaceItemType.ertak or res_type == "ertak":
        from shared.database.models.story import Story
        from shared.database.models.teacher import TeacherProfile
        tp_res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
        teacher_profile = tp_res.scalars().first()
        if not teacher_profile:
            raise HTTPException(status_code=403, detail="O'qituvchi profili topilmadi")
        res_check = await db.execute(select(Story).where(and_(Story.id == res_id, Story.teacher_id == teacher_profile.id)))
    else:
        raise HTTPException(status_code=400, detail="Noto'g'ri resurs turi")

    if not res_check.scalars().first():
        raise HTTPException(status_code=403, detail="Ushbu resurs sizga tegishli emas yoki topilmadi")
    
    new_item = MarketplaceItem(
        id=generate_8_digit_id(),
        seller_id=current_user.id,
        resource_id=res_id,
        resource_type=res_type,
        title=data["title"],
        description=data.get("description"),
        subject=data.get("subject"),
        grade_level=data.get("grade_level"),
        price=data.get("price", 0),
        is_free=data.get("price", 0) == 0,
        thumbnail_url=data.get("thumbnail_url"),
        status=MarketplaceStatus.published
    )
    
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    
    return {"success": True, "message": "Resurs sotuvga qo'yildi", "data": new_item}


@router.post("/claim-free/{item_id}")
async def claim_free_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Claim a free marketplace item — clone resource to user's library.
    No payment required.
    """
    from app.utils.cloner import clone_resource

    # 1. Get the marketplace item
    res = await db.execute(select(MarketplaceItem).where(MarketplaceItem.id == item_id))
    item = res.scalars().first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Resurs topilmadi")
    
    if item.price > 0 and not item.is_free:
        raise HTTPException(status_code=400, detail="Bu resurs pullik. To'lov tizimi hali ishlamaydi.")
    
    # 2. Check if already claimed
    existing = await db.execute(
        select(MarketplacePurchase).where(
            and_(
                MarketplacePurchase.user_id == current_user.id,
                MarketplacePurchase.item_id == item_id
            )
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Siz bu resursni allaqachon yuklab olgansiz")
    
    # 3. Clone the resource
    cloned_id = await clone_resource(db, item.resource_id, item.resource_type.value, current_user.id)
    
    if not cloned_id:
        raise HTTPException(status_code=500, detail="Resursni nusxalashda xatolik")
    
    # 4. Create purchase record (price = 0)
    purchase = MarketplacePurchase(
        id=generate_8_digit_id(),
        user_id=current_user.id,
        item_id=item.id,
        cloned_resource_id=cloned_id,
        resource_type=item.resource_type,
        purchase_price=0,
        commission_paid=0,
    )
    db.add(purchase)
    
    # 5. Update sales count
    item.sales_count += 1
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Resurs kutubxonangizga muvaffaqiyatli yuklandi!",
        "cloned_resource_id": cloned_id,
        "resource_type": item.resource_type.value
    }

@router.get("/my-listings")
async def get_my_listings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all items posted by the current teacher."""
    stmt = select(MarketplaceItem).where(MarketplaceItem.seller_id == current_user.id)
    res = await db.execute(stmt)
    return {"success": True, "data": res.scalars().all()}


# ============================================================
# CHECKOUT & PURCHASES
# ============================================================

@router.post("/checkout")
async def checkout_marketplace(
    item_ids: List[str] = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate totals and create a PaymentTransaction for the selected items.
    """
    if not item_ids:
        raise HTTPException(status_code=400, detail="Savatcha bo'sh")

    # Fetch items
    res = await db.execute(select(MarketplaceItem).where(MarketplaceItem.id.in_(item_ids)))
    items = res.scalars().all()
    
    if not items:
        raise HTTPException(status_code=404, detail="Tanlangan resurslar topilmadi")

    total_amount = sum(item.price for item in items)
    
    # Check if any items are paid (not free)
    paid_items = [item for item in items if item.price > 0]
    if paid_items:
        raise HTTPException(
            status_code=403, 
            detail="To'lov tizimi hali ishlamaydi. Faqat bepul resurslarni yuklashingiz mumkin."
        )
    
    # For free items, clone directly without payment
    from app.utils.cloner import clone_resource
    
    cloned_resources = []
    for item in items:
        cloned_id = await clone_resource(db, item.resource_id, item.resource_type, current_user.id)
        
        # Create ownership record
        purchase = MarketplacePurchase(
            id=generate_8_digit_id(),
            user_id=current_user.id,
            item_id=item.id,
            cloned_resource_id=cloned_id,
            resource_type=item.resource_type,
            purchase_price=0,
            commission_paid=0,
            transaction_id=None
        )
        db.add(purchase)
        cloned_resources.append({
            "item_id": item.id,
            "title": item.title,
            "cloned_id": cloned_id
        })
        
        # Update sales count
        item.sales_count += 1
    
    await db.commit()
    
    return {
        "success": True, 
        "message": f"{len(items)} ta bepul resurs kutubxolangizga yuklandi",
        "items": cloned_resources,
        "total": 0,
        "items_count": len(items)
    }

@router.post("/purchases/complete-mock/{txn_id}")
async def complete_purchase_mock(
    txn_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    MOCK: Webhook simulation to complete a purchase.
    DISABLED - To'lov tizimi vaqtincha o'chirilgan
    """
    return {
        "success": False, 
        "message": "To'lov tizimi hali ishlamaydi. Faqat bepul resurslardan foydalaning."
    }

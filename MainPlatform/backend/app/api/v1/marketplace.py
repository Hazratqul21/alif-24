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

    res_id = data["resource_id"]
    res_type = data["resource_type"]

    # Ownership Verification
    if res_type == MarketplaceItemType.lesson:
        from shared.database.models.lesson import Lesson
        res_check = await db.execute(select(Lesson).where(and_(Lesson.id == res_id, Lesson.teacher_id == current_user.id)))
    elif res_type == MarketplaceItemType.test:
        from shared.database.models.saved_test import SavedTest
        res_check = await db.execute(select(SavedTest).where(and_(SavedTest.id == res_id, SavedTest.creator_id == current_user.id)))
    else:
        raise HTTPException(status_code=400, detail="Noto'g'ri resurs turi")

    if not res_check.scalars().first():
        raise HTTPException(status_code=403, detail="Ushbu resurs sizga tegishli emas yoki topilmadi")
    
    new_item = MarketplaceItem(
        id=generate_8_digit_id(),
        seller_id=current_user.id,
        resource_id=data["resource_id"],
        resource_type=data["resource_type"],
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
    
    # In a real app, we'd create a single transaction for the whole cart.
    # For now, let's optimize for single item or first item for simplicity in the mock.
    # Or keep it generic for the future.
    
    # Platform Commission (10%)
    commission = int(total_amount * 0.1)
    seller_amount = total_amount - commission

    from shared.database.models.payment import PaymentTransaction, TransactionStatus
    
    txn = PaymentTransaction(
        id=generate_8_digit_id(),
        user_id=current_user.id,
        marketplace_item_id=items[0].id, # Link to primary item
        amount=total_amount,
        commission_amount=commission,
        seller_amount=seller_amount,
        provider="payme", # Mock
        status=TransactionStatus.pending.value,
        description=f"Marketplace: {len(items)} ta resurs",
    )
    
    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    return {
        "success": True, 
        "transaction_id": txn.id,
        "total": total_amount,
        "items_count": len(items)
    }

@router.post("/purchases/complete-mock/{txn_id}")
async def complete_purchase_mock(
    txn_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    MOCK: Webhook simulation to complete a purchase.
    Triggers: Cloning, Wallet Update, Ownership record.
    """
    from shared.database.models.payment import PaymentTransaction, TransactionStatus
    from shared.database.models.wallet import TeacherWallet, WalletTransaction, WalletTransactionType
    from app.utils.cloner import clone_resource

    res = await db.execute(select(PaymentTransaction).where(PaymentTransaction.id == txn_id))
    txn = res.scalars().first()
    
    if not txn or txn.status == TransactionStatus.completed.value:
        return {"success": False, "message": "Already completed or not found"}

    # 1. Update Transaction
    txn.status = TransactionStatus.completed.value
    
    # 2. Get Marketplace Item
    item_res = await db.execute(select(MarketplaceItem).where(MarketplaceItem.id == txn.marketplace_item_id))
    item = item_res.scalars().first()
    
    if item:
        # 3. CLONE RESOURCE as requested
        cloned_id = await clone_resource(db, item.resource_id, item.resource_type, txn.user_id)
        
        # 4. Create Ownership
        purchase = MarketplacePurchase(
            id=generate_8_digit_id(),
            user_id=txn.user_id,
            item_id=item.id,
            cloned_resource_id=cloned_id,
            resource_type=item.resource_type,
            purchase_price=txn.amount,
            commission_paid=txn.commission_amount,
            transaction_id=txn.id
        )
        db.add(purchase)
        
        # 5. Update Seller Wallet
        wallet_res = await db.execute(select(TeacherWallet).where(TeacherWallet.user_id == item.seller_id))
        wallet = wallet_res.scalars().first()
        if not wallet:
            wallet = TeacherWallet(user_id=item.seller_id)
            db.add(wallet)
            await db.flush()
        
        wallet.total_earned += txn.amount
        wallet.total_commission += txn.commission_amount
        wallet.current_balance += txn.seller_amount # Net to teacher
        
        # 6. Wallet Transaction
        w_txn = WalletTransaction(
            wallet_id=wallet.id,
            type=WalletTransactionType.sale,
            amount=txn.seller_amount,
            description=f"Sotuv: {item.title}",
            marketplace_purchase_id=purchase.id,
            payment_transaction_id=txn.id
        )
        db.add(w_txn)
        
        item.sales_count += 1

    await db.commit()
    return {"success": True, "message": "Xarid muvaffaqiyatli yakunlandi, resurs nusxalandi."}

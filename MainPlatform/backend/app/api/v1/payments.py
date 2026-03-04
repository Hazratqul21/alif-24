"""
Payments Router — To'lov tizimi API
User: checkout, status, history
Admin: gateway CRUD, to'lovlar tarixi, statistika
Webhooks: Payme, Click, Uzum callback'lari
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date, distinct
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import json
import logging

from shared.database import get_db
from shared.database.models import (
    User,
    SubscriptionPlanConfig, UserSubscription, SubscriptionStatus,
    PaymentGatewayConfig, PaymentTransaction, TransactionStatus,
)
from shared.payments.gateway_service import get_gateway

logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class CheckoutRequest(BaseModel):
    plan_config_id: str
    gateway_id: Optional[str] = None  # Agar berilmasa default gateway ishlatiladi
    return_url: Optional[str] = "https://alif24.uz/payment/success"


class GatewayCreateRequest(BaseModel):
    provider: str           # "payme", "click", "uzum"
    name: str
    description: Optional[str] = None
    merchant_id: Optional[str] = None
    secret_key: Optional[str] = None
    service_id: Optional[str] = None
    is_active: bool = True
    is_test_mode: bool = True
    is_default: bool = False
    settings: Optional[dict] = None
    sort_order: int = 0


class GatewayUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    merchant_id: Optional[str] = None
    secret_key: Optional[str] = None
    service_id: Optional[str] = None
    is_active: Optional[bool] = None
    is_test_mode: Optional[bool] = None
    is_default: Optional[bool] = None
    settings: Optional[dict] = None
    sort_order: Optional[int] = None


# ============================================================================
# AUTH HELPERS
# ============================================================================

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """JWT cookie'dan foydalanuvchini olish"""
    from app.core.auth import decode_token
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Tizimga kiring")
    try:
        payload = decode_token(token)
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token noto'g'ri")
    except Exception:
        raise HTTPException(status_code=401, detail="Token muddati tugagan")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return user


async def get_default_gateway(db: AsyncSession) -> PaymentGatewayConfig:
    """Default yoki birinchi faol gateway'ni olish"""
    # Avval default
    result = await db.execute(
        select(PaymentGatewayConfig).where(
            PaymentGatewayConfig.is_active == True,
            PaymentGatewayConfig.is_default == True,
        ).limit(1)
    )
    gw = result.scalars().first()
    if gw:
        return gw

    # Default yo'q — birinchi faol
    result = await db.execute(
        select(PaymentGatewayConfig).where(
            PaymentGatewayConfig.is_active == True,
        ).order_by(PaymentGatewayConfig.sort_order).limit(1)
    )
    gw = result.scalars().first()
    if not gw:
        raise HTTPException(status_code=503, detail="To'lov tizimi sozlanmagan. Admin bilan bog'laning.")
    return gw


# ============================================================================
# USER: CHECKOUT
# ============================================================================

@router.post("/checkout")
async def checkout(
    data: CheckoutRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    To'lov boshlash — checkout URL olish.
    1. Plan tekshirish
    2. Gateway tanlash
    3. Tranzaksiya yaratish
    4. Gateway'dan checkout URL olish
    """
    # 1. Plan tekshirish
    plan_result = await db.execute(
        select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.id == data.plan_config_id)
    )
    plan = plan_result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan topilmadi")
    if not plan.is_active:
        raise HTTPException(status_code=400, detail="Bu plan hozir faol emas")
    if plan.price <= 0:
        raise HTTPException(status_code=400, detail="Bepul plan uchun to'lov shart emas")

    # 2. Gateway tanlash
    if data.gateway_id:
        gw_result = await db.execute(
            select(PaymentGatewayConfig).where(
                PaymentGatewayConfig.id == data.gateway_id,
                PaymentGatewayConfig.is_active == True,
            )
        )
        gateway = gw_result.scalars().first()
        if not gateway:
            raise HTTPException(status_code=404, detail="Gateway topilmadi")
    else:
        gateway = await get_default_gateway(db)

    # 3. Tranzaksiya yaratish
    transaction = PaymentTransaction(
        user_id=user.id,
        plan_config_id=plan.id,
        gateway_config_id=gateway.id,
        provider=gateway.provider,
        amount=plan.price,
        status=TransactionStatus.pending.value,
        description=f"{plan.name} obunasi — {plan.duration_days} kun",
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # 4. Gateway'dan checkout URL olish
    try:
        gw_service = get_gateway({
            "provider": gateway.provider,
            "merchant_id": gateway.merchant_id,
            "secret_key": gateway.secret_key,
            "service_id": gateway.service_id,
            "is_test_mode": gateway.is_test_mode,
            "settings": gateway.settings,
        })
        result = await gw_service.create_payment(
            amount=plan.price,
            order_id=transaction.id,
            description=transaction.description,
            return_url=data.return_url,
        )

        transaction.checkout_url = result.get("checkout_url")
        transaction.external_id = result.get("external_id")
        transaction.gateway_response = result.get("raw")
        transaction.status = TransactionStatus.processing.value
        await db.commit()

        return {
            "transaction_id": transaction.id,
            "checkout_url": transaction.checkout_url,
            "provider": gateway.provider,
            "amount": plan.price,
            "plan_name": plan.name,
        }
    except Exception as e:
        logger.error(f"Checkout error: {e}")
        transaction.status = TransactionStatus.failed.value
        transaction.error_message = str(e)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"To'lov tizimi xatosi: {str(e)}")


# ============================================================================
# USER: MY PAYMENTS
# ============================================================================

@router.get("/my")
async def my_payments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """Foydalanuvchining to'lovlari tarixi"""
    result = await db.execute(
        select(PaymentTransaction)
        .where(PaymentTransaction.user_id == user.id)
        .order_by(PaymentTransaction.created_at.desc())
        .limit(limit)
    )
    transactions = result.scalars().all()
    return {
        "transactions": [t.to_dict() for t in transactions],
    }


@router.get("/check/{transaction_id}")
async def check_payment_status(
    transaction_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """To'lov holatini tekshirish"""
    result = await db.execute(
        select(PaymentTransaction).where(
            PaymentTransaction.id == transaction_id,
            PaymentTransaction.user_id == user.id,
        )
    )
    txn = result.scalars().first()
    if not txn:
        raise HTTPException(status_code=404, detail="Tranzaksiya topilmadi")

    return txn.to_dict()


# ============================================================================
# USER: AVAILABLE GATEWAYS
# ============================================================================

@router.get("/gateways/available")
async def available_gateways(db: AsyncSession = Depends(get_db)):
    """Foydalanuvchi ko'radigan to'lov usullari"""
    result = await db.execute(
        select(PaymentGatewayConfig)
        .where(PaymentGatewayConfig.is_active == True)
        .order_by(PaymentGatewayConfig.sort_order)
    )
    gateways = result.scalars().all()
    return {
        "gateways": [
            {
                "id": g.id,
                "provider": g.provider,
                "name": g.name,
                "is_default": g.is_default,
            }
            for g in gateways
        ]
    }


# ============================================================================
# WEBHOOKS
# ============================================================================

async def _complete_payment(txn: PaymentTransaction, db: AsyncSession):
    """To'lov muvaffaqiyatli — obuna berish"""
    txn.status = TransactionStatus.completed.value
    txn.completed_at = datetime.now(timezone.utc)

    if txn.plan_config_id:
        # Eski faol obunani expired qilish
        old_subs = await db.execute(
            select(UserSubscription).where(
                UserSubscription.user_id == txn.user_id,
                UserSubscription.status == SubscriptionStatus.active.value,
            )
        )
        for old in old_subs.scalars().all():
            old.status = SubscriptionStatus.expired.value

        # Plan olish
        plan_result = await db.execute(
            select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.id == txn.plan_config_id)
        )
        plan = plan_result.scalars().first()
        if plan:
            now = datetime.now(timezone.utc)
            sub = UserSubscription(
                user_id=txn.user_id,
                plan_config_id=plan.id,
                status=SubscriptionStatus.active.value,
                started_at=now,
                expires_at=now + timedelta(days=plan.duration_days),
                amount_paid=txn.amount,
                created_by=f"payment:{txn.provider}",
                notes=f"Transaction: {txn.id}",
            )
            db.add(sub)

    await db.commit()
    logger.info(f"Payment completed: {txn.id} user={txn.user_id} amount={txn.amount}")


@router.post("/webhook/payme")
async def webhook_payme(request: Request, db: AsyncSession = Depends(get_db)):
    """Payme JSON-RPC webhook"""
    body = await request.body()
    headers = dict(request.headers)

    # Gateway topish
    result = await db.execute(
        select(PaymentGatewayConfig).where(
            PaymentGatewayConfig.provider == "payme",
            PaymentGatewayConfig.is_active == True,
        ).limit(1)
    )
    gw = result.scalars().first()
    if not gw:
        return {"error": {"code": -32504, "message": "Gateway not found"}}

    gateway = get_gateway({
        "provider": "payme",
        "merchant_id": gw.merchant_id,
        "secret_key": gw.secret_key,
        "is_test_mode": gw.is_test_mode,
    })

    # Auth tekshirish
    if not gateway.verify_webhook(headers, body):
        return {"error": {"code": -32504, "message": "Auth failed"}}

    parsed = gateway.parse_webhook(headers, body)
    method = parsed.get("method", "")
    order_id = parsed.get("order_id")
    rpc_id = parsed.get("rpc_id")

    if method == "CheckPerformTransaction":
        # Tranzaksiya tekshirish
        if order_id:
            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.id == order_id)
            )
            txn = txn_result.scalars().first()
            if txn and txn.status in (TransactionStatus.pending.value, TransactionStatus.processing.value):
                return {"id": rpc_id, "result": {"allow": True}}
        return {"id": rpc_id, "error": {"code": -31050, "message": "Order not found"}}

    elif method == "CreateTransaction":
        if order_id:
            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.id == order_id)
            )
            txn = txn_result.scalars().first()
            if txn:
                txn.external_id = parsed.get("external_id")
                txn.status = TransactionStatus.processing.value
                txn.gateway_response = parsed.get("raw")
                await db.commit()
                return {"id": rpc_id, "result": {"create_time": int(txn.created_at.timestamp() * 1000), "transaction": txn.external_id, "state": 1}}
        return {"id": rpc_id, "error": {"code": -31050, "message": "Order not found"}}

    elif method == "PerformTransaction":
        ext_id = parsed.get("external_id")
        if ext_id:
            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.external_id == ext_id)
            )
            txn = txn_result.scalars().first()
            if txn:
                await _complete_payment(txn, db)
                return {"id": rpc_id, "result": {"transaction": txn.external_id, "perform_time": int(datetime.now(timezone.utc).timestamp() * 1000), "state": 2}}
        return {"id": rpc_id, "error": {"code": -31003, "message": "Transaction not found"}}

    elif method == "CancelTransaction":
        ext_id = parsed.get("external_id")
        if ext_id:
            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.external_id == ext_id)
            )
            txn = txn_result.scalars().first()
            if txn:
                txn.status = TransactionStatus.cancelled.value
                txn.gateway_response = parsed.get("raw")
                await db.commit()
                return {"id": rpc_id, "result": {"transaction": txn.external_id, "cancel_time": int(datetime.now(timezone.utc).timestamp() * 1000), "state": -1}}
        return {"id": rpc_id, "error": {"code": -31003, "message": "Transaction not found"}}

    elif method == "CheckTransaction":
        ext_id = parsed.get("external_id")
        if ext_id:
            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.external_id == ext_id)
            )
            txn = txn_result.scalars().first()
            if txn:
                state_map = {
                    TransactionStatus.pending.value: 1,
                    TransactionStatus.processing.value: 1,
                    TransactionStatus.completed.value: 2,
                    TransactionStatus.cancelled.value: -1,
                    TransactionStatus.failed.value: -2,
                }
                return {"id": rpc_id, "result": {"create_time": int(txn.created_at.timestamp() * 1000), "perform_time": int(txn.completed_at.timestamp() * 1000) if txn.completed_at else 0, "state": state_map.get(txn.status, 1), "transaction": txn.external_id}}
        return {"id": rpc_id, "error": {"code": -31003, "message": "Transaction not found"}}

    return {"id": rpc_id, "error": {"code": -32601, "message": f"Unknown method: {method}"}}


@router.post("/webhook/click")
async def webhook_click(request: Request, db: AsyncSession = Depends(get_db)):
    """Click webhook callback"""
    body = await request.body()
    headers = dict(request.headers)

    result = await db.execute(
        select(PaymentGatewayConfig).where(
            PaymentGatewayConfig.provider == "click",
            PaymentGatewayConfig.is_active == True,
        ).limit(1)
    )
    gw = result.scalars().first()
    if not gw:
        return {"error": -1, "error_note": "Gateway not configured"}

    gateway = get_gateway({
        "provider": "click",
        "merchant_id": gw.merchant_id,
        "secret_key": gw.secret_key,
        "service_id": gw.service_id,
        "is_test_mode": gw.is_test_mode,
    })

    if not gateway.verify_webhook(headers, body):
        return {"error": -1, "error_note": "Sign verification failed"}

    parsed = gateway.parse_webhook(headers, body)
    order_id = parsed.get("order_id")

    if not order_id:
        return {"error": -5, "error_note": "Order not found"}

    txn_result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.id == order_id)
    )
    txn = txn_result.scalars().first()
    if not txn:
        return {"error": -5, "error_note": "Transaction not found"}

    if parsed.get("method") == "prepare":
        txn.external_id = parsed.get("external_id")
        txn.status = TransactionStatus.processing.value
        txn.gateway_response = parsed.get("raw")
        await db.commit()
        return {"error": 0, "error_note": "Success", "click_trans_id": parsed.get("external_id"), "merchant_trans_id": order_id, "merchant_prepare_id": txn.id}

    elif parsed.get("method") == "complete":
        if parsed.get("status") == "completed":
            await _complete_payment(txn, db)
            return {"error": 0, "error_note": "Success", "click_trans_id": parsed.get("external_id"), "merchant_trans_id": order_id, "merchant_confirm_id": txn.id}
        else:
            txn.status = TransactionStatus.failed.value
            txn.error_message = f"Click error: {parsed.get('error')}"
            txn.gateway_response = parsed.get("raw")
            await db.commit()
            return {"error": -9, "error_note": "Payment failed"}

    return {"error": -3, "error_note": "Unknown action"}


@router.post("/webhook/uzum")
async def webhook_uzum(request: Request, db: AsyncSession = Depends(get_db)):
    """Uzum Bank webhook callback"""
    body = await request.body()
    headers = dict(request.headers)

    result = await db.execute(
        select(PaymentGatewayConfig).where(
            PaymentGatewayConfig.provider == "uzum",
            PaymentGatewayConfig.is_active == True,
        ).limit(1)
    )
    gw = result.scalars().first()
    if not gw:
        return {"status": "error", "message": "Gateway not configured"}

    gateway = get_gateway({
        "provider": "uzum",
        "merchant_id": gw.merchant_id,
        "secret_key": gw.secret_key,
        "service_id": gw.service_id,
    })

    parsed = gateway.parse_webhook(headers, body)
    order_id = parsed.get("order_id")

    if not order_id:
        return {"status": "error", "message": "Order not found"}

    txn_result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.id == order_id)
    )
    txn = txn_result.scalars().first()
    if not txn:
        return {"status": "error", "message": "Transaction not found"}

    if parsed.get("status") == "completed":
        await _complete_payment(txn, db)
    elif parsed.get("status") in ("cancelled", "failed"):
        txn.status = TransactionStatus.failed.value
        txn.gateway_response = parsed.get("raw")
        await db.commit()

    return {"status": "ok"}


# ============================================================================
# ADMIN: GATEWAY MANAGEMENT
# ============================================================================

from .admin_panel import verify_admin, has_permission


@router.get("/admin/gateways")
async def admin_get_gateways(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: barcha gateway'lar"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(
        select(PaymentGatewayConfig).order_by(PaymentGatewayConfig.sort_order)
    )
    gateways = result.scalars().all()
    return {"gateways": [g.to_dict(hide_keys=True) for g in gateways]}


@router.post("/admin/gateways")
async def admin_create_gateway(
    data: GatewayCreateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: gateway yaratish"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    if data.provider not in ("payme", "click", "uzum"):
        raise HTTPException(status_code=400, detail="Noto'g'ri provider. Faqat: payme, click, uzum")

    # Agar default bo'lsa, boshqalarni default emas qilish
    if data.is_default:
        await db.execute(
            select(PaymentGatewayConfig)  # dummy — need update
        )
        existing = await db.execute(select(PaymentGatewayConfig).where(PaymentGatewayConfig.is_default == True))
        for gw in existing.scalars().all():
            gw.is_default = False

    # Webhook URL avtomatik
    base_url = "https://api.alif24.uz/api/v1"
    webhook_url = f"{base_url}/payments/webhook/{data.provider}"

    gw = PaymentGatewayConfig(
        provider=data.provider,
        name=data.name,
        description=data.description,
        merchant_id=data.merchant_id,
        secret_key=data.secret_key,
        service_id=data.service_id,
        is_active=data.is_active,
        is_test_mode=data.is_test_mode,
        is_default=data.is_default,
        webhook_url=webhook_url,
        settings=data.settings,
        sort_order=data.sort_order,
    )
    db.add(gw)
    await db.commit()
    await db.refresh(gw)

    return {"message": f"'{data.name}' gateway yaratildi", "gateway": gw.to_dict(hide_keys=True)}


@router.put("/admin/gateways/{gateway_id}")
async def admin_update_gateway(
    gateway_id: str,
    data: GatewayUpdateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: gateway yangilash"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(select(PaymentGatewayConfig).where(PaymentGatewayConfig.id == gateway_id))
    gw = result.scalars().first()
    if not gw:
        raise HTTPException(status_code=404, detail="Gateway topilmadi")

    if data.name is not None: gw.name = data.name
    if data.description is not None: gw.description = data.description
    if data.merchant_id is not None: gw.merchant_id = data.merchant_id
    if data.secret_key is not None: gw.secret_key = data.secret_key
    if data.service_id is not None: gw.service_id = data.service_id
    if data.is_active is not None: gw.is_active = data.is_active
    if data.is_test_mode is not None: gw.is_test_mode = data.is_test_mode
    if data.settings is not None: gw.settings = data.settings
    if data.sort_order is not None: gw.sort_order = data.sort_order

    if data.is_default is True:
        existing = await db.execute(select(PaymentGatewayConfig).where(PaymentGatewayConfig.is_default == True, PaymentGatewayConfig.id != gateway_id))
        for old in existing.scalars().all():
            old.is_default = False
        gw.is_default = True
    elif data.is_default is False:
        gw.is_default = False

    await db.commit()
    return {"message": "Gateway yangilandi", "gateway": gw.to_dict(hide_keys=True)}


@router.delete("/admin/gateways/{gateway_id}")
async def admin_delete_gateway(
    gateway_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: gateway o'chirish"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(select(PaymentGatewayConfig).where(PaymentGatewayConfig.id == gateway_id))
    gw = result.scalars().first()
    if not gw:
        raise HTTPException(status_code=404, detail="Gateway topilmadi")

    await db.delete(gw)
    await db.commit()
    return {"message": f"'{gw.name}' gateway o'chirildi"}


# ============================================================================
# ADMIN: PAYMENTS LIST & STATS
# ============================================================================

@router.get("/admin/transactions")
async def admin_get_transactions(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None,
    provider: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Admin: barcha to'lovlar tarixi"""
    stmt = select(PaymentTransaction).order_by(PaymentTransaction.created_at.desc())
    count_stmt = select(func.count(PaymentTransaction.id))

    if status:
        stmt = stmt.where(PaymentTransaction.status == status)
        count_stmt = count_stmt.where(PaymentTransaction.status == status)
    if provider:
        stmt = stmt.where(PaymentTransaction.provider == provider)
        count_stmt = count_stmt.where(PaymentTransaction.provider == provider)

    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    transactions = result.scalars().all()

    # User info qo'shish
    items = []
    for txn in transactions:
        d = txn.to_dict()
        user_result = await db.execute(select(User.first_name, User.last_name, User.phone).where(User.id == txn.user_id))
        u = user_result.first()
        if u:
            d["user_name"] = f"{u.first_name} {u.last_name}"
            d["user_phone"] = u.phone
        items.append(d)

    return {"total": total, "transactions": items}


@router.get("/admin/payments-stats")
async def admin_payment_stats(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: to'lov statistikasi"""
    today = datetime.now(timezone.utc).date()
    month_ago = today - timedelta(days=30)

    total_revenue = (await db.execute(
        select(func.sum(PaymentTransaction.amount)).where(
            PaymentTransaction.status == TransactionStatus.completed.value
        )
    )).scalar() or 0

    monthly_revenue = (await db.execute(
        select(func.sum(PaymentTransaction.amount)).where(
            PaymentTransaction.status == TransactionStatus.completed.value,
            cast(PaymentTransaction.completed_at, Date) >= month_ago,
        )
    )).scalar() or 0

    total_transactions = (await db.execute(select(func.count(PaymentTransaction.id)))).scalar() or 0
    completed = (await db.execute(select(func.count(PaymentTransaction.id)).where(PaymentTransaction.status == TransactionStatus.completed.value))).scalar() or 0
    pending = (await db.execute(select(func.count(PaymentTransaction.id)).where(PaymentTransaction.status == TransactionStatus.pending.value))).scalar() or 0
    failed = (await db.execute(select(func.count(PaymentTransaction.id)).where(PaymentTransaction.status == TransactionStatus.failed.value))).scalar() or 0

    # Provider bo'yicha
    provider_result = await db.execute(
        select(
            PaymentTransaction.provider,
            func.count(PaymentTransaction.id).label("count"),
            func.sum(PaymentTransaction.amount).label("revenue"),
        ).where(PaymentTransaction.status == TransactionStatus.completed.value)
        .group_by(PaymentTransaction.provider)
    )
    by_provider = {r.provider: {"count": r.count, "revenue": int(r.revenue or 0)} for r in provider_result}

    return {
        "total_revenue": int(total_revenue),
        "monthly_revenue": int(monthly_revenue),
        "total_transactions": total_transactions,
        "completed": completed,
        "pending": pending,
        "failed": failed,
        "success_rate": round((completed / total_transactions * 100), 1) if total_transactions > 0 else 0,
        "by_provider": by_provider,
    }

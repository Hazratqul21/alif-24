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
    PromoCode, PromoCodeUsage,
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
    promo_code: Optional[str] = None  # Chegirma uchun promokod (ixtiyoriy)


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

from app.middleware.auth import get_current_user


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

    # 3. Promokod chegirma tekshirish (ixtiyoriy)
    final_amount = plan.price
    promo_applied = None
    if data.promo_code:
        try:
            promo_obj = await _validate_promo(data.promo_code, user.id, db)
            if promo_obj.promo_type == "discount" and promo_obj.discount_percent > 0:
                discount_amount = int(plan.price * promo_obj.discount_percent / 100)
                final_amount = max(0, plan.price - discount_amount)
                promo_applied = promo_obj
        except HTTPException:
            # Noto'g'ri promokod — checkout ni to'xtatmaymiz, shunchaki e'tiborsiz qoldiramiz
            logger.warning(f"Checkout: invalid promo_code '{data.promo_code}' for user {user.id}")

    # 4. Tranzaksiya yaratish
    transaction = PaymentTransaction(
        user_id=user.id,
        plan_config_id=plan.id,
        gateway_config_id=gateway.id,
        provider=gateway.provider,
        amount=final_amount,
        status=TransactionStatus.pending.value,
        description=(
            f"{plan.name} obunasi — {plan.duration_days} kun"
            + (f" ({promo_applied.discount_percent}% chegirma)" if promo_applied else "")
        ),
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # Chegirma promokod ishlatildi — usage yozamiz
    if promo_applied:
        usage = PromoCodeUsage(
            promo_code_id=promo_applied.id,
            user_id=user.id,
            result_type="discount",
            result_value=f"{promo_applied.discount_percent}% chegirma, asl: {plan.price} UZS → {final_amount} UZS",
        )
        db.add(usage)
        promo_applied.current_uses = (promo_applied.current_uses or 0) + 1
        await db.commit()

    # 5. Gateway'dan checkout URL olish
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
            amount=final_amount,
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
            "amount": final_amount,
            "original_amount": plan.price,
            "plan_name": plan.name,
            "discount_applied": promo_applied.discount_percent if promo_applied else None,
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
# PROMO CODE — USER FACING
# ============================================================================

async def _validate_promo(
    code: str,
    user_id: str,
    db: AsyncSession,
) -> PromoCode:
    """
    Promokodni tekshirish:
    - Mavjudmi, faolmi, muddati o'tmaganmi,
    - Umumiy limit oshmaganmi, user o'zi ko'p ishlatmaganmi
    """
    result = await db.execute(
        select(PromoCode).where(PromoCode.code == code.upper(), PromoCode.is_active == True)
    )
    promo = result.scalars().first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promokod topilmadi yoki faol emas")

    now = datetime.now(timezone.utc)
    if promo.starts_at and promo.starts_at > now:
        raise HTTPException(status_code=400, detail="Promokod hali kuchga kirmagan")
    if promo.expires_at and promo.expires_at < now:
        raise HTTPException(status_code=400, detail="Promokod muddati tugagan")
    if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
        raise HTTPException(status_code=400, detail="Promokod ishlatish limiti tugagan")

    # User bu promokodni necha marta ishlatgan
    if promo.max_uses_per_user > 0:
        user_usage = await db.scalar(
            select(func.count(PromoCodeUsage.id)).where(
                PromoCodeUsage.promo_code_id == promo.id,
                PromoCodeUsage.user_id == user_id,
            )
        ) or 0
        if user_usage >= promo.max_uses_per_user:
            raise HTTPException(status_code=400, detail="Siz bu promokodni allaqachon ishlatgansiz")

    return promo


@router.get("/promo/{code}")
async def validate_promo_code(
    code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Promokodni tekshirish (ishlatmasdan).
    Frontend da foydalanuvchi kod kiritganda darhol ko'rsatish uchun.
    """
    promo = await _validate_promo(code, user.id, db)

    # Chegirma turida plan narxini ko'rsatish uchun
    preview = {
        "code": promo.code,
        "promo_type": promo.promo_type,
        "description": promo.description,
    }
    if promo.promo_type == "discount":
        preview["discount_percent"] = promo.discount_percent
        preview["message"] = f"{promo.discount_percent}% chegirma beriladi"
    elif promo.promo_type == "free_days":
        preview["free_days_count"] = promo.free_days_count
        preview["message"] = f"{promo.free_days_count} kun bepul sinash muddati beriladi"
    elif promo.promo_type == "plan":
        if promo.plan_config:
            preview["plan_name"] = promo.plan_config.name
            preview["plan_days"] = promo.plan_config.duration_days
        preview["message"] = "Sizga to'liq obuna beriladi"

    return {"valid": True, "promo": preview}


@router.post("/promo/{code}/apply")
async def apply_promo_code(
    code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Promokodni qo'llash.
    - free_days: Foydalanuvchining joriy obunasiga kun qo'shadi (yoki yangi ochadi).
    - plan: To'g'ridan-to'g'ri berilgan planni beradi.
    - discount: Checkout paytida ishlatiladi, bu endpoint faqat tasdiqlaydi.
    """
    promo = await _validate_promo(code, user.id, db)

    if promo.promo_type == "discount":
        # Chegirma checkout da qo'llanadi, bu yerda faqat tasdiqlash
        return {
            "applied": False,
            "message": f"'{promo.code}' chegirma kodi to'lov paytida avtomatik qo'llanadi",
            "promo_type": "discount",
            "discount_percent": promo.discount_percent,
            "code": promo.code,
        }

    now = datetime.now(timezone.utc)

    if promo.promo_type == "free_days":
        # Joriy faol obunani topamiz
        existing_sub_res = await db.execute(
            select(UserSubscription).where(
                UserSubscription.user_id == user.id,
                UserSubscription.status == SubscriptionStatus.active.value,
            ).order_by(UserSubscription.expires_at.desc())
        )
        existing_sub = existing_sub_res.scalars().first()

        if existing_sub:
            # Mavjud obunaning muddatini uzaytiramiz
            existing_sub.expires_at = existing_sub.expires_at + timedelta(days=promo.free_days_count)
            result_msg = f"Obunangiz {promo.free_days_count} kunga uzaytirildi. Yangi tugash: {existing_sub.expires_at.strftime('%d.%m.%Y')}"
        else:
            # Joriy faol obuna yo'q — eng arzon (yoki birinchi) planni bepul ochib beramiz
            first_plan_res = await db.execute(
                select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.is_active == True)
                .order_by(SubscriptionPlanConfig.sort_order)
                .limit(1)
            )
            first_plan = first_plan_res.scalars().first()
            if not first_plan:
                raise HTTPException(status_code=503, detail="Hozircha faol obuna plani mavjud emas")

            new_sub = UserSubscription(
                user_id=user.id,
                plan_config_id=first_plan.id,
                status=SubscriptionStatus.active.value,
                started_at=now,
                expires_at=now + timedelta(days=promo.free_days_count),
                amount_paid=0,
                created_by=f"promo:{promo.code}",
                notes=f"Promocode: {promo.code} ({promo.free_days_count} kun bepul)",
            )
            db.add(new_sub)
            result_msg = f"{promo.free_days_count} kunlik bepul obuna ochildi!"

    elif promo.promo_type == "plan":
        if not promo.plan_config_id:
            raise HTTPException(status_code=500, detail="Promokod plani sozlanmagan")

        plan_res = await db.execute(
            select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.id == promo.plan_config_id)
        )
        plan = plan_res.scalars().first()
        if not plan or not plan.is_active:
            raise HTTPException(status_code=400, detail="Promokod plani faol emas")

        # Eski faol obunani expire qilamiz
        old_subs_res = await db.execute(
            select(UserSubscription).where(
                UserSubscription.user_id == user.id,
                UserSubscription.status == SubscriptionStatus.active.value,
            )
        )
        for old in old_subs_res.scalars().all():
            old.status = SubscriptionStatus.expired.value

        new_sub = UserSubscription(
            user_id=user.id,
            plan_config_id=plan.id,
            status=SubscriptionStatus.active.value,
            started_at=now,
            expires_at=now + timedelta(days=plan.duration_days),
            amount_paid=0,
            created_by=f"promo:{promo.code}",
            notes=f"Promocode: {promo.code}",
        )
        db.add(new_sub)
        result_msg = f"'{plan.name}' obunasi muvaffaqiyatli ochildi ({plan.duration_days} kun)!"

    else:
        raise HTTPException(status_code=400, detail="Noma'lum promokod turi")

    # PromoCodeUsage yozamiz
    usage = PromoCodeUsage(
        promo_code_id=promo.id,
        user_id=user.id,
        result_type=promo.promo_type,
        result_value=(
            f"{promo.free_days_count} kun" if promo.promo_type == "free_days"
            else promo.plan_config.name if promo.plan_config else str(promo.plan_config_id)
        ),
    )
    db.add(usage)

    # Promokod counter
    promo.current_uses = (promo.current_uses or 0) + 1
    await db.commit()

    return {"applied": True, "message": result_msg}



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
    try:
        body = await request.body()
        headers = dict(request.headers)

        # Log incoming webhook for debugging
        try:
            body_str = body.decode('utf-8')[:500] if body else ''
        except:
            body_str = '<binary>'

        logger.info(f"Payme webhook received: headers={dict(headers)}, body_preview={body_str[:200]}")

        # Gateway topish
        result = await db.execute(
            select(PaymentGatewayConfig).where(
                PaymentGatewayConfig.provider == "payme",
                PaymentGatewayConfig.is_active == True,
            ).limit(1)
        )
        gw = result.scalars().first()
        if not gw:
            logger.error("Payme webhook: Gateway not found in database")
            return {"error": {"code": -32504, "message": "Gateway not found"}}

        logger.info(f"Payme webhook: gateway found, is_test_mode={gw.is_test_mode}, merchant_id={gw.merchant_id}")

        gateway = get_gateway({
            "provider": "payme",
            "merchant_id": gw.merchant_id,
            "secret_key": gw.secret_key,
            "is_test_mode": gw.is_test_mode or True,  # Always use test mode for now
        })

        # Auth tekshirish - more detailed logging
        auth_result = gateway.verify_webhook(headers, body)
        logger.info(f"Payme webhook verify_webhook result: {auth_result}")

        # Id olish (auth error uchun kerak)
        try:
            parsed_body = json.loads(body)
            rpc_id = parsed_body.get("id")
        except:
            rpc_id = None

        if not auth_result:
            logger.warning(f"Payme webhook: Auth failed. headers={dict(headers)}")
            return {"id": rpc_id, "error": {"code": -32504, "message": "Auth failed"}}

        parsed = gateway.parse_webhook(headers, body)
        logger.info(f"Payme webhook parsed: {parsed}")

        if "error" in parsed:
            logger.error(f"Payme webhook parse error: {parsed['error']}")
            return {"id": rpc_id, "error": {"code": -32504, "message": "Parse error"}}

        method = parsed.get("method", "")
        order_id = parsed.get("order_id")
        # rpc_id already parsed above, but can be extracted again if needed
        rpc_id = parsed.get("rpc_id") or rpc_id

        logger.info(f"Payme webhook: method={method}, order_id={order_id}, rpc_id={rpc_id}")

        if method == "CheckPerformTransaction":
            # Tranzaksiya qabul qilish tekshiruvi
            if not order_id:
                logger.warning(f"Payme webhook: CheckPerformTransaction - order_id yo'q, params: {parsed}")
                return {"id": rpc_id, "error": {"code": -31050, "message": "Order not found"}}

            # Avval ID bilan qidirish
            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.id == order_id)
            )
            txn = txn_result.scalars().first()

            # Topilmasa, external_id bilan qidirish (Payme boshqacha yuborishi mumkin)
            if not txn:
                txn_result = await db.execute(
                    select(PaymentTransaction).where(PaymentTransaction.external_id == order_id)
                )
                txn = txn_result.scalars().first()

            if not txn:
                logger.warning(f"Payme webhook: Transaction topilmadi. order_id={order_id}, parsed={parsed}")
                return {"id": rpc_id, "error": {"code": -31050, "message": "Order not found"}}

            if txn.status in (TransactionStatus.cancelled.value, TransactionStatus.failed.value):
                return {"id": rpc_id, "error": {"code": -31050, "message": "Order is cancelled or failed"}}

            if parsed.get("amount") != txn.amount:
                return {"id": rpc_id, "error": {"code": -31001, "message": "Incorrect amount"}}

            return {"id": rpc_id, "result": {"allow": True}}


        elif method == "CreateTransaction":
            if not order_id:
                return {"id": rpc_id, "error": {"code": -31050, "message": "Order not found"}}

            ext_id = parsed.get("external_id") # Payme system id

            # O'sha payme ID si bilan tranzaksiya bormi qidiramiz
            existing_ext = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.external_id == ext_id)
            )
            existing_txn = existing_ext.scalars().first()

            if existing_txn:
                # Agar oldin yaratilgan bo'lsa
                if existing_txn.id != order_id:
                    # Xuddi o'sha to'lov boshqa order bn kelibdi.
                    return {"id": rpc_id, "error": {"code": -31050, "message": "Transaction belongs to different order"}}

                if existing_txn.status in (TransactionStatus.completed.value, TransactionStatus.processing.value):
                    # 12 soatdan o'tib ketganmi tekshiramiz
                    duration = datetime.now(timezone.utc) - existing_txn.created_at
                    if duration.total_seconds() > 43200: # 12 soat
                        existing_txn.status = TransactionStatus.failed.value
                        existing_txn.error_message = "Timeout (12h) passed"
                        await db.commit()
                        return {"id": rpc_id, "error": {"code": -31008, "message": "Transaction timeout"}}

                    return {"id": rpc_id, "result": {"create_time": int(existing_txn.created_at.timestamp() * 1000), "transaction": existing_txn.external_id, "state": 1}}

                # Agar Cancelled bolsa qila olmaydi
                return {"id": rpc_id, "error": {"code": -31008, "message": "Transaction cancelled or failed"}}


            # Oldin bunday ID li tranzaksiya kelmagan, endi orderni qaraymiz.
            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.id == order_id)
            )
            txn = txn_result.scalars().first()

            if not txn:
                return {"id": rpc_id, "error": {"code": -31050, "message": "Order not found"}}

            if parsed.get("amount") != txn.amount:
                return {"id": rpc_id, "error": {"code": -31001, "message": "Incorrect amount"}}

            # Pending yoki processing holatida bo'lsa, CreateTransaction qabul qilamiz
            if txn.status in (TransactionStatus.pending.value, TransactionStatus.processing.value):
                # Endi Create qilamiz
                txn.external_id = ext_id
                txn.status = TransactionStatus.processing.value
                txn.gateway_response = parsed.get("raw")
                await db.commit()
                return {"id": rpc_id, "result": {"create_time": int(txn.created_at.timestamp() * 1000), "transaction": txn.external_id, "state": 1}}

            return {"id": rpc_id, "error": {"code": -31050, "message": "Order already processed or cancelled"}}


        elif method == "PerformTransaction":
            ext_id = parsed.get("external_id")
            if not ext_id:
                return {"id": rpc_id, "error": {"code": -31003, "message": "Transaction not found"}}

            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.external_id == ext_id)
            )
            txn = txn_result.scalars().first()

            if not txn:
                return {"id": rpc_id, "error": {"code": -31003, "message": "Transaction not found"}}

            if txn.status == TransactionStatus.processing.value:
                # 12 soatdan o'tib ketganmi tekshiramiz
                duration = datetime.now(timezone.utc) - txn.created_at
                if duration.total_seconds() > 43200: # 12 soat
                    txn.status = TransactionStatus.failed.value
                    txn.error_message = "Timeout (12h) passed before complete"
                    await db.commit()
                    return {"id": rpc_id, "error": {"code": -31008, "message": "Transaction timeout"}}

                await _complete_payment(txn, db)
                return {"id": rpc_id, "result": {"transaction": txn.external_id, "perform_time": int(txn.completed_at.timestamp() * 1000), "state": 2}}

            elif txn.status == TransactionStatus.completed.value:
                # Already done - Idempotency
                return {"id": rpc_id, "result": {"transaction": txn.external_id, "perform_time": int(txn.completed_at.timestamp() * 1000) if txn.completed_at else int(datetime.now(timezone.utc).timestamp() * 1000), "state": 2}}

            return {"id": rpc_id, "error": {"code": -31008, "message": "Transaction is cancelled or failed"}}


        elif method == "CancelTransaction":
            ext_id = parsed.get("external_id")
            reason = parsed.get("raw", {}).get("params", {}).get("reason", 0)

            if not ext_id:
                return {"id": rpc_id, "error": {"code": -31003, "message": "Transaction not found"}}

            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.external_id == ext_id)
            )
            txn = txn_result.scalars().first()
            if not txn:
                return {"id": rpc_id, "error": {"code": -31003, "message": "Transaction not found"}}

            if txn.status == TransactionStatus.processing.value:
                # Cancel before complete
                txn.status = TransactionStatus.cancelled.value
                txn.error_message = f"Cancelled by payme. Reason: {reason}"
                txn.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return {"id": rpc_id, "result": {"transaction": txn.external_id, "cancel_time": int(txn.completed_at.timestamp() * 1000), "state": -1}}

            elif txn.status == TransactionStatus.completed.value:
                # Cancel after complete (Refund)
                txn.status = TransactionStatus.refunded.value
                txn.error_message = f"Refunded by payme. Reason: {reason}"
                txn.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return {"id": rpc_id, "result": {"transaction": txn.external_id, "cancel_time": int(txn.completed_at.timestamp() * 1000), "state": -2}}

            elif txn.status in (TransactionStatus.cancelled.value, TransactionStatus.failed.value, TransactionStatus.refunded.value):
                # Already cancelled — idempotency
                state = -2 if txn.status == TransactionStatus.refunded.value else -1
                return {"id": rpc_id, "result": {
                    "transaction": txn.external_id,
                    "cancel_time": int(txn.completed_at.timestamp() * 1000) if txn.completed_at else int(datetime.now(timezone.utc).timestamp() * 1000),
                    "state": state
                }}

            # Agar boshqa holat bo'lsa
            return {"id": rpc_id, "error": {"code": -31007, "message": "Transaction cannot be cancelled in current state"}}

        elif method == "CheckTransaction":
            ext_id = parsed.get("external_id")
            if not ext_id:
                return {"id": rpc_id, "error": {"code": -31003, "message": "Transaction not found"}}

            txn_result = await db.execute(
                select(PaymentTransaction).where(PaymentTransaction.external_id == ext_id)
            )
            txn = txn_result.scalars().first()

            if not txn:
                return {"id": rpc_id, "error": {"code": -31003, "message": "Transaction not found"}}

            reason = 0
            if "Reason: " in (txn.error_message or ""):
                try:
                    reason = int(txn.error_message.split("Reason: ")[1])
                except (ValueError, IndexError):
                    pass

            state_map = {
                TransactionStatus.processing.value: 1,
                TransactionStatus.completed.value: 2,
                TransactionStatus.cancelled.value: -1,
                TransactionStatus.failed.value: -1,
                TransactionStatus.refunded.value: -2,
            }

            state = state_map.get(txn.status, 1)
            create_time = int(txn.created_at.timestamp() * 1000) if hasattr(txn, 'created_at') and txn.created_at else 0

            # Holatlarga qarab vaqtlarni aniqlaymiz
            perform_time = 0
            cancel_time = 0

            if txn.status in (TransactionStatus.completed.value, TransactionStatus.refunded.value):
                if txn.status == TransactionStatus.completed.value:
                    perform_time = int(txn.completed_at.timestamp() * 1000) if txn.completed_at else 0
                else:
                    cancel_time = int(txn.completed_at.timestamp() * 1000) if txn.completed_at else 0
            elif txn.status in (TransactionStatus.cancelled.value, TransactionStatus.failed.value):
                cancel_time = int(txn.completed_at.timestamp() * 1000) if txn.completed_at else 0

            return {
                "id": rpc_id,
                "result": {
                    "create_time": create_time,
                    "perform_time": perform_time,
                    "cancel_time": cancel_time,
                    "transaction": txn.external_id,
                    "state": state,
                    "reason": reason if reason != 0 else None
                }
            }

        elif method == "GetStatement":
            return {"id": rpc_id, "result": {"transactions": []}}

        # Noma'lum method
        return {"id": rpc_id, "error": {"code": -32601, "message": f"Unknown method: {method}"}}

    except Exception as e:
        logger.error(f"Payme webhook error: {e}", exc_info=True)
        return {"error": {"code": -32504, "message": f"Internal error: {str(e)}"}}


@router.post("/webhook/click")
async def webhook_click(request: Request, db: AsyncSession = Depends(get_db)):
    """Click webhook callback"""
    body = await request.body()
    headers = dict(request.headers)

    # Log incoming webhook
    logger.info(f"Click webhook received: headers={dict(headers)}, body_preview={body[:200] if body else ''}")

    result = await db.execute(
        select(PaymentGatewayConfig).where(
            PaymentGatewayConfig.provider == "click",
            PaymentGatewayConfig.is_active == True,
        ).limit(1)
    )
    gw = result.scalars().first()
    if not gw:
        logger.error("Click webhook: Gateway not found")
        return {"error": -1, "error_note": "Gateway not configured"}

    gateway = get_gateway({
        "provider": "click",
        "merchant_id": gw.merchant_id,
        "secret_key": gw.secret_key,
        "service_id": gw.service_id,
        "is_test_mode": gw.is_test_mode,
    })

    auth_result = gateway.verify_webhook(headers, body)
    logger.info(f"Click webhook verify result: {auth_result}")

    if not auth_result:
        logger.warning("Click webhook: Auth failed")
        return {"error": -1, "error_note": "Sign verification failed"}

    parsed = gateway.parse_webhook(headers, body)
    logger.info(f"Click webhook parsed: {parsed}")
    order_id = parsed.get("order_id")

    if not order_id:
        logger.warning("Click webhook: Order not found in parsed data")
        return {"error": -5, "error_note": "Order not found"}

    txn_result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.id == order_id)
    )
    txn = txn_result.scalars().first()
    if not txn:
        logger.warning(f"Click webhook: Transaction not found, order_id={order_id}")
        return {"error": -5, "error_note": "Transaction not found"}

    logger.info(f"Click webhook: Found transaction {txn.id}, status={txn.status}, amount={txn.amount}")

    if parsed.get("method") == "prepare":
        if parsed.get("amount") != txn.amount:
            return {"error": -2, "error_note": "Incorrect amount"}
            
        txn.external_id = parsed.get("external_id")
        txn.status = TransactionStatus.processing.value
        txn.gateway_response = parsed.get("raw")
        await db.commit()
        return {"error": 0, "error_note": "Success", "click_trans_id": parsed.get("external_id"), "merchant_trans_id": order_id, "merchant_prepare_id": txn.id}

    elif parsed.get("method") == "complete":
        if parsed.get("amount") != txn.amount:
            return {"error": -2, "error_note": "Incorrect amount"}
            
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

    # Log incoming webhook
    logger.info(f"Uzum webhook received: headers={dict(headers)}, body_preview={body[:200] if body else ''}")

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
    logger.info(f"Uzum webhook parsed: {parsed}")
    order_id = parsed.get("order_id")

    if not order_id:
        logger.warning("Uzum webhook: Order not found in parsed data")
        return {"status": "error", "message": "Order not found"}

    txn_result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.id == order_id)
    )
    txn = txn_result.scalars().first()
    if not txn:
        logger.warning(f"Uzum webhook: Transaction not found, order_id={order_id}")
        return {"status": "error", "message": "Transaction not found"}

    logger.info(f"Uzum webhook: Found transaction {txn.id}, status={txn.status}, amount={txn.amount}")

    if parsed.get("status") == "completed":
        if parsed.get("amount") != txn.amount:
            txn.status = TransactionStatus.failed.value
            txn.error_message = f"Incorrect amount: expected {txn.amount}, got {parsed.get('amount')}"
            txn.gateway_response = parsed.get("raw")
            await db.commit()
            return {"status": "error", "message": "Incorrect amount"}
            
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
    order_id: Optional[str] = None,  # Order ID (transaction id) bo'yicha qidirish
    external_id: Optional[str] = None,  # Gateway external ID bo'yicha qidirish
    phone: Optional[str] = None,  # Telefon raqam bo'yicha qidirish
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Admin: barcha to'lovlar tarixi. Order ID, external_id, yoki phone bo'yicha qidirish mumkin."""
    stmt = select(PaymentTransaction).order_by(PaymentTransaction.created_at.desc())
    count_stmt = select(func.count(PaymentTransaction.id))

    # Order ID bo'yicha qidirish
    if order_id:
        stmt = stmt.where(PaymentTransaction.id == order_id)
        count_stmt = count_stmt.where(PaymentTransaction.id == order_id)

    # External ID (Paycom/Click dan kelgan ID) bo'yicha qidirish
    if external_id:
        stmt = stmt.where(PaymentTransaction.external_id.ilike(f"%{external_id}%"))
        count_stmt = count_stmt.where(PaymentTransaction.external_id.ilike(f"%{external_id}%"))

    # Telefon raqam bo'yicha qidirish
    if phone:
        phone_clean = phone.replace("+", "").replace(" ", "").replace("-", "")
        user_stmt = select(User.id).where(
            User.phone.ilike(f"%{phone_clean}%") | User.phone.ilike(f"%{phone}%")
        )
        user_result = await db.execute(user_stmt)
        user_ids = [row.id for row in user_result.all()]
        if user_ids:
            stmt = stmt.where(PaymentTransaction.user_id.in_(user_ids))
            count_stmt = count_stmt.where(PaymentTransaction.user_id.in_(user_ids))
        else:
            # Foydalanuvchi topilmasa, bo'sh natija qaytarish
            return {"total": 0, "transactions": []}

    if status:
        stmt = stmt.where(PaymentTransaction.status == status)
        count_stmt = count_stmt.where(PaymentTransaction.status == status)
    if provider:
        stmt = stmt.where(PaymentTransaction.provider == provider)
        count_stmt = count_stmt.where(PaymentTransaction.provider == provider)

    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    transactions = result.scalars().all()

    # User info — barcha user ID larini bir zaprosda olamiz (N+1 dan qochish)
    user_ids = list({txn.user_id for txn in transactions})
    users_result = await db.execute(
        select(User.id, User.first_name, User.last_name, User.phone).where(User.id.in_(user_ids))
    )
    users_map = {row.id: row for row in users_result.all()}

    items = []
    for txn in transactions:
        d = txn.to_dict()
        u = users_map.get(txn.user_id)
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

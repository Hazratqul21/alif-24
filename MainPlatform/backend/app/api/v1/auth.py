"""
Auth Router - MainPlatform
Authentication endpoints using shared modules
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
from datetime import datetime, timezone, date
import logging

from shared.database import get_db
from shared.database.models import User, UserGeoLog, StudentProfile, Gender
from shared.auth import create_access_token, create_refresh_token
from ...core.config import settings
from ...middleware.auth import get_current_user, get_optional_current_user
from ...services.auth_service import AuthService
from ...schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from ...schemas.rbac import ChildLoginRequest
from ...utils.geoip import get_geo_from_ip, get_client_ip, parse_device_type, parse_browser, parse_os

logger = logging.getLogger(__name__)

router = APIRouter()

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., alias="currentPassword")
    new_password: str = Field(..., alias="newPassword")
    
    class Config:
        populate_by_name = True

class UpdateProfileRequest(BaseModel):
    """Schema for profile updates via PUT /auth/me.

    All fields are optional — caller sends only what they want to change.
    Verified flags (email_verified, phone_verified) are reset to False
    whenever the corresponding contact value is mutated (handled in service).
    Student-only fields (grade, school_name) are ignored for non-students.
    """
    first_name: Optional[str] = Field(None, alias="firstName", max_length=100)
    last_name: Optional[str] = Field(None, alias="lastName", max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    date_of_birth: Optional[date] = Field(None, alias="dateOfBirth")
    gender: Optional[str] = None                               # "male" | "female" | "other"
    avatar: Optional[str] = Field(None, max_length=500)
    language: Optional[str] = Field(None, max_length=5)        # "uz" | "ru" | "en"
    timezone: Optional[str] = Field(None, max_length=50)
    marketing_emails_enabled: Optional[bool] = Field(None, alias="marketingEmailsEnabled")
    # Student-profile fields (applied only if user.role == student)
    grade: Optional[str] = Field(None, max_length=20)
    school_name: Optional[str] = Field(None, alias="schoolName", max_length=200)

    class Config:
        populate_by_name = True

    @field_validator("date_of_birth")
    @classmethod
    def _dob_sane(cls, v: Optional[date]) -> Optional[date]:
        if v is None:
            return v
        today = date.today()
        if v > today:
            raise ValueError("Tug'ilgan sana kelajakda bo'lishi mumkin emas")
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 3 or age > 120:
            raise ValueError("Yosh haqiqiy emas (3-120 orasida bo'lishi kerak)")
        return v

    @field_validator("gender")
    @classmethod
    def _gender_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"male", "female"}
        if v.lower() not in allowed:
            raise ValueError(f"gender must be one of {sorted(allowed)}")
        return v.lower()

    @field_validator("phone")
    @classmethod
    def _phone_normalise(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        s = "".join(ch for ch in v if ch.isdigit() or ch == "+")
        if s and not s.startswith("+"):
            s = "+" + s
        # Accept +998XXXXXXXXX shape or anything with at least 9 digits.
        digits = sum(1 for ch in s if ch.isdigit())
        if digits < 9 or digits > 15:
            raise ValueError("Telefon raqami noto'g'ri ko'rinishda")
        return s

@router.post("/register")
async def register(
    request: Request,
    data: RegisterRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Register new user"""
    data.validate()
    service = AuthService(db)
    result = await service.register(data)

    user_data = result.get("user", {}) or {}

    # Set HttpOnly Cookies
    domain = ".alif24.uz" if request and request.url.hostname and "alif24.uz" in request.url.hostname else None
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        domain=domain,
        max_age=8 * 60 * 60  # 8 hours
    )
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        domain=domain,
        max_age=30 * 24 * 60 * 60  # 30 days
    )

    # Non-blocking welcome email. Runs after the HTTP response is sent so the
    # user never sees extra latency and a SMTP outage can't break signup.
    email_addr = user_data.get("email")
    if email_addr:
        background_tasks.add_task(
            _send_welcome_email_bg,
            user_id=user_data.get("id"),
            email=email_addr,
            first_name=user_data.get("first_name") or "",
        )

    return {
        "success": True,
        "message": "Registration successful",
        "data": {"user": result["user"]}
    }


async def _send_welcome_email_bg(user_id: str, email: str, first_name: str) -> None:
    """Send the welcome email in a fresh DB session after register() returns."""
    try:
        from shared.database import AsyncSessionLocal as async_session_factory
        from ...services.email_service import send_welcome_email
        async with async_session_factory() as session:
            await send_welcome_email(
                to=email,
                first_name=first_name,
                db=session,
                user_id=user_id,
                provider="password",
            )
    except Exception as e:
        logger.warning(f"Welcome email failed for {email}: {e}")

@router.post("/login")
async def login(request: Request, data: LoginRequest, response: Response, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Login user"""
    service = AuthService(db)
    result = await service.login(data.email, data.password)
    
    # Background: Geolokatsiya yozish
    user_data = result.get("user", {})
    user_id = user_data.get("id")
    if user_id:
        background_tasks.add_task(
            _track_geo, user_id, request
        )
    
    # Set HttpOnly Cookies
    domain = ".alif24.uz" if request and request.url.hostname and "alif24.uz" in request.url.hostname else None
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        domain=domain,
        max_age=8 * 60 * 60  # 8 hours
    )
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        domain=domain,
        max_age=30 * 24 * 60 * 60  # 30 days
    )
    
    return {
        "success": True,
        "message": "Login successful",
        "data": {"user": result["user"]}
    }


async def _track_geo(user_id: str, request: Request):
    """Background task: IP dan geo aniqlash va saqlash"""
    try:
        from shared.database import AsyncSessionLocal as async_session_factory
        ip = get_client_ip(request)
        ua = request.headers.get("user-agent", "")
        geo = await get_geo_from_ip(ip)
        
        async with async_session_factory() as session:
            geo_log = UserGeoLog(
                user_id=user_id,
                ip_address=ip,
                country=geo.get("country"),
                country_code=geo.get("country_code"),
                region=geo.get("region"),
                city=geo.get("city"),
                latitude=geo.get("latitude"),
                longitude=geo.get("longitude"),
                isp=geo.get("isp"),
                user_agent=ua[:500] if ua else None,
                device_type=parse_device_type(ua),
                browser=parse_browser(ua),
                os=parse_os(ua),
                action="login",
            )
            session.add(geo_log)
            await session.commit()
    except Exception as e:
        logger.warning(f"Geo tracking failed for user {user_id}: {e}")


@router.post("/refresh")
async def refresh_token(request: Request, response: Response, data: RefreshTokenRequest = None, db: AsyncSession = Depends(get_db)):
    """Refresh access token - reads from cookie or request body"""
    # Try body first, then cookie
    token = None
    if data and data.refresh_token:
        token = data.refresh_token
    if not token:
        token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token not provided")
    
    service = AuthService(db)
    result = await service.refresh_token(token)
    
    # Update Cookies
    domain = ".alif24.uz" if request and request.url.hostname and "alif24.uz" in request.url.hostname else None
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        domain=domain,
        max_age=8 * 60 * 60  # 8 hours
    )
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        domain=domain,
        max_age=30 * 24 * 60 * 60  # 30 days
    )
    
    return {
        "success": True,
        "message": "Token refreshed"
    }

@router.get("/me")
async def get_me(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user profile.
    Used by AuthSync across all subdomains to verify active session.

    If the user is not authenticated, return `null` (200) so clients can treat it as a guest session.
    """
    if not current_user:
        return None

    # Middlewaredan tayyor subscription infosini olamiz
    # Uning ishi "virtual free" plan bo'lsa ham hal qilgan bo'ladi
    from shared.subscription import get_sub_info
    sub_info = get_sub_info(request)

    # Convert to dict for response
    subscription_data = {
        "status": "active" if sub_info.has_subscription else "none",
        "plan_slug": sub_info.plan_slug or ("free" if not sub_info.has_subscription else "unknown"),
        "plan_name": sub_info.plan_name or ("Bepul (Faqat ertaklar)" if not sub_info.has_subscription else "Noma'lum"),
        "features": sub_info.features or {
            # Default free features
            "ertaklar": True,
            "darslar": False,
            "oyinlar": False,
            "olimpiada": False,
            "ai_test": False,
            "kutubxona": False,
            "live_quiz": False,
        },
        "expires_at": sub_info.expires_at,
        "is_free": sub_info.is_free,
        "is_premium": sub_info.is_premium
    }

    # Boshqa ma'lumotlarni yig'ish (Coin, Organization va hk)
    from shared.database.models import StudentProfile, OrganizationProfile
    from sqlalchemy import select
    
    student_record = None
    try:
        sp_res = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        )
        sp = sp_res.scalars().first()
        if sp:
            student_record = {
                "id": sp.id,
                "grade": sp.grade,
                "school_name": sp.school_name,
                "avatar_id": sp.avatar_id,
                "total_coins": sp.total_coins,
            }
    except Exception as e:
        logger.warning(f"Student profile query failed for user {current_user.id}: {e}")

    user_data = current_user.to_dict()
    if subscription_data:
        user_data["subscription"] = subscription_data

    return user_data

class PromoCodeActivateRequest(BaseModel):
    code: str

@router.post("/promo-code")
async def activate_promo_code(
    data: PromoCodeActivateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Foydalanuvchi promocode kiritadi — obuna/chegirma oladi"""
    from sqlalchemy import select, func
    from shared.database.models import (
        PromoCode, PromoCodeUsage, UserSubscription,
        SubscriptionPlanConfig, SubscriptionStatus,
    )
    from datetime import timedelta

    code = data.code.strip().upper()

    # 1. Promocode topish
    result = await db.execute(select(PromoCode).where(PromoCode.code == code))
    promo = result.scalars().first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promocode topilmadi")

    # 2. Faollik tekshirish
    if not promo.is_active:
        raise HTTPException(status_code=400, detail="Bu promocode faol emas")

    now = datetime.now(timezone.utc)
    if promo.starts_at and now < promo.starts_at:
        raise HTTPException(status_code=400, detail="Bu promocode hali boshlanmagan")
    if promo.expires_at and now > promo.expires_at:
        raise HTTPException(status_code=400, detail="Bu promocode muddati tugagan")

    # 3. Max uses tekshirish
    if promo.max_uses > 0 and promo.current_uses >= promo.max_uses:
        raise HTTPException(status_code=400, detail="Bu promocode limiti tugagan")

    # 4. Per-user limit tekshirish
    user_usage_count = await db.scalar(
        select(func.count(PromoCodeUsage.id)).where(
            PromoCodeUsage.promo_code_id == promo.id,
            PromoCodeUsage.user_id == current_user.id,
        )
    ) or 0
    if user_usage_count >= promo.max_uses_per_user:
        raise HTTPException(status_code=400, detail="Siz bu promocodeni allaqachon ishlatgansiz")

    # 5. Turga qarab amal qilish
    result_value = ""

    if promo.promo_type == "free_days" and promo.free_days_count > 0:
        # Bepul kunlar — obunasiz 'free trial' subscription yaratish
        # Default plan topish yoki birinchi faol plan
        plan_res = await db.execute(
            select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.is_active == True)
            .order_by(SubscriptionPlanConfig.sort_order)
        )
        plan = plan_res.scalars().first()

        if plan:
            # Eski faol obunani expire qilish
            old_subs = await db.execute(
                select(UserSubscription).where(
                    UserSubscription.user_id == current_user.id,
                    UserSubscription.status == SubscriptionStatus.active.value,
                )
            )
            for old in old_subs.scalars().all():
                old.status = SubscriptionStatus.expired.value

            sub = UserSubscription(
                user_id=current_user.id,
                plan_config_id=plan.id,
                status=SubscriptionStatus.active.value,
                started_at=now,
                expires_at=now + timedelta(days=promo.free_days_count),
                amount_paid=0,
                created_by=f"promo:{promo.code}",
                notes=f"Promocode: {promo.code} ({promo.free_days_count} kun bepul)",
            )
            db.add(sub)
            result_value = f"{promo.free_days_count} kun bepul '{plan.name}'"
        else:
            result_value = f"{promo.free_days_count} kun bepul (plan topilmadi)"

    elif promo.promo_type == "plan" and promo.plan_config_id:
        # Maxsus plan berish
        plan_res = await db.execute(
            select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.id == promo.plan_config_id)
        )
        plan = plan_res.scalars().first()
        if plan:
            old_subs = await db.execute(
                select(UserSubscription).where(
                    UserSubscription.user_id == current_user.id,
                    UserSubscription.status == SubscriptionStatus.active.value,
                )
            )
            for old in old_subs.scalars().all():
                old.status = SubscriptionStatus.expired.value

            sub = UserSubscription(
                user_id=current_user.id,
                plan_config_id=plan.id,
                status=SubscriptionStatus.active.value,
                started_at=now,
                expires_at=now + timedelta(days=plan.duration_days),
                amount_paid=0,
                created_by=f"promo:{promo.code}",
                notes=f"Promocode: {promo.code}",
            )
            db.add(sub)
            result_value = f"'{plan.name}' plan {plan.duration_days} kunga"
        else:
            raise HTTPException(status_code=400, detail="Promocode plani topilmadi")

    elif promo.promo_type == "discount" and promo.discount_percent > 0:
        result_value = f"{promo.discount_percent}% chegirma"

    else:
        raise HTTPException(status_code=400, detail="Promocode noto'g'ri sozlangan")

    # 6. Usage yozish
    usage = PromoCodeUsage(
        promo_code_id=promo.id,
        user_id=current_user.id,
        result_type=promo.promo_type,
        result_value=result_value,
    )
    db.add(usage)
    promo.current_uses += 1

    await db.commit()

    return {
        "success": True,
        "message": f"Promocode muvaffaqiyatli ishlatildi!",
        "result": result_value,
        "promo_type": promo.promo_type,
    }

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout user"""
    service = AuthService(db)
    await service.logout(current_user.id)
    
    # Delete Cookies
    domain = ".alif24.uz" if request and request.url.hostname and "alif24.uz" in request.url.hostname else None
    response.delete_cookie(key="access_token", domain=domain, path="/")
    response.delete_cookie(key="refresh_token", domain=domain, path="/")
    
    return {
        "success": True,
        "message": "Logged out successfully"
    }

@router.put("/password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change password"""
    service = AuthService(db)
    await service.change_password(
        current_user.id,
        data.current_password,
        data.new_password
    )
    return {
        "success": True,
        "message": "Password changed successfully"
    }

@router.post("/child-login")
async def child_login(
    request: Request,
    data: ChildLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Login for child accounts using username + PIN"""
    from ...repositories.user_repository import UserRepository
    from ...core.errors import UnauthorizedError
    from sqlalchemy import select
    
    user_repo = UserRepository(db)
    parent = await user_repo.get_by_phone(data.parent_phone)
    if not parent:
        raise UnauthorizedError("Parent account not found")
        
    # Get children
    children = await user_repo.get_children(parent.id)
    child = next((c for c in children if c.username == data.username and getattr(c, 'pin_code', None) == data.pin_code), None)
    
    if not child:
        raise UnauthorizedError("Invalid username or PIN")
    
    # Update last login
    child.last_login_at = datetime.now(timezone.utc)
    
    # Generate tokens
    access_token = create_access_token(
        data={
            "sub": child.id,
            "email": child.username,
            "role": child.role.value
        }
    )
    refresh_token = create_refresh_token(data={"sub": child.id})
    
    # Save refresh token
    child.refresh_token = refresh_token
    await db.commit()
    
    # Set Cookies
    domain = ".alif24.uz" if request and request.url.hostname and "alif24.uz" in request.url.hostname else None
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        domain=domain,
        max_age=8 * 60 * 60  # 8 hours
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        domain=domain,
        max_age=30 * 24 * 60 * 60  # 30 days
    )
    
    return {
        "success": True,
        "data": {
            "token_type": "bearer",
            "user": child.to_dict(),
            "parent_id": child.parent_id
        }
    }

@router.post("/avatar")
async def upload_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload user avatar (placeholder)"""
    return {
        "success": True,
        "message": "Avatar upload endpoint ready. Connect storage service for file handling.",
        "data": {"avatar": current_user.avatar}
    }

@router.put("/me")
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile (PUT — kept for backward compat; PATCH below)."""
    service = AuthService(db)
    updates = data.model_dump(exclude_none=True, by_alias=False)
    profile = await service.update_profile(current_user.id, updates)
    return {
        "success": True,
        "message": "Profile updated successfully",
        "data": profile
    }


@router.patch("/me")
async def patch_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Same as PUT /me but idiomatic — clients should use PATCH for partial updates."""
    service = AuthService(db)
    updates = data.model_dump(exclude_none=True, by_alias=False)
    profile = await service.update_profile(current_user.id, updates)
    return {
        "success": True,
        "message": "Profile updated successfully",
        "data": profile,
    }


# ---------------------------------------------------------------------------
# Profile completeness — powers the "fill your profile" modal that the frontend
# shows when blocked actions (olympiad register, premium content) require
# mandatory fields.
# ---------------------------------------------------------------------------

# Field → (weight, label). Weights sum to 100.
_COMPLETENESS_WEIGHTS = [
    ("first_name",    10, "Ism"),
    ("last_name",     10, "Familiya"),
    ("date_of_birth", 20, "Tug'ilgan sana"),          # required for olympiad
    ("email",         15, "Email"),
    ("email_verified", 5, "Email tasdiqlangan"),
    ("phone",         10, "Telefon"),
    ("phone_verified", 5, "Telefon tasdiqlangan"),
    ("gender",         5, "Jins"),
    ("avatar",         5, "Avatar"),
    # Student-only fields weighted into the remaining 15 points.
    ("grade",          8, "Sinf"),
    ("school_name",    7, "Maktab"),
]


@router.get("/me/completeness")
async def profile_completeness(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return {percent, missing[], required_missing[]} for profile completion UI.

    `required_missing` is the strict set that blocks core flows (currently
    only `date_of_birth` — olympiad registration needs it). `missing` is the
    full nice-to-have set.
    """
    from shared.database.models import UserRole

    sp = None
    if current_user.role == UserRole.student:
        sp_res = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        )
        sp = sp_res.scalars().first()

    # Sentinel values — different for bool vs non-bool fields.
    def _val(field: str):
        if field in {"grade", "school_name"}:
            return getattr(sp, field, None) if sp else None
        return getattr(current_user, field, None)

    total_weight = 0
    earned_weight = 0
    missing: list[dict] = []
    for field, weight, label in _COMPLETENESS_WEIGHTS:
        # Skip student-only fields for non-students so the % isn't unfairly low.
        if field in {"grade", "school_name"} and current_user.role != UserRole.student:
            continue
        total_weight += weight
        value = _val(field)
        filled = bool(value) if not isinstance(value, bool) else value
        if filled:
            earned_weight += weight
        else:
            missing.append({"field": field, "label": label, "weight": weight})

    percent = int(round((earned_weight / total_weight) * 100)) if total_weight else 0

    # Fields that block core actions — kept minimal so we don't annoy users.
    REQUIRED_FOR_CORE = {"first_name", "last_name", "date_of_birth"}
    required_missing = [m for m in missing if m["field"] in REQUIRED_FOR_CORE]

    return {
        "success": True,
        "data": {
            "percent": percent,
            "missing": missing,
            "required_missing": required_missing,
            "is_complete_for_olympiad": len(required_missing) == 0,
        },
    }


# ============================================================
# PARENT → BOLA BOSHQARISH (Search + Invite tizimi)
# Ota-ona bolani ID / email / telefon orqali qidiradi,
# taklif yuboradi, bola qabul qiladi — xuddi sinfga qo'shilish kabi.
# ============================================================

from shared.database.models.in_app_notification import InAppNotification, InAppNotifType

class ChildSearchRequest(BaseModel):
    query: str  # ID, email yoki telefon raqam

class ChildInviteRequest(BaseModel):
    student_id: str  # Topilgan o'quvchining user ID si


@router.post("/children/search")
async def search_child(
    data: ChildSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bolani ID, email yoki telefon raqami orqali qidirish"""
    from shared.database.models import UserRole
    from sqlalchemy import select, or_

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    q = data.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Qidiruv so'zini kiriting")

    result = await db.execute(
        select(User).where(
            User.role == UserRole.student,
            or_(
                User.id == q,
                User.email == q,
                User.phone == q,
                User.username == q,
            )
        )
    )
    student = result.scalars().first()

    if not student:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi. ID, email yoki telefon raqamini tekshiring.")

    if student.parent_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bu farzand allaqachon sizga biriktirilgan")

    if student.parent_id:
        raise HTTPException(status_code=400, detail="Bu o'quvchining ota-onasi allaqachon mavjud")

    return {
        "success": True,
        "data": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "avatar": student.avatar,
            "username": student.username,
        }
    }


@router.post("/children/invite")
async def invite_child(
    data: ChildInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """O'quvchiga ota-ona sifatida taklif yuborish"""
    from shared.database.models import UserRole
    from sqlalchemy import select, and_

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    # O'quvchini tekshirish
    result = await db.execute(
        select(User).where(User.id == data.student_id, User.role == UserRole.student)
    )
    student = result.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")

    if student.parent_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bu farzand allaqachon sizga biriktirilgan")

    if student.parent_id:
        raise HTTPException(status_code=400, detail="Bu o'quvchining ota-onasi allaqachon mavjud")

    # Avvalgi kutilayotgan taklif bormi tekshirish
    existing = await db.execute(
        select(InAppNotification).where(
            InAppNotification.user_id == student.id,
            InAppNotification.sender_id == current_user.id,
            InAppNotification.notif_type == InAppNotifType.parent_invite,
            InAppNotification.is_read == False,
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Taklif allaqachon yuborilgan. Farzandingiz javob berishini kuting.")

    # Notification yaratish — bolaga habar boradi
    notif = InAppNotification(
        user_id=student.id,
        sender_id=current_user.id,
        title="Ota-ona taklifi",
        message=f"{current_user.first_name} {current_user.last_name} sizni farzandi sifatida qo'shmoqchi. Qabul qilasizmi?",
        notif_type=InAppNotifType.parent_invite,
        reference_type="parent_invite",
        reference_id=current_user.id,
    )
    db.add(notif)
    await db.commit()

    return {
        "success": True,
        "message": f"Taklif {student.first_name} ga yuborildi. U saytdan qabul qilishi kerak.",
    }


@router.get("/children/pending")
async def list_pending_invites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ota-onaning kutilayotgan taklif ro'yxati"""
    from shared.database.models import UserRole
    from sqlalchemy import select

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    result = await db.execute(
        select(InAppNotification).where(
            InAppNotification.sender_id == current_user.id,
            InAppNotification.notif_type == InAppNotifType.parent_invite,
            InAppNotification.is_read == False,
        )
    )
    invites = result.scalars().all()

    pending = []
    for inv in invites:
        stu = await db.execute(select(User).where(User.id == inv.user_id))
        stu = stu.scalars().first()
        if stu:
            pending.append({
                "invite_id": inv.id,
                "student_id": stu.id,
                "first_name": stu.first_name,
                "last_name": stu.last_name,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            })

    return {"success": True, "data": pending}


@router.get("/children")
async def list_children(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ota-onaning biriktirilgan bolalari ro'yxati"""
    from sqlalchemy import select
    from shared.database.models import UserRole

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun ruxsat etilgan")
        
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User).options(selectinload(User.student_profile)).where(User.parent_id == current_user.id)
    )
    children = result.scalars().all()
    
    data = []
    for child in children:
        c_dict = child.to_dict()
        if child.student_profile:
            c_dict["stats"] = {
                "level": child.student_profile.level,
                "total_points": child.student_profile.total_points,
                "total_coins": child.student_profile.total_coins,
                "current_streak": child.student_profile.current_streak,
            }
        data.append(c_dict)

    return {
        "success": True,
        "data": data
    }

@router.get("/children/{child_id}")
async def get_child_details(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun ruxsat etilgan")
        
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User).options(selectinload(User.student_profile)).where(User.id == child_id, User.parent_id == current_user.id)
    )
    child = result.scalars().first()
    if not child:
        raise HTTPException(status_code=404, detail="Bola topilmadi")
        
    c_dict = child.to_dict()
    if child.student_profile:
        c_dict["stats"] = {
            "level": child.student_profile.level,
            "total_points": child.student_profile.total_points,
            "total_coins": child.student_profile.total_coins,
            "current_streak": child.student_profile.current_streak,
            "total_lessons": child.student_profile.total_lessons_completed,
            "average_score": child.student_profile.average_score
        }
    return {"success": True, "data": c_dict}


@router.post("/children/{child_id}/regenerate-pin")
async def regenerate_child_pin(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bola uchun yangi PIN yaratish"""
    from shared.database.models import UserRole

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun ruxsat etilgan")

    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(User).where(User.id == child_id, User.parent_id == current_user.id)
    )
    child = result.scalars().first()
    if not child:
        raise HTTPException(status_code=404, detail="Bola topilmadi")

    new_pin = User.generate_pin(4)
    child.set_pin(new_pin)
    await db.commit()

    return {
        "success": True,
        "data": {
            "username": child.username,
            "new_pin": new_pin,
        },
        "message": "PIN muvaffaqiyatli yangilandi"
    }


# ============================================================
# O'QUVCHI: Ota-ona taklifini qabul / rad etish
# ============================================================

@router.post("/parent-invites/{notif_id}/accept")
async def accept_parent_invite(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """O'quvchi ota-ona taklifini qabul qiladi"""
    from sqlalchemy import select

    notif = await db.execute(
        select(InAppNotification).where(
            InAppNotification.id == notif_id,
            InAppNotification.user_id == current_user.id,
            InAppNotification.notif_type == InAppNotifType.parent_invite,
        )
    )
    notif = notif.scalars().first()
    if not notif:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")

    if notif.is_read:
        raise HTTPException(status_code=400, detail="Bu taklifga allaqachon javob berilgan")

    if current_user.parent_id:
        raise HTTPException(status_code=400, detail="Sizning ota-onangiz allaqachon mavjud")

    parent_id = notif.sender_id

    # Parent mavjudligini tekshirish
    parent = await db.execute(select(User).where(User.id == parent_id))
    parent = parent.scalars().first()
    if not parent:
        raise HTTPException(status_code=404, detail="Ota-ona topilmadi")

    # Bolani ota-onaga biriktirish
    current_user.parent_id = parent_id

    # StudentProfile.parent_user_id ham yangilash
    from shared.database.models import StudentProfile
    sp_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    sp = sp_res.scalars().first()
    if sp:
        sp.parent_user_id = parent_id

    # Taklifni yopish
    notif.is_read = True
    from datetime import datetime, timezone
    notif.read_at = datetime.now(timezone.utc)

    # Ota-onaga habar yuborish
    confirm_notif = InAppNotification(
        user_id=parent_id,
        sender_id=current_user.id,
        title="Farzand qo'shildi!",
        message=f"{current_user.first_name} {current_user.last_name} sizning taklifingizni qabul qildi.",
        notif_type=InAppNotifType.system,
        reference_type="parent_accept",
        reference_id=current_user.id,
    )
    db.add(confirm_notif)
    await db.commit()

    return {
        "success": True,
        "message": f"Siz {parent.first_name} {parent.last_name} ga farzand sifatida birikdingiz."
    }


@router.post("/parent-invites/{notif_id}/decline")
async def decline_parent_invite(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """O'quvchi ota-ona taklifini rad etadi"""
    from sqlalchemy import select

    notif = await db.execute(
        select(InAppNotification).where(
            InAppNotification.id == notif_id,
            InAppNotification.user_id == current_user.id,
            InAppNotification.notif_type == InAppNotifType.parent_invite,
        )
    )
    notif = notif.scalars().first()
    if not notif:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")

    if notif.is_read:
        raise HTTPException(status_code=400, detail="Bu taklifga allaqachon javob berilgan")

    # Taklifni yopish
    notif.is_read = True
    from datetime import datetime, timezone
    notif.read_at = datetime.now(timezone.utc)

    # Ota-onaga habar
    parent_id = notif.sender_id
    decline_notif = InAppNotification(
        user_id=parent_id,
        sender_id=current_user.id,
        title="Taklif rad etildi",
        message=f"{current_user.first_name} {current_user.last_name} taklifingizni rad etdi.",
        notif_type=InAppNotifType.system,
        reference_type="parent_decline",
        reference_id=current_user.id,
    )
    db.add(decline_notif)
    await db.commit()

    return {
        "success": True,
        "message": "Taklif rad etildi."
    }

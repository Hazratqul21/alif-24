"""
Auth Router - MainPlatform
Authentication endpoints using shared modules
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks, UploadFile, File
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
from ...schemas.auth import LoginRequest, RegisterRequest, TokenResponse, CreateStudentRequest
import secrets
import string
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
    if student_record:
        user_data["student_profile"] = student_record
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

_AVATAR_ALLOWED_MIME = {
    "image/jpeg": "jpg",
    "image/jpg":  "jpg",
    "image/png":  "png",
    "image/webp": "webp",
    "image/gif":  "gif",
}


# ---------------------------------------------------------------------------
# Avatar flow (Supabase Storage direct-upload)
# ---------------------------------------------------------------------------
# We intentionally do NOT proxy avatar bytes through the backend. Instead:
#
#   1. Browser fetches GET /auth/storage-config to learn the Supabase URL
#      and the anon key (both are safe to ship — anon key is designed to
#      be public; writes are bounded by Storage bucket policies).
#   2. Browser uploads the file directly to Supabase Storage using the anon
#      key. Bucket-level MIME whitelist + size cap enforce validation.
#      Path: avatars/u/<user_id>/<random>.<ext> — random UUID prevents one
#      user overwriting another's avatar.
#   3. Browser calls POST /auth/avatar with the resulting public URL so we
#      can persist it on users.avatar.
#
# Advantages vs the old server-proxied flow:
#   * No 5 MB file body traversing our API / nginx → faster, cheaper.
#   * No Supabase service_role key stored on our servers.
#   * The backend only sees a URL + the DB write; it never handles bytes.
# ---------------------------------------------------------------------------

class SetAvatarRequest(BaseModel):
    """URL must be a supabase.co Storage public URL under the configured bucket."""
    url: str = Field(..., min_length=10, max_length=1000)


def _storage_base_url() -> str:
    """Base URL for the avatars bucket (raises if unconfigured)."""
    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=503,
            detail="Avatar saqlash xizmati sozlanmagan (SUPABASE_URL yo'q).",
        )
    bucket = settings.SUPABASE_AVATAR_BUCKET
    return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/"


@router.get("/storage-config")
async def get_storage_config(current_user: User = Depends(get_current_user)):
    """Return Supabase URL + anon key + bucket for direct browser uploads.

    Only authenticated users can read this — not because the values are secret
    (they're not; anon key is designed to be public) but to avoid leaking our
    infra detail to casual scrapers and to make auditing easier.
    """
    if not (settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY):
        raise HTTPException(
            status_code=503,
            detail="Avatar yuklash xizmati sozlanmagan. Admin .env da SUPABASE_URL va SUPABASE_ANON_KEY ni qo'shsin."
        )
    return {
        "success": True,
        "data": {
            "url":       settings.SUPABASE_URL,
            "anon_key":  settings.SUPABASE_ANON_KEY,
            "bucket":    settings.SUPABASE_AVATAR_BUCKET,
            "max_bytes": settings.SUPABASE_AVATAR_MAX_BYTES,
            "allowed_mime_types": sorted({k for k in _AVATAR_ALLOWED_MIME if k != "image/jpg"}),
        },
    }


@router.post("/avatar")
async def set_avatar_url(
    data: SetAvatarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Persist the avatar URL that the browser just uploaded to Supabase Storage.

    We validate that the URL points at *our* Supabase bucket — a user who
    tries to set their avatar to an arbitrary external URL is rejected with
    422 so we don't turn users.avatar into an open image-redirect field.
    """
    expected_prefix = _storage_base_url()
    if not data.url.startswith(expected_prefix):
        raise HTTPException(
            status_code=422,
            detail="URL bizning Supabase bucket'imizdan bo'lishi kerak.",
        )

    # Cache-bust so the browser reloads the image immediately after upload.
    cache_busted = data.url
    if "?" not in data.url:
        cache_busted = f"{data.url}?v={int(datetime.now(timezone.utc).timestamp())}"

    user_row = await db.get(User, current_user.id)
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    user_row.avatar = cache_busted
    await db.commit()
    await db.refresh(user_row)
    return {"success": True, "message": "Avatar yangilandi.", "data": user_row.to_dict()}


@router.delete("/avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear the current avatar from users.avatar.

    We intentionally do NOT delete the underlying Supabase object from the
    backend — that would require service_role. A nightly cleanup job can sweep
    orphaned files if ever needed. The public URL becomes unreachable from the
    UI the moment users.avatar is cleared.
    """
    user_row = await db.get(User, current_user.id)
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    user_row.avatar = None
    await db.commit()
    await db.refresh(user_row)
    return {"success": True, "message": "Avatar o'chirildi.", "data": user_row.to_dict()}

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
# EMAIL VERIFICATION — 6-digit code sent to user's email
# ============================================================
#
# Flow:
#   1. User clicks "Verify email" in settings → POST /auth/email/send-code
#      body is optional: if they also want to change the email, pass
#      {"email": "new@example.com"} and we send the code to that address.
#   2. User gets a 6-digit code, enters it → POST /auth/email/verify-code
#      body: {"code": "123456"}. On success:
#        - purpose=verify_existing  → flips email_verified=True
#        - purpose=change_email     → replaces user.email with the new address
#                                     and sets email_verified=True
#
# Security guards:
#   - Only the authenticated user can request / consume codes for themselves.
#   - At most 5 codes / hour per user (rate-limited via recent rows).
#   - At most 5 wrong attempts per code, then it's invalidated.
#   - Codes expire in 15 minutes; a fresh code supersedes older unconsumed ones.
#   - Codes are stored hashed (sha256), never plaintext.
#   - When email is changed and collides with an existing user → 409 Conflict.

from datetime import datetime, timedelta, timezone as _tz
from sqlalchemy import update
from shared.database.models import (
    EmailVerificationCode,
    EmailVerificationPurpose,
)


class SendEmailCodeRequest(BaseModel):
    """Optionally pass a new email to switch to; else we verify the existing one."""
    email: Optional[EmailStr] = None


class VerifyEmailCodeRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def _numeric(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Kod faqat raqamlardan iborat bo'lishi kerak")
        return v


_EMAIL_CODE_EXPIRY_MIN       = 15
_EMAIL_CODE_RATE_WINDOW_MIN  = 60
_EMAIL_CODE_RATE_MAX_PER_H   = 5
_EMAIL_CODE_MAX_ATTEMPTS     = 5


@router.post("/email/send-code")
async def send_email_verification_code(
    data: SendEmailCodeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a 6-digit code and email it to the user.

    If `email` is passed **and differs from the current user's email**, the code
    is sent to the new address and verifying it will switch the account's email.
    Otherwise we re-verify the existing address.
    """
    target_email = (data.email or current_user.email or "").strip().lower()
    if not target_email:
        raise HTTPException(
            status_code=400,
            detail="Email manzilingiz kiritilmagan. Avval profil tahrirlashdan kiriting."
        )

    if data.email and data.email.lower() != (current_user.email or "").lower():
        purpose = EmailVerificationPurpose.change_email
        # Make sure the new email isn't already taken by someone else.
        existing = await db.execute(
            select(User).where(User.email == target_email, User.id != current_user.id)
        )
        if existing.scalars().first():
            raise HTTPException(status_code=409, detail="Bu email boshqa akkauntga bog'langan.")
    else:
        purpose = EmailVerificationPurpose.verify_existing
        # Already verified? Let the caller know gently; don't re-send.
        if current_user.email_verified and (
            (current_user.email or "").lower() == target_email
        ):
            return {
                "success": True,
                "already_verified": True,
                "message": "Email allaqachon tasdiqlangan.",
            }

    # ---- Rate limit: max N codes per hour for this user.
    since = datetime.now(_tz.utc) - timedelta(minutes=_EMAIL_CODE_RATE_WINDOW_MIN)
    recent_res = await db.execute(
        select(EmailVerificationCode)
        .where(
            EmailVerificationCode.user_id == current_user.id,
            EmailVerificationCode.created_at >= since,
        )
    )
    recent_count = len(recent_res.scalars().all())
    if recent_count >= _EMAIL_CODE_RATE_MAX_PER_H:
        raise HTTPException(
            status_code=429,
            detail="Juda ko'p so'rov. Iltimos, bir soatdan keyin qayta urining."
        )

    # ---- Invalidate any prior un-consumed codes for the same purpose.
    await db.execute(
        update(EmailVerificationCode)
        .where(
            EmailVerificationCode.user_id == current_user.id,
            EmailVerificationCode.purpose == purpose,
            EmailVerificationCode.consumed_at.is_(None),
        )
        .values(consumed_at=datetime.now(_tz.utc))
    )

    # ---- Issue + persist new code (hash only).
    code = EmailVerificationCode.generate_code()
    row = EmailVerificationCode(
        user_id    = current_user.id,
        email      = target_email,
        code_hash  = EmailVerificationCode.hash_code(code),
        purpose    = purpose,
        expires_at = EmailVerificationCode.default_expiry(_EMAIL_CODE_EXPIRY_MIN),
    )
    db.add(row)
    await db.commit()

    # ---- Send email in background so the HTTP response is snappy.
    from app.services.email_service import send_mail, render_template

    async def _send():
        try:
            html = render_template(
                "verify_email.html",
                code=code,
                email=target_email,
                first_name=current_user.first_name or "",
                expires_minutes=_EMAIL_CODE_EXPIRY_MIN,
            )
            await send_mail(
                to=target_email,
                subject="Email manzilingizni tasdiqlang — Alif24",
                html=html,
                user_id=current_user.id,
            )
        except Exception:
            logger.exception("Failed to send verification email to %s", target_email)

    background_tasks.add_task(_send)

    return {
        "success": True,
        "message": f"Tasdiqlash kodi {target_email} manziliga yuborildi.",
        "expires_in": _EMAIL_CODE_EXPIRY_MIN * 60,
        "purpose": purpose.value,
    }


@router.post("/email/verify-code")
async def verify_email_verification_code(
    data: VerifyEmailCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Consume a 6-digit code and flip email_verified (or change the email)."""
    now = datetime.now(_tz.utc)
    code_hash = EmailVerificationCode.hash_code(data.code)

    # Find the most recent active code for this user (any purpose).
    res = await db.execute(
        select(EmailVerificationCode)
        .where(
            EmailVerificationCode.user_id == current_user.id,
            EmailVerificationCode.consumed_at.is_(None),
        )
        .order_by(EmailVerificationCode.created_at.desc())
    )
    rows = res.scalars().all()
    if not rows:
        raise HTTPException(status_code=400, detail="Faol tasdiqlash kodi topilmadi. Yangi kod so'rang.")

    # Prefer the row whose hash actually matches — but still count attempts
    # against *every* active row so brute-forcing across generations is bounded.
    target: Optional[EmailVerificationCode] = None
    for r in rows:
        if r.code_hash == code_hash and not r.is_expired():
            target = r
            break

    if target is None:
        # Bump attempts on the newest active code so the attacker can't keep
        # guessing forever. If attempts exceed threshold, consume it.
        newest = rows[0]
        newest.attempts = (newest.attempts or 0) + 1
        if newest.attempts >= _EMAIL_CODE_MAX_ATTEMPTS:
            newest.consumed_at = now
        await db.commit()
        if newest.attempts >= _EMAIL_CODE_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=429,
                detail="Ko'p noto'g'ri urinishlar. Yangi kod so'rang."
            )
        raise HTTPException(status_code=400, detail="Kod noto'g'ri yoki muddati o'tgan.")

    # ---- Apply the effect according to purpose.
    user_row = await db.get(User, current_user.id)
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    if target.purpose == EmailVerificationPurpose.change_email:
        # Collision re-check (someone else may have grabbed the email).
        collision = await db.execute(
            select(User).where(User.email == target.email, User.id != user_row.id)
        )
        if collision.scalars().first():
            target.consumed_at = now
            await db.commit()
            raise HTTPException(status_code=409, detail="Bu email boshqa akkauntga bog'langan.")
        user_row.email = target.email
        user_row.email_verified = True
    else:
        user_row.email_verified = True

    target.consumed_at = now
    await db.commit()
    await db.refresh(user_row)

    return {
        "success": True,
        "message": "Email muvaffaqiyatli tasdiqlandi.",
        "data": user_row.to_dict(),
    }
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


@router.post("/children/create")
async def create_child(
    data: CreateStudentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ota-onalar tomonidan yangi farzand (o'quvchi) yaratish"""
    from shared.database.models import UserRole, StudentProfile, ChildRelationship
    
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar farzand qo'sha oladi")
        
    data.validate()
    
    password = data.password
    if not password:
        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for i in range(6))
        
    username = User.generate_username(data.first_name)
    
    child_user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        username=username,
        role=UserRole.student,
        parent_id=current_user.id
    )
    child_user.set_password(password)
    child_user.set_pin(User.generate_pin())
    
    db.add(child_user)
    await db.flush()
    
    student_profile = StudentProfile(
        user_id=child_user.id,
        parent_user_id=current_user.id,
        grade=data.grade,
        school_name=data.school_name,
        relationship_type=ChildRelationship.guardian
    )
    db.add(student_profile)
    await db.commit()
    
    return {
        "success": True,
        "message": "Bolaning profili muvaffaqiyatli yaratildi",
        "data": {
            "id": child_user.id,
            "first_name": child_user.first_name,
            "last_name": child_user.last_name,
            "username": child_user.username,
            "password": password
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
    
    from shared.database.models.reading_rating import ReadingRating
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
        
        # Add reading stats
        reading_res = await db.execute(
            select(ReadingRating).where(
                ReadingRating.student_id == child.id,
                ReadingRating.period == 'all_time'
            )
        )
        reading_rating = reading_res.scalars().first()
        c_dict["reading_stats"] = {
            "total_books": reading_rating.total_books if reading_rating else 0,
            "total_score": reading_rating.total_score if reading_rating else 0,
            "rating": reading_rating.rating if reading_rating else 0,
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
        
    from shared.database.models.reading_rating import ReadingRating
    reading_res = await db.execute(
        select(ReadingRating).where(
            ReadingRating.student_id == child.id,
            ReadingRating.period == 'all_time'
        )
    )
    reading_rating = reading_res.scalars().first()
    c_dict["reading_stats"] = {
        "total_books": reading_rating.total_books if reading_rating else 0,
        "total_score": reading_rating.total_score if reading_rating else 0,
        "rating": reading_rating.rating if reading_rating else 0,
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

"""
Authentication Middleware - MainPlatform
Uses shared auth modules for JWT handling
Supports both HttpOnly Cookie and Authorization Bearer header
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import Optional

from shared.database import get_db
from shared.database.models import User, AccountStatus, UserSubscription, SubscriptionStatus
from shared.auth import verify_token
from ..core.config import settings
from ..core.errors import UnauthorizedError, TokenExpiredError

security = HTTPBearer(auto_error=False)


async def check_user_subscription(user_id: str, db: AsyncSession) -> bool:
    """Foydalanuvchining faol obunasi yoki 14 kunlik bepul trial borligini tekshirish."""
    now = datetime.now(timezone.utc)

    # 1. Active subscription tekshirish
    result = await db.execute(
        select(UserSubscription.id).where(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.active.value,
            UserSubscription.expires_at > now,
        ).limit(1)
    )
    if result.scalars().first():
        return True

    # 2. 14 kunlik bepul trial tekshirish
    # Trial: created_at dan 14 kun o'tguncha
    from datetime import timedelta
    trial_start = now - timedelta(days=14)

    trial_result = await db.execute(
        select(UserSubscription).where(
            UserSubscription.user_id == user_id,
            UserSubscription.created_at > trial_start,
            # Trial obunalar odatda 0 narxli yoki "trial" deb belgilanadi
        ).order_by(UserSubscription.created_at.desc()).limit(1)
    )
    trial_sub = trial_result.scalars().first()

    if trial_sub:
        # Trial muddati hali tugamagan bo'lishi kerak
        # Trial odatda 14 kun davom etadi
        if trial_sub.expires_at and trial_sub.expires_at > now:
            return True

    return False


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user using shared auth.
    Reads token from: 1) HttpOnly cookie  2) Authorization Bearer header
    """
    token = None
    
    # 1. Try HttpOnly cookie first
    token = request.cookies.get("access_token")
    
    # 2. Fallback to Authorization Bearer header
    if not token and credentials:
        token = credentials.credentials
    
    if not token:
        raise UnauthorizedError("Not authenticated")
    
    payload = verify_token(token)
    if not payload:
        raise TokenExpiredError("Token expired or invalid")
    
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid token payload")
    
    # Query user from shared database (8-digit string ID)
    stmt = select(User).filter(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise UnauthorizedError("User not found")
    
    # Check account status
    if user.status != AccountStatus.active:
        raise UnauthorizedError("User account is deactivated")
    
    return user


async def get_optional_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Optional auth: returns current user or None if unauthenticated.

    This is useful for routes that should work for both guest users and logged-in users.
    """
    try:
        return await get_current_user(request, credentials, db)
    except Exception:
        return None

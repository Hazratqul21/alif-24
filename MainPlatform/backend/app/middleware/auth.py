"""
Authentication Middleware - MainPlatform
Uses shared auth modules for JWT handling
Supports both HttpOnly Cookie and Authorization Bearer header
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from shared.database import get_db
from shared.database.models import User, AccountStatus
from shared.auth import verify_token
from ..core.config import settings
from ..core.errors import UnauthorizedError, TokenExpiredError

security = HTTPBearer(auto_error=False)

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
        raise UnauthorizedError("Invalid or expired token")
    
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

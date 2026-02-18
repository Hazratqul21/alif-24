"""
Authentication Middleware - MainPlatform
Uses shared auth modules for JWT handling
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from shared.database import get_db
from shared.database.models import User, AccountStatus
from shared.auth import verify_token
from ..core.config import settings
from ..core.errors import UnauthorizedError, TokenExpiredError

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user using shared auth"""
    token = credentials.credentials
    
    payload = verify_token(token)
    if not payload:
        raise UnauthorizedError("Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid token payload")
    
    # Query user from shared database (8-digit string ID)
    stmt = select(User).filter(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedError("User not found")
    
    # Check account status
    if user.status != AccountStatus.active:
        raise UnauthorizedError("User account is deactivated")
    
    return user

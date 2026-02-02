from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.core.errors import UnauthorizedError, TokenExpiredError

security = HTTPBearer()

def create_access_token(user_id: str, email: str, role: str) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + timedelta(days=7)  # 7 days
    to_encode = {
        "userId": str(user_id),
        "email": email,
        "role": role,
        "exp": expire
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")

def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token"""
    expire = datetime.utcnow() + timedelta(days=30)  # 30 days
    to_encode = {"userId": str(user_id), "exp": expire}
    return jwt.encode(to_encode, settings.JWT_REFRESH_SECRET, algorithm="HS256")

def verify_token(token: str, secret: str) -> dict:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError("Token has expired")
    except JWTError:
        raise UnauthorizedError("Invalid token")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    from app.models.rbac_models import AccountStatus
    from uuid import UUID
    
    token = credentials.credentials
    
    try:
        payload = verify_token(token, settings.JWT_SECRET)
        user_id = payload.get("userId")
    except Exception as e:
        raise UnauthorizedError(str(e))
    
    # Convert string to UUID for proper SQLAlchemy filtering
    try:
        user_uuid = UUID(user_id)
    except (ValueError, TypeError):
        raise UnauthorizedError("Invalid user ID format")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise UnauthorizedError("User not found")
    
    # Check status field (rbac_models.User uses status instead of is_active)
    if hasattr(user, 'status') and user.status != AccountStatus.active:
        raise UnauthorizedError("User account is deactivated")
    elif hasattr(user, 'is_active') and not user.is_active:
        raise UnauthorizedError("User account is deactivated")
    
    return user


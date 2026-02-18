"""
JWT Token Management - JWT token yaratish va tekshirish
Barcha platformalar uchun bir xil authentication
"""
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import os

# JWT konfiguratsiya
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET environment variable sozlanmagan! "
        "Production uchun kuchli secret key o'rnating."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    JWT access token yaratish
    
    Args:
        data (dict): Token ichiga qo'shiladigan ma'lumotlar (user_id, role, etc.)
        expires_delta (timedelta): Token muddati (default: 30 daqiqa)
    
    Returns:
        str: JWT token
    
    Example:
        token = create_access_token({"sub": str(user.id), "role": "student"})
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    JWT refresh token yaratish (uzoq muddatli)
    
    Args:
        data (dict): Token ichiga qo'shiladigan ma'lumotlar
    
    Returns:
        str: JWT refresh token
    
    Example:
        refresh = create_refresh_token({"sub": str(user.id)})
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    
    refresh_secret = os.getenv("JWT_REFRESH_SECRET")
    if not refresh_secret:
        # Fallback olib tashlandi, endi refresh secret majburiy
        raise RuntimeError("JWT_REFRESH_SECRET environment variable sozlanmagan!")
    
    encoded_jwt = jwt.encode(to_encode, refresh_secret, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    JWT token'ni tekshirish va payload'ni qaytarish
    
    Args:
        token (str): JWT token
    
    Returns:
        Optional[dict]: Token payload yoki None (agar token noto'g'ri bo'lsa)
    
    Example:
        payload = verify_token(token)
        if payload:
            user_id = payload.get("sub")
            role = payload.get("role")
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Refresh token'ni tekshirish
    
    Args:
        token (str): JWT refresh token
    
    Returns:
        Optional[dict]: Token payload yoki None
    """
    try:
        refresh_secret = os.getenv("JWT_REFRESH_SECRET")
        if not refresh_secret:
            return None
            
        payload = jwt.decode(token, refresh_secret, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def decode_token_without_validation(token: str) -> Optional[Dict[str, Any]]:
    """
    Token'ni tekshirmasdan decode qilish (debugging uchun)
    
    Args:
        token (str): JWT token
    
    Returns:
        Optional[dict]: Token payload
    """
    try:
        return jwt.decode(token, options={"verify_signature": False})
    except Exception:
        return None


__all__ = [
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "verify_refresh_token",
    "decode_token_without_validation",
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES"
]

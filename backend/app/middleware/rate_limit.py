from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings

limiter = Limiter(key_func=get_remote_address)

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    try:
        response = await call_next(request)
        return response
    except RateLimitExceeded as e:
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later."
                }
            }
        )


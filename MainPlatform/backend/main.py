"""
MainPlatform Backend - Alif24 Core Services
Auth, SmartKids AI, MathKids AI

Uses shared database, auth, and payments modules
"""

import sys
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Add project root to path for shared modules
import sentry_sdk
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.auth import get_current_user, get_optional_current_user
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from shared.database import init_db
from app.core.config import settings
from app.core.errors import AppError
from app.middleware.error_handler import error_handler

# Rate Limiter Setup
IS_SERVERLESS = bool(os.getenv("VERCEL"))
REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    try:
        limiter = Limiter(
            key_func=get_remote_address,
            default_limits=["100/minute"],
            storage_uri=REDIS_URL
        )
    except Exception as e:
        logger.warning(f"Could not initialize Redis rate limiter: {e}")
        limiter = Limiter(
            key_func=get_remote_address,
            default_limits=["100/minute"]
        )
elif IS_SERVERLESS:
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[]
    )
else:
    limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Initialize Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.NODE_ENV,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize shared database
    await init_db()
    yield
    # Shutdown

tags_metadata = [
    {"name": "auth", "description": "Authentication (Login, Register, Refresh Token)"},
    {"name": "smartkids", "description": "AI-Powered Story & Reading Analysis"},
    {"name": "mathkids", "description": "AI-Powered Math Solver & Image Recognition"},
    {"name": "dashboard", "description": "Student & Parent Dashboards"},
    {"name": "admin", "description": "Admin Panel - /hazratqul, /nurali, /pedagog"},
    {"name": "verification", "description": "Phone verification via Telegram"},
]

app = FastAPI(
    title="Alif24 MainPlatform API",
    description="""
    **MainPlatform - Core Services** 🚀
    
    - Authentication & User Management
    - SmartKids AI: Story generation, Speech analysis
    - MathKids AI: Math solver, Image recognition
    """,
    version="2.0.0",
    openapi_tags=tags_metadata,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan
)

# Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Error Handlers
app.add_exception_handler(AppError, error_handler)
app.add_exception_handler(Exception, error_handler)

# CORS
origins = ["*"]
allow_credentials = True
if settings.CORS_ORIGINS:
    if isinstance(settings.CORS_ORIGINS, str):
        origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
    else:
        origins = settings.CORS_ORIGINS
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ============================================================================
# SUBSCRIPTION CHECK MIDDLEWARE
# Obunasi yo'q foydalanuvchilar faqat ochiq URL'larga kira oladi
# ============================================================================

from starlette.middleware.base import BaseHTTPMiddleware
from shared.database import get_db as _get_db_session
from shared.auth import verify_token as _verify_token
from shared.database.models import UserSubscription, SubscriptionStatus
from sqlalchemy import select as _select
from datetime import datetime as _dt, timezone as _tz

# Obuna tekshirilMAYDIGAN URL'lar (ochiq)
SUBSCRIPTION_EXEMPT_PREFIXES = (
    "/api/v1/auth",           # Login, Register
    "/api/v1/payments",       # Obuna sotib olish, webhook
    "/api/v1/admin",          # Admin panel
    "/api/v1/verification",   # Telefon tasdiqlash
    "/api/v1/telegram",       # Bot webhook
    "/api/v1/health",         # Monitoring
    "/health",                # Server check
    "/api/uploads",           # Static fayllar
    "/docs",                  # Swagger
    "/openapi",               # OpenAPI schema
    "/api/v1/openapi",        # OpenAPI alt
)

# Maxsus ochiq sahifalar (to'liq URL mos kelishi kerak)
SUBSCRIPTION_EXEMPT_EXACT = {
    "/",
    "/api/v1/dashboard/subscription",
    "/api/v1/dashboard/my-subscription",
}


class SubscriptionCheckMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 1. Ochiq URL'larni o'tkazib yuboramiz
        if any(path.startswith(prefix) for prefix in SUBSCRIPTION_EXEMPT_PREFIXES):
            return await call_next(request)

        if path in SUBSCRIPTION_EXEMPT_EXACT:
            return await call_next(request)

        # 2. OPTIONS (CORS preflight) — o'tkazamiz
        if request.method == "OPTIONS":
            return await call_next(request)

        # 3. Token olishga urinamiz
        token = request.cookies.get("access_token")
        if not token:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        if not token:
            # Token yo'q — get_current_user o'zi bloklasin
            return await call_next(request)

        # 4. Tokenni dekod qilamiz
        try:
            payload = _verify_token(token)
            if not payload:
                return await call_next(request)
            user_id = payload.get("sub")
            if not user_id:
                return await call_next(request)
        except Exception:
            return await call_next(request)

        # 5. Obunani tekshiramiz
        try:
            async for db in _get_db_session():
                result = await db.execute(
                    _select(UserSubscription.id).where(
                        UserSubscription.user_id == user_id,
                        UserSubscription.status == SubscriptionStatus.active.value,
                        UserSubscription.expires_at > _dt.now(_tz.utc),
                    ).limit(1)
                )
                has_sub = result.scalars().first() is not None
                break
        except Exception:
            # DB xatosi — bloklash xato, o'tkazamiz
            return await call_next(request)

        if not has_sub:
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "Obuna talab etiladi. Iltimos, obuna sotib oling.",
                    "code": "subscription_required",
                    "subscription_url": "/payments/checkout",
                }
            )

        return await call_next(request)


app.add_middleware(SubscriptionCheckMiddleware)

# Include Routers
from app.api.v1 import auth, dashboard, admin_panel, verification, health, feedback, telegram
from app.api.v1 import classrooms, assignments, notifications, lessons, platform_content, aiops, uploads, coins, organizations, olympiads
from app.api.v1 import reading_competition
from app.api.v1 import admin_analytics
from app.api.v1 import payments
from app.smartkids import story_router, image_reader_router, file_reader_router, speech_token_router
from app.mathkids import math_solver_router, math_image_router

# Health check (no prefix)
app.include_router(health.router, prefix=f"{settings.API_PREFIX}")

app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["auth"])
# Dashboard
app.include_router(dashboard.router, prefix=f"{settings.API_PREFIX}/dashboard", tags=["dashboard"])
# Admin Panel
app.include_router(admin_panel.router, prefix=f"{settings.API_PREFIX}/admin", tags=["admin"])
# Admin Analytics (Smart Dashboard)
app.include_router(admin_analytics.router, prefix=f"{settings.API_PREFIX}/admin", tags=["admin-analytics"])

# Platform Content
app.include_router(platform_content.router, prefix=f"{settings.API_PREFIX}", tags=["content"])

# Phone Verification & Telegram Bot
app.include_router(verification.router, prefix=f"{settings.API_PREFIX}/verification", tags=["verification"])
app.include_router(telegram.router, prefix=f"{settings.API_PREFIX}/telegram", tags=["telegram"])

# SmartKids routes
app.include_router(story_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"], dependencies=[Depends(get_optional_current_user)])
app.include_router(image_reader_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"], dependencies=[Depends(get_optional_current_user)])
app.include_router(file_reader_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"], dependencies=[Depends(get_optional_current_user)])
app.include_router(speech_token_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"], dependencies=[Depends(get_optional_current_user)])

# MathKids routes
app.include_router(math_solver_router.router, prefix=f"{settings.API_PREFIX}/mathkids", tags=["mathkids"], dependencies=[Depends(get_optional_current_user)])
app.include_router(math_image_router.router, prefix=f"{settings.API_PREFIX}/mathkids", tags=["mathkids"], dependencies=[Depends(get_optional_current_user)])

# Feedback
app.include_router(feedback.router, prefix=f"{settings.API_PREFIX}", tags=["feedback"])

# LMS: Classrooms, Assignments, Notifications, Lessons, AI
app.include_router(classrooms.router, prefix=f"{settings.API_PREFIX}", tags=["classrooms"])
app.include_router(aiops.router, prefix=f"{settings.API_PREFIX}", tags=["aiops"])
app.include_router(assignments.router, prefix=f"{settings.API_PREFIX}", tags=["assignments"])
app.include_router(notifications.router, prefix=f"{settings.API_PREFIX}", tags=["notifications"])
app.include_router(lessons.router, prefix=f"{settings.API_PREFIX}", tags=["lessons"])
app.include_router(uploads.router, prefix="/api/v1/upload", tags=["Uploads"])
app.include_router(coins.router, prefix=f"{settings.API_PREFIX}/coins", tags=["coins"])
# Organization
app.include_router(organizations.router, prefix=f"{settings.API_PREFIX}/organization", tags=["organization"])
# Olympiads
app.include_router(olympiads.router, prefix=f"{settings.API_PREFIX}/olympiads", tags=["olympiads"])
# Reading Competition
app.include_router(reading_competition.router, prefix=f"{settings.API_PREFIX}/admin/reading", tags=["reading-competition"])
# Payments
app.include_router(payments.router, prefix=f"{settings.API_PREFIX}/payments", tags=["payments"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
async def root():
    return {
        "service": "MainPlatform",
        "status": "running",
        "docs": f"{settings.API_PREFIX}/docs",
        "features": ["auth", "smartkids", "mathkids", "classrooms", "assignments", "notifications"]
    }

@app.get("/health")
async def health_root():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )

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
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
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
# MUHIM: origins=["*"] + credentials=True birga bo'lishi MUMKIN EMAS (HTTP spec).
# Browserlar bunday responseni rad etadi.
if settings.CORS_ORIGINS:
    if isinstance(settings.CORS_ORIGINS, str):
        origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
    else:
        origins = settings.CORS_ORIGINS
else:
    # Default: alif24.uz subdomenlari + local development
    origins = [
        "https://alif24.uz",
        "https://www.alif24.uz",
        "https://olimp.alif24.uz",
        "https://games.alif24.uz",
        "https://admin.alif24.uz",
        "https://harf.alif24.uz",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
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
from shared.database.models.subscription import SubscriptionPlanConfig
from sqlalchemy import select as _select
from sqlalchemy.orm import selectinload as _selectinload
from datetime import datetime as _dt, timezone as _tz
from shared.subscription import SubscriptionInfo

class SubscriptionInfoMiddleware(BaseHTTPMiddleware):
    """
    Professional subscription middleware: "Inject, Don't Block"
    Foydalanuvchini HECH QACHON bloklamaydi (403 bermaydi).
    Faqat request.state.subscription ga joriy obuna va ruxsatlarni (features) yozadi.
    Zarur bo'lsa, Endpoints o'zlari Depends() orqali ruxsat tekshiradi.
    """
    
    # Static va tekshirish kerakmas api'lar
    SKIP_PREFIXES = (
        "/health", "/docs", "/openapi", "/api/uploads",
        "/api/v1/health", "/api/v1/openapi",
    )

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 1. Tizim resurslari — o'tkazamiz
        if any(path.startswith(p) for p in self.SKIP_PREFIXES):
            request.state.subscription = SubscriptionInfo() # Default, bo'sh
            return await call_next(request)

        # 2. CORS
        if request.method == "OPTIONS":
            request.state.subscription = SubscriptionInfo()
            return await call_next(request)

        # 3. Token qidirish
        token = request.cookies.get("access_token")
        if not token:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        # Token umuman topilmadi — u mehmondir (login qilinmagan)
        if not token:
            request.state.subscription = SubscriptionInfo(is_authenticated=False)
            return await call_next(request)

        # 4. Token haqiqiyligini tekshirish
        try:
            payload = _verify_token(token)
            if not payload:
                request.state.subscription = SubscriptionInfo()
                return await call_next(request)
            user_id = payload.get("sub")
            if not user_id:
                request.state.subscription = SubscriptionInfo()
                return await call_next(request)
        except Exception:
            request.state.subscription = SubscriptionInfo()
            return await call_next(request)

        # 5. Token to'g'ri (Login qilgan yuzer kirdi). Endi tarifini topamiz.
        sub_info = SubscriptionInfo(is_authenticated=True)
        try:
            async for db in _get_db_session():
                result = await db.execute(
                    _select(UserSubscription)
                    .options(_selectinload(UserSubscription.plan_config))
                    .where(
                        UserSubscription.user_id == user_id,
                        UserSubscription.status == SubscriptionStatus.active.value,
                        UserSubscription.expires_at > _dt.now(_tz.utc),
                    )
                    .order_by(UserSubscription.expires_at.desc())
                    .limit(1)
                )
                active_sub = result.scalars().first()

                if active_sub and active_sub.plan_config:
                    # Haqiqiy plan/tarif topildi!
                    plan = active_sub.plan_config
                    sub_info = SubscriptionInfo(
                        is_authenticated=True,
                        has_subscription=True,
                        plan_slug=plan.slug,
                        plan_name=plan.name,
                        features=plan.features or {},
                        expires_at=active_sub.expires_at.isoformat() if active_sub.expires_at else None,
                    )
                break
        except Exception as e:
            logger.warning(f"Subscription query failed for user {user_id}: {e}")

        # State ga joylaymiz, va keyingi jarayonga yo'l beramiz
        request.state.subscription = sub_info
        return await call_next(request)

app.add_middleware(SubscriptionInfoMiddleware)

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
app.include_router(story_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"], dependencies=[Depends(get_current_user)])
app.include_router(image_reader_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"], dependencies=[Depends(get_current_user)])
app.include_router(file_reader_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"], dependencies=[Depends(get_current_user)])
app.include_router(speech_token_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"], dependencies=[Depends(get_current_user)])

# MathKids routes
app.include_router(math_solver_router.router, prefix=f"{settings.API_PREFIX}/mathkids", tags=["mathkids"], dependencies=[Depends(get_current_user)])
app.include_router(math_image_router.router, prefix=f"{settings.API_PREFIX}/mathkids", tags=["mathkids"], dependencies=[Depends(get_current_user)])

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

"""
Olimp Platform Backend
======================
Olympiad management and competitions
Port: 8005

Features:
- Create and manage olympiads
- Add questions to olympiads
- Student registration
- Answer submission and scoring
- Leaderboard
"""

import sys
import os
from pathlib import Path

# Add project root for shared modules
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Shared imports
from shared.database import init_db, get_db
from shared.auth import verify_token
from shared.database.models import UserSubscription, SubscriptionStatus, User
from shared.database.models.subscription import SubscriptionPlanConfig

# Import subscription info and dependencies from shared module
from shared.subscription import SubscriptionInfo, get_sub_info, require_feature

from sqlalchemy import select as _select
from sqlalchemy.orm import selectinload as _selectinload
from datetime import datetime as _dt, timezone as _tz
from starlette.middleware.base import BaseHTTPMiddleware

# Local imports
from app.core.config import settings
from app.core.logging import logger

# Olimp router
from app.olimp import router as olimp_router
from app.reading import router as reading_router
from app.speech import router as speech_router
from app.gamification import router as gamification_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle"""
    logger.info("[OLIMP] Starting Olimp Platform...")

    await init_db()
    logger.info("[OK] Database initialized")

    yield

    logger.info("[BYE] Shutting down Olimp Platform...")


# Create FastAPI app
app = FastAPI(
    title="Olimp Platform API",
    description="Olympiad management and competitions",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS - configurable origins
cors_origins_str = os.getenv("CORS_ORIGINS", "")
cors_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()] if cors_origins_str else ["*"]
allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SubscriptionInfoMiddleware(BaseHTTPMiddleware):
    SKIP_PREFIXES = ("/health", "/docs", "/openapi")
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(p) for p in self.SKIP_PREFIXES):
            request.state.subscription = SubscriptionInfo()
            return await call_next(request)
        if request.method == "OPTIONS":
            request.state.subscription = SubscriptionInfo()
            return await call_next(request)

        token = request.cookies.get("access_token")
        if not token:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        if not token:
            request.state.subscription = SubscriptionInfo(is_authenticated=False)
            return await call_next(request)

        try:
            payload = verify_token(token)
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

        sub_info = SubscriptionInfo(is_authenticated=True)
        try:
            async for db in get_db():
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
        except Exception:
            pass

        request.state.subscription = sub_info
        return await call_next(request)

app.add_middleware(SubscriptionInfoMiddleware)


# Security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "Olimp Platform",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "features": ["olympiads", "questions", "registration", "leaderboard"]
    }


@app.get("/api/v1/auth/me")
async def auth_me(request: Request):
    """Verify session and return user info"""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    async for db in get_db():
        result = await db.execute(_select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {
            "success": True,
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value if user.role else None,
            }
        }


# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}


# Include Olimp router (singular and plural endpoints)
app.include_router(
    olimp_router.router,
    prefix="/api/v1/olympiad",
    tags=["Olympiad"]
)
app.include_router(
    olimp_router.router,
    prefix="/api/v1/olympiads",
    tags=["Olympiad"]
)

# Include Reading Competition router
app.include_router(
    reading_router.router,
    prefix="/api/v1/reading",
    tags=["Reading Competition"]
)

# Include Speech (TTS) router
app.include_router(
    speech_router,
    prefix="/api/v1/speech",
    tags=["Speech"]
)

# Include Gamification router
app.include_router(
    gamification_router.router,
    prefix="/api/v1",
    tags=["Gamification"]
)

# Include Social router
from app.social import router as social_router
app.include_router(
    social_router.router,
    prefix="/api/v1",
    tags=["Social"]
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Noto'g'ri so'rov",
                    "details": exc.errors()
                }
            }
        )

    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(exc) if settings.DEBUG else "Internal server error"
            }
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8005,
        reload=settings.DEBUG
    )

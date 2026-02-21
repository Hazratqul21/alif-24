"""
MainPlatform Backend - Alif24 Core Services
Auth, SmartKids AI, MathKids AI

Uses shared database, auth, and payments modules
"""

import sys
import os
from pathlib import Path

# Add project root to path for shared modules
import sentry_sdk
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["100/minute"],
        storage_uri=REDIS_URL
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
allow_credentials = False
if settings.CORS_ORIGINS:
    if isinstance(settings.CORS_ORIGINS, str):
        origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
    else:
        origins = settings.CORS_ORIGINS
    allow_credentials = "*" not in origins

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

# Include Routers
from app.api.v1 import auth, dashboard, admin_panel, verification, health, feedback, telegram
from app.api.v1 import classrooms, assignments, notifications, lessons, platform_content, aiops, uploads # Added uploads
from app.smartkids import story_router, image_reader_router, file_reader_router, speech_token_router
from app.mathkids import math_solver_router, math_image_router

# Health check (no prefix)
app.include_router(health.router, prefix=f"{settings.API_PREFIX}")

app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["auth"])
# Admin Panel
app.include_router(admin_panel.router, prefix=f"{settings.API_PREFIX}/admin", tags=["admin"])

# Platform Content
app.include_router(platform_content.router, prefix=f"{settings.API_PREFIX}", tags=["content"])

# Phone Verification & Telegram Bot
app.include_router(verification.router, prefix=f"{settings.API_PREFIX}/verification", tags=["verification"])
app.include_router(telegram.router, prefix=f"{settings.API_PREFIX}/telegram", tags=["telegram"])

# SmartKids routes
app.include_router(story_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"])
app.include_router(image_reader_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"])
app.include_router(file_reader_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"])
app.include_router(speech_token_router.router, prefix=f"{settings.API_PREFIX}/smartkids", tags=["smartkids"])

# MathKids routes
app.include_router(math_solver_router.router, prefix=f"{settings.API_PREFIX}/mathkids", tags=["mathkids"])
app.include_router(math_image_router.router, prefix=f"{settings.API_PREFIX}/mathkids", tags=["mathkids"])

# Feedback
app.include_router(feedback.router, prefix=f"{settings.API_PREFIX}", tags=["feedback"])

# LMS: Classrooms, Assignments, Notifications, Lessons, AI
app.include_router(classrooms.router, prefix=f"{settings.API_PREFIX}", tags=["classrooms"])
app.include_router(aiops.router, prefix=f"{settings.API_PREFIX}", tags=["aiops"])
app.include_router(assignments.router, prefix=f"{settings.API_PREFIX}", tags=["assignments"])
app.include_router(notifications.router, prefix=f"{settings.API_PREFIX}", tags=["notifications"])
app.include_router(lessons.router, prefix=f"{settings.API_PREFIX}", tags=["lessons"])
app.include_router(uploads.router, prefix="/api/v1/upload", tags=["Uploads"]) # Added uploads router

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )

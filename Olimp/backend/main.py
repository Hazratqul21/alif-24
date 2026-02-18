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
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Shared imports
from shared.database import init_db, get_db
from shared.auth import verify_token

# Local imports
from app.core.config import settings
from app.core.logging import logger

# Olimp router
from app.olimp import router as olimp_router


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
allow_credentials = "*" not in cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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


# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}


# Include Olimp router
app.include_router(
    olimp_router.router,
    prefix="/api/v1/olympiad",
    tags=["Olympiad"]
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
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

"""
Harf Platform Backend
======================
Platform for learning letters: Uzbek (Harf), Russian (Harfr), English (Eharf)
Port: 8001

Features:
- Interactive letter learning
- Audio pronunciation
- Letter tracing games
- Progress tracking
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

# Harf routers
from app.harf import router as harf_router
from app.rharf import router as rharf_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle"""
    logger.info("[HARF] Starting Harf Platform...")
    
    # Initialize shared database
    await init_db()
    logger.info("[OK] Database initialized")
    
    yield
    
    logger.info("[BYE] Shutting down Harf Platform...")


# Create FastAPI app
app = FastAPI(
    title="Harf Platform API",
    description="Platform for learning Uzbek, Russian, and English letters",
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
        "service": "Harf Platform",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "features": ["harf", "rharf", "eharf", "unified"]
    }


# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}


# Include Harf routers
app.include_router(
    harf_router.router,
    prefix="/api/v1/harf",
    tags=["Uzbek Letters (Harf)"]
)

app.include_router(
    rharf_router.router,
    prefix="/api/v1/rharf",
    tags=["Russian Letters (Harfr)"]
)

# Eharf router (if exists)
try:
    from app.eharf import router as eharf_router
    app.include_router(
        eharf_router.router,
        prefix="/api/v1/eharf",
        tags=["English Letters (Eharf)"]
    )
except ImportError:
    logger.warning("Eharf module not available")

# Unified router (if exists)
try:
    from app.unified import router as unified_router
    app.include_router(
        unified_router.router,
        prefix="/api/v1/unified",
        tags=["Unified Learning"]
    )
except ImportError:
    logger.warning("Unified module not available")


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
        port=8001,
        reload=settings.DEBUG
    )

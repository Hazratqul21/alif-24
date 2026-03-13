"""
Lessions Platform Backend
=========================
Lesson management and reading materials
Port: 8006

Features:
- Create and manage lessons
- Student progress tracking
- Reading materials (Ertaklar)
- Lesson builder
"""

import sys
import os
from pathlib import Path

# Add project root for shared modules
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Shared imports
from shared.database import init_db, get_db
from shared.auth import verify_token
from shared.database.models import User, AccountStatus
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Local imports
from app.core.config import settings
from app.core.logging import logger

# Lessons router
from app.lessons import router as lessons_router

security = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user - cookie or Bearer header"""
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.status != AccountStatus.active:
        raise HTTPException(status_code=403, detail="User account is deactivated")
    
    return user


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle"""
    logger.info("[LESSIONS] Starting Lessions Platform...")

    await init_db()
    logger.info("[OK] Database initialized")

    yield

    logger.info("[BYE] Shutting down Lessions Platform...")


# Create FastAPI app
app = FastAPI(
    title="Lessions Platform API",
    description="Lesson management and reading materials",
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
        "service": "Lessions Platform",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "features": ["lessons", "progress", "ertaklar"]
    }


# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}


# Include Lessons router
app.include_router(
    lessons_router.router,
    prefix="/api/v1",
    tags=["Lessons"],
    dependencies=[Depends(get_current_user)]
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail
                }
            }
        )
    
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Noto'g'ri so'rov shakli",
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
        port=8006,
        reload=settings.DEBUG
    )

"""
Health Check Endpoint - Platform Health Monitoring
Alif24 Platform - Health Check API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Dict, Any

from shared.database import get_db
from shared.database.models import User

router = APIRouter(prefix="/health", tags=["health"])


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    services: Dict[str, Any]


class HealthCheckResult(BaseModel):
    database: str
    timestamp: str
    uptime: str


@router.get("", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Platform health check endpoint
    Returns status of all critical services
    """
    services = {
        "api": "healthy",
        "database": "unknown",
    }
    
    # Database check
    try:
        await db.execute(text("SELECT 1"))
        services["database"] = "healthy"
    except Exception as e:
        services["database"] = f"unhealthy: {str(e)}"
    
    return HealthResponse(
        status="healthy" if services["database"] == "healthy" else "degraded",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0",
        services=services
    )


@router.get("/db")
async def database_health(db: AsyncSession = Depends(get_db)):
    """
    Detailed database health check
    """
    try:
        # Check connection
        result = (await db.execute(text("SELECT 1"))).scalar()
        
        # Get user count
        count_result = await db.execute(select(func.count(User.id)))
        user_count = count_result.scalar() or 0
        
        return {
            "status": "healthy",
            "connection": "ok",
            "user_count": user_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/ping")
async def ping():
    """
    Simple ping endpoint for load balancers
    """
    return {"status": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}

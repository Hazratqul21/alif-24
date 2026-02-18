"""
Error Handler Middleware - MainPlatform
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.core.errors import AppError
from app.core.logging import logger
from datetime import datetime, timezone
import traceback

async def error_handler(request: Request, exc: Exception):
    """Global error handler"""
    if isinstance(exc, AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.detail
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    # Log unexpected errors
    logger.error(f"Unhandled error: {exc}\n{traceback.format_exc()}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

"""
Games Platform Backend
=======================
Educational games and activities
Port: 8004

Features:
- Memory games (Letter Memory)
- Math Monster game
- Educational puzzles
- Progress tracking & coins
"""

import os
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

# Shared imports
from shared.database import init_db, get_db
from shared.database.models import User, StudentProfile, StudentCoin, AccountStatus
from shared.auth import verify_token
from shared.payments import add_coins, reward_game_win

# Local imports
from app.core.config import settings
from app.core.logging import logger

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user using shared auth"""
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    stmt = select(User).filter(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.status != AccountStatus.active:
        raise HTTPException(status_code=403, detail="User account is deactivated")
    
    return user


# ============= Request Schemas =============

class GameCompleteRequest(BaseModel):
    score: int
    time_taken: int

class MathMonsterCompleteRequest(BaseModel):
    score: int
    level: int
    correct_answers: int


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle"""
    logger.info("[GAMES] Starting Games Platform...")
    
    await init_db()
    logger.info("[OK] Database initialized")
    
    yield
    
    logger.info("[BYE] Shutting down Games Platform...")


# Create FastAPI app
app = FastAPI(
    title="Games Platform API",
    description="Educational games and activities",
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
        "service": "Games Platform",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "games": ["memory", "math-monster", "tetris", "2048"]
    }


# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}


# ============= Game Completion Endpoints =============

@app.post("/api/v1/games/memory/complete")
async def complete_memory_game(
    data: GameCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Complete memory game and award coins"""
    coins_earned = min(data.score // 10, 10)  # Max 10 coins
    
    stmt = select(StudentProfile).filter(StudentProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()
    
    if student and coins_earned > 0:
        await reward_game_win(db, student.user_id, coins_earned, "Memory Game")
        await db.commit()
    
    return {
        "success": True,
        "data": {
            "game": "memory",
            "score": data.score,
            "time_taken": data.time_taken,
            "coins_earned": coins_earned
        }
    }


@app.post("/api/v1/games/math-monster/complete")
async def complete_math_monster(
    data: MathMonsterCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Complete math monster game and award coins"""
    coins_earned = data.correct_answers * 2  # 2 coins per correct answer
    
    stmt = select(StudentProfile).filter(StudentProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()
    
    if student and coins_earned > 0:
        await reward_game_win(db, student.user_id, coins_earned, "Math Monster")
        await db.commit()
    
    return {
        "success": True,
        "data": {
            "game": "math-monster",
            "score": data.score,
            "level": data.level,
            "correct_answers": data.correct_answers,
            "coins_earned": coins_earned
        }
    }


@app.post("/api/v1/games/tetris/complete")
async def complete_tetris(
    data: GameCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Complete Tetris game"""
    # 100 points = 1 coin
    coins_earned = min(data.score // 100, 20)
    
    stmt = select(StudentProfile).filter(StudentProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()
    
    if student and coins_earned > 0:
        await reward_game_win(db, student.user_id, coins_earned, "Tetris")
        await db.commit()
    
    return {
        "success": True,
        "data": {
            "game": "tetris",
            "score": data.score,
            "coins_earned": coins_earned
        }
    }


@app.post("/api/v1/games/2048/complete")
async def complete_2048(
    data: GameCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Complete 2048 game"""
    # Score 2000+ -> 5 coins, 4000+ -> 10 coins
    coins_earned = min(data.score // 400, 20)
    
    stmt = select(StudentProfile).filter(StudentProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()
    
    if student and coins_earned > 0:
        await reward_game_win(db, student.user_id, coins_earned, "2048")
        await db.commit()
    
    return {
        "success": True,
        "data": {
            "game": "2048",
            "score": data.score,
            "coins_earned": coins_earned
        }
    }


@app.get("/api/v1/games/leaderboard/{game_type}")
async def get_leaderboard(
    game_type: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get game leaderboard"""
    stmt = select(StudentProfile).order_by(desc(StudentProfile.total_points)).limit(limit)
    result = await db.execute(stmt)
    top_students = result.scalars().all()
    
    leaderboard_data = []
    for idx, s in enumerate(top_students):
        stmt = select(User).filter(User.id == s.user_id)
        u_res = await db.execute(stmt)
        u = u_res.scalar_one_or_none()
        leaderboard_data.append({
            "rank": idx + 1,
            "name": f"{u.first_name} {u.last_name}" if u else "Unknown",
            "score": s.total_points,
            "level": s.level
        })
        
    return {
        "success": True,
        "data": {
            "game": game_type,
            "leaderboard": leaderboard_data
        }
    }


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
        port=8004,
        reload=settings.DEBUG
    )

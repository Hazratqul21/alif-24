"""
TestAI Platform Backend
========================
Platform for AI-powered tests, quizzes, and olympiads
Port: 8002

Features:
- AI-generated tests and quizzes
- Live Quiz (Kahoot-style)
- Olympiad questions
- Progress tracking
"""

import sys
import os
from pathlib import Path

# Add project root for shared modules
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel

# Shared imports
from shared.database import init_db, get_db
from shared.database.models import (
    User, LiveQuiz, LiveQuizQuestion,
    LiveQuizParticipant, LiveQuizAnswer,
    AccountStatus, Olympiad, OlympiadParticipant,
    OlympiadStatus, ParticipationStatus
)
from shared.auth import verify_token
import openai
import json

# Local imports
from app.core.config import settings
from app.core.logging import logger
from app.services.live_quiz_service import LiveQuizService

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
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.status != AccountStatus.active:
        raise HTTPException(status_code=403, detail="User account is deactivated")
    
    return user


# ============= Request Schemas =============

class CreateQuizRequest(BaseModel):
    title: str
    description: Optional[str] = None
    time_per_question: int = 30
    shuffle_questions: bool = False
    shuffle_options: bool = False

class AddQuestionsRequest(BaseModel):
    questions: List[dict]

class JoinQuizRequest(BaseModel):
    join_code: str
    display_name: str
    avatar_emoji: str = "🎮"

class SubmitAnswerRequest(BaseModel):
    question_id: str
    selected_answer: int
    time_to_answer_ms: int


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle"""
    logger.info("[TESTAI] Starting TestAI Platform...")
    
    # Initialize shared database
    await init_db()
    logger.info("[OK] Database initialized")
    
    yield
    
    logger.info("[BYE] Shutting down TestAI Platform...")


# Create FastAPI app
app = FastAPI(
    title="TestAI Platform API",
    description="AI-powered tests, quizzes, and olympiads",
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
        "service": "TestAI Platform",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "features": ["live-quiz", "ai-tests", "olympiad", "practice"]
    }


# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}


# ============= Live Quiz Endpoints (Teacher) =============

@app.post("/api/v1/quiz/create")
async def create_quiz(
    data: CreateQuizRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new live quiz (teacher only)"""
    service = LiveQuizService(db)
    result = await service.create_quiz(
        teacher_user_id=current_user.id,
        title=data.title,
        description=data.description,
        time_per_question=data.time_per_question,
        shuffle_questions=data.shuffle_questions,
        shuffle_options=data.shuffle_options
    )
    return {"success": True, "data": result}


@app.post("/api/v1/quiz/{quiz_id}/questions")
async def add_questions(
    quiz_id: str,
    data: AddQuestionsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add questions to a quiz (teacher only)"""
    service = LiveQuizService(db)
    result = await service.add_questions(
        teacher_user_id=current_user.id,
        quiz_id=quiz_id,
        questions=data.questions
    )
    return {"success": True, "data": result}


@app.post("/api/v1/quiz/{quiz_id}/open")
async def open_lobby(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Open quiz lobby for students to join (teacher only)"""
    service = LiveQuizService(db)
    result = await service.open_lobby(
        teacher_user_id=current_user.id,
        quiz_id=quiz_id
    )
    return {"success": True, "data": result}


@app.post("/api/v1/quiz/{quiz_id}/start")
async def start_quiz(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start the quiz (teacher only)"""
    service = LiveQuizService(db)
    result = await service.start_quiz(
        teacher_user_id=current_user.id,
        quiz_id=quiz_id
    )
    return {"success": True, "data": result}


@app.get("/api/v1/quiz/{quiz_id}/question")
async def get_current_question(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current question (teacher view)"""
    service = LiveQuizService(db)
    result = await service.get_current_question(
        teacher_user_id=current_user.id,
        quiz_id=quiz_id
    )
    return {"success": True, "data": result}


@app.post("/api/v1/quiz/{quiz_id}/next")
async def next_question(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Move to next question (teacher only)"""
    service = LiveQuizService(db)
    result = await service.next_question(
        teacher_user_id=current_user.id,
        quiz_id=quiz_id
    )
    return {"success": True, "data": result}


@app.get("/api/v1/quiz/{quiz_id}/leaderboard")
async def get_leaderboard(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get quiz leaderboard (teacher only)"""
    service = LiveQuizService(db)
    result = await service.get_leaderboard(
        teacher_user_id=current_user.id,
        quiz_id=quiz_id
    )
    return {"success": True, "data": result}


@app.post("/api/v1/quiz/{quiz_id}/end")
async def end_quiz(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """End the quiz (teacher only)"""
    service = LiveQuizService(db)
    result = await service.end_quiz(
        teacher_user_id=current_user.id,
        quiz_id=quiz_id
    )
    return {"success": True, "data": result}


# ============= Live Quiz Endpoints (Student) =============

@app.post("/api/v1/quiz/join")
async def join_quiz(
    data: JoinQuizRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Join a live quiz by code (student only)"""
    service = LiveQuizService(db)
    result = await service.join_quiz(
        student_user_id=current_user.id,
        join_code=data.join_code,
        display_name=data.display_name,
        avatar_emoji=data.avatar_emoji
    )
    return {"success": True, "data": result}


@app.get("/api/v1/quiz/{quiz_id}/student-question")
async def get_student_question(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current question (student view, without correct answer)"""
    service = LiveQuizService(db)
    result = await service.get_student_question(
        student_user_id=current_user.id,
        quiz_id=quiz_id
    )
    return {"success": True, "data": result}


@app.post("/api/v1/quiz/{quiz_id}/answer")
async def submit_answer(
    quiz_id: str,
    data: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit answer for a question (student only)"""
    service = LiveQuizService(db)
    result = await service.submit_answer(
        student_user_id=current_user.id,
        quiz_id=quiz_id,
        question_id=data.question_id,
        selected_answer=data.selected_answer,
        time_to_answer_ms=data.time_to_answer_ms
    )
    return {"success": True, "data": result}


@app.get("/api/v1/quiz/{quiz_id}/results")
async def get_student_results(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get final results for student"""
    service = LiveQuizService(db)
    result = await service.get_student_results(
        student_user_id=current_user.id,
        quiz_id=quiz_id
    )
    return {"success": True, "data": result}


# ============= AI Test Endpoints =============

@app.post("/api/v1/test/generate")
async def generate_test(
    subject: str,
    topic: str,
    difficulty: str = "medium",
    question_count: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Generate AI-powered test questions"""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(503, "AI service not configured")
    
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    prompt = f"""
    Create a {difficulty} level test for {subject} on topic "{topic}".
    Generate {question_count} multiple-choice questions.
    Return ONLY raw JSON in this format:
    {{
        "questions": [
            {{
                "text": "Question text here",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_index": 0,
                "explanation": "Why A is correct"
            }}
        ]
    }}
    """
    
    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful education AI. Output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        logger.error(f"AI Generation failed: {e}")
        raise HTTPException(500, "AI generation failed")


# ============= Olympiad Endpoints =============

@app.get("/api/v1/olympiad/active")
async def get_active_olympiads(db: AsyncSession = Depends(get_db)):
    """Get list of active olympiads"""
    result = await db.execute(
        select(Olympiad).where(Olympiad.status.in_([OlympiadStatus.booking, OlympiadStatus.active]))
    )
    olympiads = result.scalars().all()
    
    return {
        "success": True,
        "data": {
            "olympiads": [
                {
                    "id": o.id,
                    "title": o.title,
                    "subject": o.subject,
                    "start_time": o.start_time,
                    "duration": o.duration_minutes,
                    "status": o.status
                } for o in olympiads
            ]
        }
    }


@app.post("/api/v1/olympiad/{olympiad_id}/register")
async def register_for_olympiad(
    olympiad_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register for an olympiad"""
    user_id = current_user.id
    
    # Check if olympiad exists
    result = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = result.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(404, "Olympiad not found")
        
    # Check existing registration
    result = await db.execute(
        select(OlympiadParticipant).where(
            OlympiadParticipant.olympiad_id == olympiad_id,
            OlympiadParticipant.student_id == user_id
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        return {"success": True, "message": "Already registered"}

    # Register
    participant = OlympiadParticipant(
        olympiad_id=olympiad_id,
        student_id=user_id,
        status=ParticipationStatus.registered
    )
    db.add(participant)
    await db.commit()
    
    return {
        "success": True,
        "data": {"message": "Successfully registered"}
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
        port=8002,
        reload=settings.DEBUG
    )

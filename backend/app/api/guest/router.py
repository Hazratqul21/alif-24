"""
Guest Session Router - API endpoints for guest tracking
"""
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.services.guest_session_service import GuestSessionService

router = APIRouter(prefix="/guest", tags=["guest"])


class CreateSessionRequest(BaseModel):
    """Request to create guest session"""
    fingerprint: Optional[str] = None


class CreateSessionResponse(BaseModel):
    """Response with session token"""
    session_token: str
    message: str


class TrackContentRequest(BaseModel):
    """Request to track content access"""
    session_token: str
    content_type: str  # 'harf', 'rharf', 'math', etc.
    content_id: str    # Letter ID, game ID, etc.


class TrackContentResponse(BaseModel):
    """Response after tracking content"""
    session_token: str
    requires_login: bool
    content_accessed_count: int
    message: str
    first_content_was: Optional[str] = None


class SessionStatusResponse(BaseModel):
    """Session status check response"""
    exists: bool
    requires_login: bool
    content_accessed_count: Optional[int] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    message: str


@router.post("/session", response_model=CreateSessionResponse)
async def create_guest_session(
    request_data: CreateSessionRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Create or get guest session
    
    - Browser generates fingerprint and sends it
    - Backend creates session or returns existing one
    - Returns session_token for future requests
    """
    service = GuestSessionService(db)
    
    # Get IP address
    ip_address = request.client.host if request.client else None
    
    # Get or create session
    session = service.create_or_get_session(
        fingerprint=request_data.fingerprint,
        ip_address=ip_address
    )
    
    return CreateSessionResponse(
        session_token=session.session_token,
        message="Session created successfully. You can access one content for free!"
    )


@router.post("/track", response_model=TrackContentResponse)
async def track_content_access(
    data: TrackContentRequest,
    db: Session = Depends(get_db)
):
    """
    Track content access
    
    - Frontend calls this when user opens content (harf, math game, etc.)
    - Backend increments counter
    - If counter >= 2, requires_login = True
    - Frontend shows login modal if requires_login = True
    """
    service = GuestSessionService(db)
    
    result = service.track_content_access(
        session_token=data.session_token,
        content_type=data.content_type,
        content_id=data.content_id
    )
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return TrackContentResponse(**result)


@router.get("/status/{session_token}", response_model=SessionStatusResponse)
async def get_session_status(
    session_token: str,
    db: Session = Depends(get_db)
):
    """
    Check session status
    
    - Frontend can check if login is required before allowing content access
    - Returns session info
    """
    service = GuestSessionService(db)
    result = service.check_session_status(session_token)
    return SessionStatusResponse(**result)


@router.get("/stats")
async def get_guest_statistics(db: Session = Depends(get_db)):
    """
    Get guest session statistics (admin only)
    
    - Total sessions
    - Converted sessions (guest -> user)
    - Conversion rate
    - Active sessions
    """
    service = GuestSessionService(db)
    return service.get_statistics()


@router.post("/convert/{session_token}")
async def convert_session_to_user(
    session_token: str,
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Convert guest session to authenticated user
    
    - Called after successful registration/login
    - Links guest activity to user account
    """
    service = GuestSessionService(db)
    success = service.convert_session_to_user(session_token, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "message": "Session converted successfully",
        "user_id": user_id
    }

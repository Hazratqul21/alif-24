"""
Guest Session Service - Business logic for guest sessions
"""
from typing import Optional
import secrets
import hashlib
from sqlalchemy.orm import Session

from app.repositories.guest_session_repository import GuestSessionRepository
from app.models.guest_session import GuestSession


class GuestSessionService:
    """Handle guest session business logic"""
    
    def __init__(self, db: Session):
        self.repository = GuestSessionRepository(db)
    
    @staticmethod
    def generate_session_token() -> str:
        """Generate secure session token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_fingerprint(user_agent: str, ip_address: str) -> str:
        """Generate browser fingerprint from user agent and IP"""
        data = f"{user_agent}_{ip_address}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    def create_or_get_session(
        self,
        fingerprint: Optional[str] = None,
        ip_address: Optional[str] = None,
        session_token: Optional[str] = None
    ) -> GuestSession:
        """
        Create new session or get existing one
        Priority: session_token > fingerprint > create new
        """
        # Try to get by token first
        if session_token:
            session = self.repository.get_by_token(session_token)
            if session:
                return session
        
        # Try to get by fingerprint
        if fingerprint:
            session = self.repository.get_by_fingerprint(fingerprint)
            if session:
                return session
        
        # Create new session
        new_token = self.generate_session_token()
        return self.repository.create_session(
            session_token=new_token,
            fingerprint=fingerprint,
            ip_address=ip_address
        )
    
    def track_content_access(
        self,
        session_token: str,
        content_type: str,
        content_id: str
    ) -> dict:
        """
        Track content access and determine if login required
        Returns: {
            "session_token": str,
            "requires_login": bool,
            "content_accessed_count": int,
            "message": str
        }
        """
        session = self.repository.get_by_token(session_token)
        if not session:
            return {
                "error": "Session not found",
                "requires_login": True
            }
        
        # Track the access
        session = self.repository.track_content_access(
            session=session,
            content_type=content_type,
            content_id=content_id
        )
        
        message = "Enjoy your content!"
        if session.requires_login:
            message = "You've accessed your first free content. Please login or register to continue."
        
        return {
            "session_token": session.session_token,
            "requires_login": session.requires_login,
            "content_accessed_count": session.content_accessed_count,
            "message": message,
            "first_content_was": session.first_content_type if session.content_accessed_count > 1 else None
        }
    
    def check_session_status(self, session_token: str) -> dict:
        """Check if session requires login"""
        session = self.repository.get_by_token(session_token)
        if not session:
            return {
                "exists": False,
                "requires_login": True,
                "message": "Session not found or expired"
            }
        
        return {
            "exists": True,
            "requires_login": session.requires_login,
            "content_accessed_count": session.content_accessed_count,
            "is_active": session.is_active,
            "created_at": session.created_at.isoformat(),
            "message": "Login required" if session.requires_login else "Session active"
        }
    
    def convert_session_to_user(
        self,
        session_token: str,
        user_id: str
    ) -> bool:
        """Convert guest session to authenticated user"""
        session = self.repository.get_by_token(session_token)
        if not session:
            return False
        
        self.repository.convert_to_user(session, user_id)
        return True
    
    def get_statistics(self) -> dict:
        """Get guest session statistics"""
        return self.repository.get_conversion_rate()

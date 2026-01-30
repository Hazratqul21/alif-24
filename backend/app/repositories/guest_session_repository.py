"""
Guest Session Repository - Database operations for guest sessions
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
import uuid

from app.models.guest_session import GuestSession
from app.repositories.base_repository import BaseRepository


class GuestSessionRepository(BaseRepository[GuestSession]):
    """Guest session CRUD operations"""
    
    def __init__(self, db: Session):
        super().__init__(GuestSession, db)
    
    def get_by_token(self, session_token: str) -> Optional[GuestSession]:
        """Get session by token"""
        return self.db.query(GuestSession).filter(
            GuestSession.session_token == session_token,
            GuestSession.is_active == True
        ).first()
    
    def get_by_fingerprint(self, fingerprint: str) -> Optional[GuestSession]:
        """Get active session by browser fingerprint"""
        return self.db.query(GuestSession).filter(
            GuestSession.fingerprint == fingerprint,
            GuestSession.is_active == True
        ).first()
    
    def create_session(
        self,
        session_token: str,
        fingerprint: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> GuestSession:
        """Create new guest session"""
        session = GuestSession(
            session_token=session_token,
            fingerprint=fingerprint,
            ip_address=ip_address,
            content_accessed_count=0,
            is_active=True,
            requires_login=False
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session
    
    def track_content_access(
        self,
        session: GuestSession,
        content_type: str,
        content_id: str
    ) -> GuestSession:
        """Track content access and update login requirement"""
        session.content_accessed_count += 1
        session.last_accessed_at = datetime.utcnow()
        
        # First content - save info
        if session.content_accessed_count == 1:
            session.first_content_type = content_type
            session.first_content_id = content_id
        
        # 2+ content - require login
        if session.content_accessed_count >= 2:
            session.requires_login = True
        
        self.db.commit()
        self.db.refresh(session)
        return session
    
    def convert_to_user(
        self,
        session: GuestSession,
        user_id: uuid.UUID
    ) -> GuestSession:
        """Convert guest session to authenticated user"""
        session.converted_to_user_id = user_id
        session.converted_at = datetime.utcnow()
        session.is_active = False  # Session no longer needed
        self.db.commit()
        self.db.refresh(session)
        return session
    
    def cleanup_old_sessions(self, days: int = 30) -> int:
        """Delete sessions older than specified days"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        deleted = self.db.query(GuestSession).filter(
            GuestSession.created_at < cutoff_date
        ).delete()
        self.db.commit()
        return deleted
    
    def get_active_sessions_count(self) -> int:
        """Get count of active guest sessions"""
        return self.db.query(GuestSession).filter(
            GuestSession.is_active == True
        ).count()
    
    def get_conversion_rate(self) -> dict:
        """Get guest to user conversion statistics"""
        total_sessions = self.db.query(GuestSession).count()
        converted_sessions = self.db.query(GuestSession).filter(
            GuestSession.converted_to_user_id.isnot(None)
        ).count()
        
        conversion_rate = (converted_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        return {
            "total_sessions": total_sessions,
            "converted_sessions": converted_sessions,
            "conversion_rate": round(conversion_rate, 2),
            "active_sessions": self.get_active_sessions_count()
        }

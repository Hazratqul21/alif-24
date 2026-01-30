from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.models.profile import Profile
from app.repositories.base_repository import BaseRepository

class ProfileRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(Profile, db)
    
    def is_nickname_available(self, nickname: str) -> bool:
        """Check if nickname is available"""
        normalized = nickname.strip().lower()
        count = self.db.query(Profile).filter(
            Profile.nickname_normalized == normalized
        ).count()
        return count == 0
    
    def find_by_nickname(self, nickname: str) -> Optional[Profile]:
        """Get profile by nickname"""
        normalized = nickname.strip().lower()
        return self.db.query(Profile).filter(
            Profile.nickname_normalized == normalized
        ).first()
    
    def find_by_user_id(self, user_id: str, include_relations: bool = True):
        """Get all profiles for a user (parent)"""
        query = self.db.query(Profile).filter(
            Profile.user_id == user_id,
            Profile.is_active == True
        ).order_by(Profile.created_at.asc())
        
        return query.all()
    
    def update_last_login(self, profile_id: str):
        """Update last login time"""
        from datetime import datetime
        return self.update(profile_id, {"last_login_at": datetime.utcnow()})
    
    def delete(self, profile_id: str):
        """Delete profile (soft delete by setting is_active = false)"""
        return self.update(profile_id, {"is_active": False})
    
    def generate_nickname_suggestions(self, avatar_key: str, count: int = 5) -> List[str]:
        """Generate suggested nicknames based on avatar"""
        suggestions = []
        base_nickname = avatar_key
        
        # Get existing similar nicknames
        existing_profiles = self.db.query(Profile).filter(
            Profile.nickname.ilike(f"{base_nickname}%")
        ).all()
        
        existing_nicknames = {p.nickname.lower() for p in existing_profiles}
        
        # Generate suggestions
        num = 1
        while len(suggestions) < count and num < 1000:
            suggestion = f"{base_nickname}{str(num).zfill(3)}"
            if suggestion.lower() not in existing_nicknames:
                suggestions.append(suggestion)
            num += 1
        
        return suggestions
    
    def get_profile_stats(self, profile_id: str):
        """Get profile statistics"""
        result = self.db.execute(text("""
            SELECT 
                (SELECT COUNT(*) FROM progress WHERE profile_id = :profile_id AND status = 'completed') as completed_lessons,
                (SELECT COUNT(*) FROM game_sessions WHERE profile_id = :profile_id) as games_played,
                (SELECT COUNT(*) FROM student_achievements WHERE profile_id = :profile_id) as achievements_earned,
                (SELECT COALESCE(SUM(score), 0) FROM game_sessions WHERE profile_id = :profile_id) as total_score
        """), {"profile_id": profile_id})
        
        row = result.fetchone()
        if row:
            return {
                "completed_lessons": row[0] or 0,
                "games_played": row[1] or 0,
                "achievements_earned": row[2] or 0,
                "total_score": row[3] or 0
            }
        return {
            "completed_lessons": 0,
            "games_played": 0,
            "achievements_earned": 0,
            "total_score": 0
        }


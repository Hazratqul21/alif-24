from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models.user import User
from app.repositories.base_repository import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(User, db)
    
    def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email"""
        return self.db.query(User).filter(func.lower(User.email) == email.lower()).first()
    
    def find_by_phone(self, phone: str) -> Optional[User]:
        """Find user by phone"""
        return self.db.query(User).filter(User.phone == phone).first()
    
    def find_by_role(self, role: str):
        """Find users by role"""
        return self.db.query(User).filter(User.role == role).all()
    
    def update_last_login(self, user_id: str):
        """Update user's last login time"""
        from datetime import datetime
        return self.update(user_id, {"last_login_at": datetime.utcnow()})
    
    def update_refresh_token(self, user_id: str, refresh_token: Optional[str]):
        """Update refresh token"""
        return self.update(user_id, {"refresh_token": refresh_token})
    
    def find_by_refresh_token(self, refresh_token: str) -> Optional[User]:
        """Find user by refresh token"""
        return self.find_one({"refresh_token": refresh_token})
    
    def search(self, criteria: dict, page: int = 1, limit: int = 10):
        """Search users"""
        query = self.db.query(User)
        
        if criteria.get("query"):
            search_term = f"%{criteria['query']}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        if criteria.get("role"):
            query = query.filter(User.role == criteria["role"])
        
        if criteria.get("is_active") is not None:
            # Support both status (rbac_models) and is_active fields
            if hasattr(User, 'status'):
                from app.models.rbac_models import AccountStatus
                if criteria["is_active"]:
                    query = query.filter(User.status == AccountStatus.active)
                else:
                    query = query.filter(User.status != AccountStatus.active)
            else:
                query = query.filter(User.is_active == criteria["is_active"])
        
        total = query.count()
        items = query.limit(limit).offset((page - 1) * limit).all()
        
        return {
            "data": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }


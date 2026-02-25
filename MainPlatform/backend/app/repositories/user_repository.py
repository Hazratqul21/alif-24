"""
User Repository - MainPlatform
Uses shared database models
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, select, func

from shared.database.models import User
from .base_repository import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)
    
    async def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email"""
        stmt = select(User).filter(func.lower(User.email) == email.lower())
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def find_by_phone(self, phone: str) -> Optional[User]:
        """Find user by phone"""
        stmt = select(User).filter(User.phone == phone)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def find_by_username(self, username: str) -> Optional[User]:
        """Find user by username (for children)"""
        stmt = select(User).filter(User.username == username)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def find_by_role(self, role: str):
        """Find users by role"""
        stmt = select(User).filter(User.role == role)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def update_last_login(self, user_id: str):
        """Update user's last login time"""
        from datetime import datetime, timezone
        return await self.update(user_id, {"last_login_at": datetime.now(timezone.utc)})
    
    async def update_refresh_token(self, user_id: str, refresh_token: Optional[str]):
        """Update refresh token"""
        return await self.update(user_id, {"refresh_token": refresh_token})
    
    async def find_by_refresh_token(self, refresh_token: str) -> Optional[User]:
        """Find user by refresh token"""
        return await self.find_one({"refresh_token": refresh_token})
    
    async def search(self, criteria: dict, page: int = 1, limit: int = 10):
        """Search users"""
        stmt = select(User)
        
        if criteria.get("query"):
            search_term = f"%{criteria['query']}%"
            stmt = stmt.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        if criteria.get("role"):
            stmt = stmt.filter(User.role == criteria["role"])
        
        if criteria.get("is_active") is not None:
            from shared.database.models import AccountStatus
            if criteria["is_active"]:
                stmt = stmt.filter(User.status == AccountStatus.active)
            else:
                stmt = stmt.filter(User.status != AccountStatus.active)
        
        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()
        
        # Get items
        stmt = stmt.limit(limit).offset((page - 1) * limit)
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        
        return {
            "data": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }

from typing import Optional
from sqlalchemy.orm import Session
from app.models.avatar import Avatar
from app.repositories.base_repository import BaseRepository

class AvatarRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(Avatar, db)
    
    def find_all(self):
        """Get all active avatars"""
        return self.db.query(Avatar).filter(
            Avatar.is_active == True
        ).order_by(Avatar.sort_order.asc(), Avatar.id.asc()).all()
    
    def find_by_key(self, key: str) -> Optional[Avatar]:
        """Get avatar by key"""
        return self.db.query(Avatar).filter(
            Avatar.key == key,
            Avatar.is_active == True
        ).first()


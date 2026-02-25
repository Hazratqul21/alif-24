"""
Base Repository - MainPlatform
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from typing import Optional, List, Dict, Any, Type, TypeVar

T = TypeVar('T')

class BaseRepository:
    """Base repository with common async CRUD operations"""
    
    def __init__(self, model: Type[T], db: AsyncSession):
        self.model = model
        self.db = db
    
    async def find_by_id(self, id: str) -> Optional[T]:
        """Find by ID (8-digit string)"""
        if not id:
            return None
        stmt = select(self.model).filter(self.model.id == id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def find_one(self, filters: Dict[str, Any]) -> Optional[T]:
        """Find one by filters"""
        stmt = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                stmt = stmt.filter(getattr(self.model, key) == value)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def find_all(self, filters: Dict[str, Any] = None) -> List[T]:
        """Find all matching filters"""
        stmt = select(self.model)
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    stmt = stmt.filter(getattr(self.model, key) == value)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def create(self, data: Dict[str, Any]) -> T:
        """Create new record"""
        instance = self.model(**data)
        self.db.add(instance)
        await self.db.flush()
        return instance
    
    async def update(self, id: str, data: Dict[str, Any]) -> Optional[T]:
        """Update record"""
        instance = await self.find_by_id(id)
        if instance:
            for key, value in data.items():
                if hasattr(instance, key):
                    setattr(instance, key, value)
            await self.db.flush()
        return instance
    
    async def delete(self, id: str) -> bool:
        """Delete record"""
        instance = await self.find_by_id(id)
        if instance:
            await self.db.delete(instance)
            await self.db.flush()
            return True
        return False
    
    async def count(self, filters: Dict[str, Any] = None) -> int:
        """Count records"""
        stmt = select(func.count()).select_from(self.model)
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    stmt = stmt.filter(getattr(self.model, key) == value)
        result = await self.db.execute(stmt)
        return result.scalar_one()

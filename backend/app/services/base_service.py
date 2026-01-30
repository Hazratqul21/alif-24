from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.repositories.base_repository import BaseRepository

class BaseService:
    def __init__(self, repository: BaseRepository, db: Session):
        self.repository = repository
        self.db = db
    
    def find_all(self, filters: Optional[Dict[str, Any]] = None, order_by: Optional[List] = None, limit: Optional[int] = None, offset: Optional[int] = None):
        """Find all records"""
        return self.repository.find_all(filters, order_by, limit, offset)
    
    def find_by_id(self, id: str):
        """Find record by ID"""
        return self.repository.find_by_id(id)
    
    def find_one(self, filters: Dict[str, Any]):
        """Find single record by criteria"""
        return self.repository.find_one(filters)
    
    def create(self, data: Dict[str, Any]):
        """Create new record"""
        return self.repository.create(data)
    
    def update(self, id: str, data: Dict[str, Any]):
        """Update record by ID"""
        return self.repository.update(id, data)
    
    def delete(self, id: str) -> bool:
        """Delete record by ID"""
        return self.repository.delete(id)
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records"""
        return self.repository.count(filters)
    
    def find_paginated(self, page: int = 1, limit: int = 10, filters: Optional[Dict[str, Any]] = None, order_by: Optional[List] = None):
        """Find with pagination"""
        return self.repository.find_paginated(page, limit, filters, order_by)


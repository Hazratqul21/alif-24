from typing import Optional, Dict, Any, List, Generic, TypeVar
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.core.database import Base

T = TypeVar('T', bound=Base)

class BaseRepository(Generic[T]):
    def __init__(self, model: type[T], db: Session):
        self.model = model
        self.db = db
    
    def find_all(self, filters: Optional[Dict[str, Any]] = None, order_by: Optional[List] = None, limit: Optional[int] = None, offset: Optional[int] = None):
        """Find all records with optional filtering"""
        query = self.db.query(self.model)
        
        if filters:
            query = query.filter_by(**filters)
        
        if order_by:
            query = query.order_by(*order_by)
        
        if limit:
            query = query.limit(limit)
        
        if offset:
            query = query.offset(offset)
        
        return query.all()
    
    def find_by_id(self, id: str):
        """Find record by primary key"""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def find_one(self, filters: Dict[str, Any]):
        """Find single record by criteria"""
        return self.db.query(self.model).filter_by(**filters).first()
    
    def create(self, data: Dict[str, Any]):
        """Create new record"""
        instance = self.model(**data)
        self.db.add(instance)
        self.db.flush()
        return instance
    
    def update(self, id: str, data: Dict[str, Any]):
        """Update record by ID"""
        instance = self.find_by_id(id)
        if not instance:
            return None
        
        for key, value in data.items():
            setattr(instance, key, value)
        
        self.db.flush()
        return instance
    
    def delete(self, id: str) -> bool:
        """Delete record by ID"""
        instance = self.find_by_id(id)
        if not instance:
            return False
        
        self.db.delete(instance)
        self.db.flush()
        return True
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records"""
        query = self.db.query(self.model)
        if filters:
            query = query.filter_by(**filters)
        return query.count()
    
    def find_paginated(self, page: int = 1, limit: int = 10, filters: Optional[Dict[str, Any]] = None, order_by: Optional[List] = None):
        """Find with pagination"""
        offset = (page - 1) * limit
        
        query = self.db.query(self.model)
        if filters:
            query = query.filter_by(**filters)
        if order_by:
            query = query.order_by(*order_by)
        
        total = query.count()
        items = query.limit(limit).offset(offset).all()
        
        return {
            "data": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }


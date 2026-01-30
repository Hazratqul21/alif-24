from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.services.game_service import GameService
from app.middleware.deps import get_current_active_user
from app.models import User, UserRole

router = APIRouter()

@router.get("/", response_model=dict)
async def get_games(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all games with optional filtering"""
    service = GameService(db)
    filters = {}
    if type:
        filters["type"] = type
    
    games = service.find_all(filters=filters, limit=limit, offset=skip)
    return {"success": True, "data": games}

@router.get("/{game_id}", response_model=dict)
async def get_game(game_id: UUID, db: Session = Depends(get_db)):
    """Get specific game by ID"""
    service = GameService(db)
    game = service.find_by_id(str(game_id))
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"success": True, "data": game}

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_game(
    game_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create new game (Admin only)"""
    if current_user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    service = GameService(db)
    game = service.create(game_data)
    db.commit()
    return {"success": True, "data": game}

@router.put("/{game_id}")
async def update_game(
    game_id: UUID,
    game_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update game (Admin only)"""
    if current_user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    service = GameService(db)
    game = service.update(str(game_id), game_data)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    db.commit()
    return {"success": True, "data": game}

@router.delete("/{game_id}")
async def delete_game(
    game_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete game (Admin only)"""
    if current_user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    service = GameService(db)
    success = service.delete(str(game_id))
    if not success:
        raise HTTPException(status_code=404, detail="Game not found")
    db.commit()
    return {"success": True, "message": "Game deleted"}

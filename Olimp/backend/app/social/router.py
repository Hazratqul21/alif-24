from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from pydantic import BaseModel
from typing import List

from shared.database import get_db
from shared.database.models import User, StudentProfile
from shared.auth import verify_token
from app.social.models import Friendship, FriendshipStatus

router = APIRouter()

# --- Pydantic Schemas ---
class FriendRequestSchema(BaseModel):
    receiver_id: str

class FriendActionSchema(BaseModel):
    friendship_id: str
    action: str  # 'accept' | 'decline' | 'remove'

@router.get("/users/search")
async def search_users(
    q: str = "",
    db: AsyncSession = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    """Search users to add as friends"""
    current_user_id = user_data["user_id"]
    
    if len(q) < 3:
        return {"success": True, "data": []}
        
    stmt = select(User).where(
        User.id != current_user_id,
        User.role == "student",
        or_(
            User.first_name.ilike(f"%{q}%"),
            User.last_name.ilike(f"%{q}%"),
            User.email.ilike(f"%{q}%")
        )
    ).limit(20)
    
    users = (await db.execute(stmt)).scalars().all()
    
    # Get existing friendships to show status in search
    results = []
    for u in users:
        # Check friendship status
        f_stmt = select(Friendship).where(
            or_(
                and_(Friendship.requester_id == current_user_id, Friendship.receiver_id == u.id),
                and_(Friendship.requester_id == u.id, Friendship.receiver_id == current_user_id)
            )
        )
        f = (await db.execute(f_stmt)).scalars().first()
        
        status = "none"
        if f:
            if f.status == FriendshipStatus.accepted:
                status = "friends"
            elif f.status == FriendshipStatus.pending:
                status = "pending_sent" if f.requester_id == current_user_id else "pending_received"
                
        results.append({
            "id": u.id,
            "name": f"{u.first_name} {u.last_name}".strip(),
            "status": status,
            "friendship_id": f.id if f else None
        })
        
    return {"success": True, "data": results}


@router.post("/requests")
async def send_friend_request(
    data: FriendRequestSchema,
    db: AsyncSession = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    current_user_id = user_data["user_id"]
    
    if current_user_id == data.receiver_id:
        raise HTTPException(status_code=400, detail="Siz o'zingizga so'rov yubora olmaysiz")
        
    # Check if a friendship already exists
    f_stmt = select(Friendship).where(
        or_(
            and_(Friendship.requester_id == current_user_id, Friendship.receiver_id == data.receiver_id),
            and_(Friendship.requester_id == data.receiver_id, Friendship.receiver_id == current_user_id)
        )
    )
    existing = (await db.execute(f_stmt)).scalars().first()
    
    if existing:
        if existing.status == FriendshipStatus.accepted:
            raise HTTPException(status_code=400, detail="Allaqachon do'stsiz")
        elif existing.status == FriendshipStatus.pending:
            raise HTTPException(status_code=400, detail="So'rov allaqachon yuborilgan")
        else:
            # If declined, we can potentially resend
            existing.status = FriendshipStatus.pending
            existing.requester_id = current_user_id
            existing.receiver_id = data.receiver_id
            await db.commit()
            return {"success": True, "message": "So'rov qayta yuborildi"}
            
    # Create new
    friendship = Friendship(
        requester_id=current_user_id,
        receiver_id=data.receiver_id,
        status=FriendshipStatus.pending
    )
    db.add(friendship)
    await db.commit()
    return {"success": True, "message": "So'rov yuborildi"}


@router.put("/requests/action")
async def action_friend_request(
    data: FriendActionSchema,
    db: AsyncSession = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    current_user_id = user_data["user_id"]
    
    f_res = await db.execute(select(Friendship).where(Friendship.id == data.friendship_id))
    f = f_res.scalars().first()
    
    if not f:
        raise HTTPException(status_code=404, detail="Topilmadi")
        
    if data.action == 'accept':
        if f.receiver_id != current_user_id:
            raise HTTPException(status_code=403, detail="Siz faqat o'zingizga kelgan so'rovni qabul qila olasiz")
        f.status = FriendshipStatus.accepted
        message = "Qabul qilindi"
    elif data.action == 'decline':
        if f.receiver_id != current_user_id:
            raise HTTPException(status_code=403, detail="Siz faqat o'zingizga kelgan so'rovni rad eta olasiz")
        f.status = FriendshipStatus.declined
        message = "Rad etildi"
    elif data.action == 'remove':
        if current_user_id not in [f.requester_id, f.receiver_id]:
            raise HTTPException(status_code=403, detail="Ruxsat yo'q")
        await db.delete(f)
        message = "Do'stlikdan o'chirildi"
    else:
        raise HTTPException(status_code=400, detail="Noto'g'ri amal")
        
    await db.commit()
    return {"success": True, "message": message}


@router.get("/my-friends")
async def my_friends(
    db: AsyncSession = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    current_user_id = user_data["user_id"]
    
    f_stmt = select(Friendship).where(
        or_(
            Friendship.requester_id == current_user_id,
            Friendship.receiver_id == current_user_id
        )
    )
    friendships = (await db.execute(f_stmt)).scalars().all()
    
    friends = []
    pending_sent = []
    pending_received = []
    
    for f in friendships:
        if f.status == FriendshipStatus.declined:
            continue
            
        other_user_id = f.receiver_id if f.requester_id == current_user_id else f.requester_id
        
        # Get basic info
        u_res = await db.execute(select(User).where(User.id == other_user_id))
        u = u_res.scalars().first()
        if not u: continue
        
        info = {
            "friendship_id": f.id,
            "user_id": u.id,
            "name": f"{u.first_name} {u.last_name}".strip(),
        }
        
        if f.status == FriendshipStatus.accepted:
            # Let's mock score and streak for now or fetch if available
            info["score"] = getattr(u, 'total_score', 0) # Adjust later
            friends.append(info)
        elif f.status == FriendshipStatus.pending:
            if f.requester_id == current_user_id:
                pending_sent.append(info)
            else:
                pending_received.append(info)
                
    return {
        "success": True, 
        "data": {
            "friends": friends,
            "pending_sent": pending_sent,
            "pending_received": pending_received
        }
    }

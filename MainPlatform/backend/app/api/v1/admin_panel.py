"""
Admin Panel Router - /hazratqul, /nurali, /pedagog
Alif24 Platform Super Admin Endpoints

Rollar:
- /hazratqul: Super Admin (barcha huquqlar)
- /nurali: Super Admin (barcha huquqlar — hazratqul bilan bir xil)
- /pedagog: Teacher Admin (kontentlar, darslar, ertaklar)
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, text, select
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import logging
import httpx

from shared.database import get_db
from shared.database.models import (
    User, UserRole, AccountStatus, TeacherStatus,
    StudentProfile, TeacherProfile, ParentProfile,
    ModeratorProfile, OrganizationProfile,
    StudentCoin, CoinTransaction, TelegramUser
)

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(tags=["admin"])

# Admin Secret Keys from environment
ADMIN_KEYS = {
    "hazratqul": os.getenv("ADMIN_HAZRATQUL_KEY", "hazratqul2024"),
    "nurali": os.getenv("ADMIN_NURALI_KEY", "nurali2024"),
    "pedagog": os.getenv("ADMIN_PEDAGOG_KEY", "pedagog2024")
}

# nurali = hazratqul (bir xil huquqlar)
ROLE_PERMISSIONS = {
    "hazratqul": ["all"],
    "nurali": ["all"],  # nurali endi super admin
    "pedagog": ["teachers", "students", "lessons", "content", "view"]
}

# Lessions backend URL for content management
LESSIONS_API = os.getenv("LESSIONS_API_URL", "http://localhost:8006/api/v1")


class AdminAuthError(HTTPException):
    def __init__(self):
        super().__init__(status_code=403, detail="Admin authentication failed")


async def verify_admin(
    x_admin_role: str = Header(..., alias="X-Admin-Role"),
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Verify admin credentials from headers
    X-Admin-Role: hazratqul | nurali | pedagog
    X-Admin-Key: respective secret key
    """
    role = x_admin_role.lower()
    
    if role not in ADMIN_KEYS:
        raise AdminAuthError()
    
    expected_key = ADMIN_KEYS.get(role)
    if not expected_key or x_admin_key != expected_key:
        raise AdminAuthError()
    
    return {"role": role, "permissions": ROLE_PERMISSIONS.get(role, [])}


def has_permission(admin: Dict, perm: str) -> bool:
    """Check if admin has specific permission"""
    return "all" in admin["permissions"] or perm in admin["permissions"]


# ============================================================================
# SCHEMAS
# ============================================================================

class AdminLoginRequest(BaseModel):
    role: str = Field(..., pattern="^(hazratqul|nurali|pedagog)$")
    password: str

class UserCreateRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: str
    last_name: str
    role: str = Field(default="student", pattern="^(student|teacher|parent|moderator|organization)$")
    password: Optional[str] = None

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    role: Optional[str] = None

class TeacherApprovalRequest(BaseModel):
    teacher_id: str
    status: str = Field(..., pattern="^(approved|rejected|pending)$")
    comment: Optional[str] = None

class StatsResponse(BaseModel):
    total_users: int
    total_students: int
    total_teachers: int
    total_parents: int
    active_users: int
    coins_in_circulation: int


# ============================================================================
# ADMIN LOGIN
# ============================================================================

@router.post("/login")
async def admin_login(data: AdminLoginRequest):
    """
    Admin login - parolni tekshiradi, role + key qaytaradi
    Frontend uchun: localStorage'ga saqlash kerak
    """
    role = data.role.lower()
    
    if role not in ADMIN_KEYS:
        raise HTTPException(status_code=401, detail="Noto'g'ri rol")
    
    expected_key = ADMIN_KEYS.get(role)
    if not expected_key or data.password != expected_key:
        raise HTTPException(status_code=401, detail="Parol noto'g'ri")
    
    return {
        "success": True,
        "role": role,
        "key": expected_key,
        "permissions": ROLE_PERMISSIONS.get(role, []),
        "message": f"Xush kelibsiz, {role}!"
    }


# ============================================================================
# DASHBOARD
# ============================================================================

@router.get("/dashboard")
async def admin_dashboard(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin Dashboard Statistics"""
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_students = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.student))).scalar() or 0
    total_teachers = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.teacher))).scalar() or 0
    total_parents = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.parent))).scalar() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.status == AccountStatus.active))).scalar() or 0
    
    coins_result = (await db.execute(select(func.sum(StudentCoin.current_balance)))).scalar()
    coins_in_circulation = int(coins_result) if coins_result else 0
    
    # Pending teachers count
    pending_teachers = 0
    try:
        pending_teachers = (await db.execute(
            select(func.count(TeacherProfile.id)).where(
                TeacherProfile.verification_status == TeacherStatus.pending
            )
        )).scalar() or 0
    except Exception:
        pass
    
    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_parents": total_parents,
        "active_users": active_users,
        "coins_in_circulation": coins_in_circulation,
        "pending_teachers": pending_teachers,
        "admin_role": admin["role"]
    }


# ============================================================================
# USERS MANAGEMENT (CRUD)
# ============================================================================

@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """List users with filters"""
    stmt = select(User).order_by(User.created_at.desc())
    count_stmt = select(func.count(User.id))
    
    if role:
        try:
            user_role = UserRole(role.lower())
            stmt = stmt.where(User.role == user_role)
            count_stmt = count_stmt.where(User.role == user_role)
        except ValueError:
            pass
    
    if status:
        try:
            account_status = AccountStatus(status.lower())
            stmt = stmt.where(User.status == account_status)
            count_stmt = count_stmt.where(User.status == account_status)
        except ValueError:
            pass
    
    if search:
        search_filter = f"%{search}%"
        search_cond = (
            (User.first_name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter)) |
            (User.email.ilike(search_filter)) |
            (User.phone.ilike(search_filter))
        )
        stmt = stmt.where(search_cond)
        count_stmt = count_stmt.where(search_cond)
    
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    users = result.scalars().all()
    
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "phone": u.phone,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "role": u.role.value if u.role else None,
                "status": u.status.value if u.status else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in users
        ]
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed user information"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get role-specific profile
    profile_data = None
    if user.role == UserRole.student:
        res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user_id))
        p = res.scalar_one_or_none()
        if p:
            profile_data = {
                "grade": getattr(p, 'grade', None),
                "school": getattr(p, 'school_name', None),
            }
    elif user.role == UserRole.teacher:
        res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == user_id))
        p = res.scalar_one_or_none()
        if p:
            profile_data = {
                "subject": getattr(p, 'subject', None),
                "school": getattr(p, 'school_name', None),
                "verification_status": p.verification_status.value if p.verification_status else None,
            }
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value if user.role else None,
            "status": user.status.value if user.status else None,
            "language": user.language,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        },
        "profile": profile_data
    }


@router.post("/users")
async def create_user(
    data: UserCreateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user (admin only)"""
    if not has_permission(admin, "users"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    # Check duplicate email
    if data.email:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bu email allaqachon mavjud")
    
    # Check duplicate phone
    if data.phone:
        existing = await db.execute(select(User).where(User.phone == data.phone))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon mavjud")
    
    user = User(
        email=data.email,
        phone=data.phone,
        first_name=data.first_name,
        last_name=data.last_name,
        role=UserRole(data.role),
        status=AccountStatus.active,
    )
    
    if data.password:
        user.set_password(data.password)
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return {"message": "Foydalanuvchi yaratildi", "user_id": user.id}


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    data: UserUpdateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user information"""
    if not has_permission(admin, "users"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if data.first_name:
        user.first_name = data.first_name
    if data.last_name:
        user.last_name = data.last_name
    if data.phone is not None:
        user.phone = data.phone
    if data.email is not None:
        user.email = data.email
    if data.status:
        try:
            user.status = AccountStatus(data.status.lower())
        except ValueError:
            pass
    if data.role:
        try:
            user.role = UserRole(data.role.lower())
        except ValueError:
            pass
    
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "Foydalanuvchi yangilandi", "user_id": user_id}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete user (soft delete)"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin o'chira oladi")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = AccountStatus.deleted
    user.deleted_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "Foydalanuvchi o'chirildi", "user_id": user_id}


# ============================================================================
# TEACHER MANAGEMENT
# ============================================================================

@router.get("/teachers/pending")
async def list_pending_teachers(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """List teachers waiting for approval"""
    if not has_permission(admin, "teachers") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    res = await db.execute(
        select(TeacherProfile).where(TeacherProfile.verification_status == TeacherStatus.pending)
    )
    pending = res.scalars().all()
    
    result = []
    for tp in pending:
        user_res = await db.execute(select(User).where(User.id == tp.user_id))
        user = user_res.scalar_one_or_none()
        if user:
            result.append({
                "user_id": user.id,
                "email": user.email,
                "phone": user.phone,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "status": tp.verification_status.value,
                "created_at": user.created_at.isoformat() if user.created_at else None
            })
    
    return {"count": len(result), "teachers": result}


@router.post("/teachers/approve")
async def approve_teacher(
    data: TeacherApprovalRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Approve or reject teacher"""
    if not has_permission(admin, "teachers") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    res = await db.execute(
        select(TeacherProfile).where(TeacherProfile.user_id == data.teacher_id)
    )
    teacher_profile = res.scalar_one_or_none()
    
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="O'qituvchi profili topilmadi")
    
    if data.status == "approved":
        teacher_profile.verification_status = TeacherStatus.approved
    elif data.status == "rejected":
        teacher_profile.verification_status = TeacherStatus.rejected
    else:
        teacher_profile.verification_status = TeacherStatus.pending
    
    teacher_profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    user_res = await db.execute(select(User).where(User.id == data.teacher_id))
    user = user_res.scalar_one_or_none()
    
    return {
        "message": f"O'qituvchi statusi: {data.status}",
        "teacher_id": data.teacher_id,
        "teacher_name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else None
    }


# ============================================================================
# DATABASE MANAGEMENT - hazratqul & nurali
# ============================================================================

@router.get("/db/tables")
async def list_database_tables(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all database tables"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Super admin only")
    
    result = await db.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """))
    
    tables = [row[0] for row in result]
    
    # Get row counts for each table
    table_info = []
    for t in tables:
        try:
            count_result = await db.execute(text(f'SELECT COUNT(*) FROM "{t}"'))
            count = count_result.scalar() or 0
            table_info.append({"name": t, "rows": count})
        except Exception:
            table_info.append({"name": t, "rows": 0})
    
    return {"tables": table_info}


@router.get("/db/tables/{table_name}")
async def get_table_data(
    table_name: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """View table data"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Super admin only")
    
    try:
        # Get columns
        col_result = await db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = :tbl
            ORDER BY ordinal_position
        """), {"tbl": table_name})
        columns = [{"name": row[0], "type": row[1]} for row in col_result]
        
        if not columns:
            raise HTTPException(status_code=404, detail="Jadval topilmadi")
        
        count_result = await db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
        total = count_result.scalar()
        
        result = await db.execute(
            text(f'SELECT * FROM "{table_name}" ORDER BY 1 DESC LIMIT :lim OFFSET :off'),
            {"lim": limit, "off": offset}
        )
        
        rows = []
        for row in result:
            row_dict = dict(row._mapping)
            # Serialize datetime objects
            for k, v in row_dict.items():
                if isinstance(v, datetime):
                    row_dict[k] = v.isoformat()
            rows.append(row_dict)
        
        return {
            "table": table_name,
            "total": total,
            "columns": columns,
            "rows": rows
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database xatosi: {str(e)}")


@router.put("/db/tables/{table_name}/{row_id}")
async def update_table_row(
    table_name: str,
    row_id: str,
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update a row in a table"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Super admin only")
    
    try:
        # Build SET clause
        set_parts = []
        params = {"row_id": row_id}
        for key, value in data.items():
            if key in ("id", "created_at"):  # Don't allow changing these
                continue
            safe_key = key.replace('"', '')  # prevent SQL injection in key
            set_parts.append(f'"{safe_key}" = :val_{safe_key}')
            params[f"val_{safe_key}"] = value
        
        if not set_parts:
            raise HTTPException(status_code=400, detail="O'zgartirish uchun ma'lumot yo'q")
        
        set_clause = ", ".join(set_parts)
        
        # Find primary key column
        pk_result = await db.execute(text("""
            SELECT column_name FROM information_schema.key_column_usage
            WHERE table_name = :tbl AND constraint_name LIKE '%pkey%'
            LIMIT 1
        """), {"tbl": table_name})
        pk_row = pk_result.first()
        pk_col = pk_row[0] if pk_row else "id"
        
        await db.execute(
            text(f'UPDATE "{table_name}" SET {set_clause} WHERE "{pk_col}" = :row_id'),
            params
        )
        await db.commit()
        
        return {"message": f"Qator yangilandi", "table": table_name, "id": row_id}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database xatosi: {str(e)}")


@router.delete("/db/tables/{table_name}/{row_id}")
async def delete_table_row(
    table_name: str,
    row_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a row from a table"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Super admin only")
    
    try:
        # Find primary key column
        pk_result = await db.execute(text("""
            SELECT column_name FROM information_schema.key_column_usage
            WHERE table_name = :tbl AND constraint_name LIKE '%pkey%'
            LIMIT 1
        """), {"tbl": table_name})
        pk_row = pk_result.first()
        pk_col = pk_row[0] if pk_row else "id"
        
        result = await db.execute(
            text(f'DELETE FROM "{table_name}" WHERE "{pk_col}" = :row_id'),
            {"row_id": row_id}
        )
        await db.commit()
        
        return {"message": "Qator o'chirildi", "table": table_name, "id": row_id}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database xatosi: {str(e)}")


# ============================================================================
# CONTENT MANAGEMENT - pedagog (lessons & ertaklar proxy via Lessions API)
# ============================================================================

@router.get("/content/lessons")
async def list_content_lessons(
    admin: Dict = Depends(verify_admin),
    subject: Optional[str] = None,
    language: Optional[str] = None,
):
    """List lessons (proxy to Lessions backend)"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        params = {}
        if subject:
            params["subject"] = subject
        if language:
            params["language"] = language
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{LESSIONS_API}/lessons", params=params, timeout=10)
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.post("/content/lessons")
async def create_content_lesson(
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
):
    """Create lesson (proxy to Lessions backend)"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{LESSIONS_API}/lessons", json=data, timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.put("/content/lessons/{lesson_id}")
async def update_content_lesson(
    lesson_id: str,
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
):
    """Update lesson"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.put(f"{LESSIONS_API}/lessons/{lesson_id}", json=data, timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.delete("/content/lessons/{lesson_id}")
async def delete_content_lesson(
    lesson_id: str,
    admin: Dict = Depends(verify_admin),
):
    """Delete lesson"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(f"{LESSIONS_API}/lessons/{lesson_id}", timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.get("/content/ertaklar")
async def list_content_ertaklar(
    admin: Dict = Depends(verify_admin),
    language: Optional[str] = None,
    age_group: Optional[str] = None,
):
    """List ertaklar (stories)"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        params = {}
        if language:
            params["language"] = language
        if age_group:
            params["age_group"] = age_group
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{LESSIONS_API}/ertaklar", params=params, timeout=10)
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.post("/content/ertaklar")
async def create_content_ertak(
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
):
    """Create ertak"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{LESSIONS_API}/ertaklar", json=data, timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.delete("/content/ertaklar/{ertak_id}")
async def delete_content_ertak(
    ertak_id: str,
    admin: Dict = Depends(verify_admin),
):
    """Delete ertak"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(f"{LESSIONS_API}/ertaklar/{ertak_id}", timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


# ============================================================================
# TELEGRAM MANAGEMENT
# ============================================================================

@router.get("/telegram/users")
async def list_telegram_users(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """List Telegram-linked users"""
    if not has_permission(admin, "telegram") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    stmt = select(TelegramUser)
    count_stmt = select(func.count(TelegramUser.id))
    
    if search:
        search_filter = f"%{search}%"
        search_cond = (
            (TelegramUser.phone.ilike(search_filter)) |
            (TelegramUser.telegram_username.ilike(search_filter))
        )
        stmt = stmt.where(search_cond)
        count_stmt = count_stmt.where(search_cond)
    
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.limit(limit))
    users = result.scalars().all()
    
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "phone": u.phone,
                "telegram_chat_id": u.telegram_chat_id,
                "telegram_username": u.telegram_username,
                "notifications_enabled": u.notifications_enabled,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ]
    }


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def admin_health():
    """Admin panel health check"""
    return {
        "status": "healthy",
        "roles": list(ADMIN_KEYS.keys()),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

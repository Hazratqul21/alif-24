"""
RBAC Permissions - Role-Based Access Control
Foydalanuvchi rollariga asoslangan ruxsatlar
"""
from functools import wraps
from fastapi import HTTPException, status
from typing import List, Optional
from shared.database.models import UserRole


def has_permission(user_role: UserRole, required_role: UserRole) -> bool:
    """
    Foydalanuvchining ruxsati borligini tekshirish
    
    Role hierarchy (yuqori rol pastroq rollarga ham kirishi mumkin):
    moderator > organization > teacher > parent > student
    
    Args:
        user_role (UserRole): Foydalanuvchi roli
        required_role (UserRole): Talab qilinadigan rol
    
    Returns:
        bool: True agar ruxsat bo'lsa
    
    Example:
        if has_permission(current_user.role, UserRole.teacher):
            # Teacher yoki undan yuqori ruxsat bor
    """
    role_hierarchy = {
        "student": 1,
        "parent": 2,
        "teacher": 3,
        "organization": 4,
        "moderator": 5
    }
    
    user_level = role_hierarchy.get(user_role.value, 0)
    required_level = role_hierarchy.get(required_role.value, 0)
    
    return user_level >= required_level


def has_any_role(user_role: UserRole, allowed_roles: List[UserRole]) -> bool:
    """
    Foydalanuvchi ruxsat etilgan rollardan biriga tegishli ekanligini tekshirish
    
    Args:
        user_role (UserRole): Foydalanuvchi roli
        allowed_roles (List[UserRole]): Ruxsat etilgan rollar ro'yxati
    
    Returns:
        bool: True agar rol ro'yxatda bo'lsa
    
    Example:
        if has_any_role(user.role, [UserRole.teacher, UserRole.organization]):
            # O'qituvchi yoki tashkilot
    """
    return user_role in allowed_roles


def require_role(*allowed_roles: UserRole):
    """
    Decorator: Endpoint'ga faqat ma'lum rollar kirishi mumkin
    
    Args:
        allowed_roles: Ruxsat etilgan rollar
    
    Example:
        @router.get("/teachers-only")
        @require_role(UserRole.teacher, UserRole.organization, UserRole.moderator)
        async def teachers_endpoint():
            return {"message": "Only for teachers"}
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # current_user'ni kwargs'dan olish
            current_user = kwargs.get('current_user')
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not has_any_role(current_user.role, list(allowed_roles)):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def only_student(func):
    """Decorator: Faqat o'quvchilar uchun"""
    return require_role(UserRole.student)(func)


def only_parent(func):
    """Decorator: Faqat ota-onalar uchun"""
    return require_role(UserRole.parent)(func)


def only_teacher(func):
    """Decorator: Faqat o'qituvchilar uchun"""
    return require_role(UserRole.teacher, UserRole.organization, UserRole.moderator)(func)


def only_organization(func):
    """Decorator: Faqat tashkilotlar uchun"""
    return require_role(UserRole.organization, UserRole.moderator)(func)


def only_moderator(func):
    """Decorator: Faqat moderatorlar uchun"""
    return require_role(UserRole.moderator)(func)


# Role-based data filtering

def can_view_student_data(viewer_role: UserRole, viewer_id: str, student_parent_id: Optional[str]) -> bool:
    """
    O'quvchi ma'lumotlarini ko'rish ruxsati
    
    Args:
        viewer_role: Ko'ruvchi roli
        viewer_id: Ko'ruvchi ID
        student_parent_id: O'quvchining ota-onasi ID
    
    Returns:
        bool: True agar ko'rish mumkin bo'lsa
    """
    # Moderator va organization hamma narsani ko'radi
    if viewer_role in [UserRole.moderator, UserRole.organization]:
        return True
    
    # Ota-ona faqat o'z bolalarini ko'radi
    if viewer_role == UserRole.parent:
        return viewer_id == student_parent_id
    
    return False


def can_modify_student_data(modifier_role: UserRole, modifier_id: str, student_parent_id: Optional[str]) -> bool:
    """
    O'quvchi ma'lumotlarini o'zgartirish ruxsati
    """
    # Moderator hamma narsani o'zgartirishi mumkin
    if modifier_role == UserRole.moderator:
        return True
    
    # Ota-ona faqat o'z bolalarini o'zgartiradi
    if modifier_role == UserRole.parent:
        return modifier_id == student_parent_id
    
    return False


__all__ = [
    "has_permission",
    "has_any_role",
    "require_role",
    "only_student",
    "only_parent",
    "only_teacher",
    "only_organization",
    "only_moderator",
    "can_view_student_data",
    "can_modify_student_data"
]

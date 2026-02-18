"""
Shared Auth Package - Umumiy authentication va authorization

Import qilish:
    from shared.auth import create_access_token, verify_token
    from shared.auth import hash_password, verify_password
    from shared.auth import require_role, UserRole
"""

from shared.auth.jwt import (
    create_access_token,
    create_refresh_token,
    verify_token,
    verify_refresh_token
)

from shared.auth.password import (
    hash_password,
    verify_password,
    hash_pin,
    verify_pin
)

from shared.auth.permissions import (
    has_permission,
    has_any_role,
    require_role,
    only_student,
    only_parent,
    only_teacher,
    only_organization,
    only_moderator,
    can_view_student_data,
    can_modify_student_data
)

__all__ = [
    # JWT
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "verify_refresh_token",
    
    # Password
    "hash_password",
    "verify_password",
    "hash_pin",
    "verify_pin",
    
    # Permissions
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

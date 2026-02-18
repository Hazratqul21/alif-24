"""
8-digit ID Generator for Alif24 Platform
UUID o'rniga 8 xonalik raqamli ID ishlatish

Format: 10000000 - 99999999 (8 ta raqam)
"""

import secrets
import string
from sqlalchemy import String, event


def generate_8_digit_id() -> str:
    """
    Generate random 8-digit numeric ID using cryptographically secure random numbers.
    Returns string like "12345678"
    """
    # secrets.randbelow(max) returns a secure random integer in [0, max)
    # To get 8 digits (10000000 to 99999999):
    return str(secrets.randbelow(90000000) + 10000000)


def generate_custom_id(prefix: str = "", length: int = 8) -> str:
    """
    Generate custom ID with prefix using secrets module
    Example: generate_custom_id("USR", 6) -> "USR123456"
    """
    numeric_length = length - len(prefix)
    if numeric_length <= 0:
        return prefix[:length]
    
    min_val = 10 ** (numeric_length - 1)
    max_val = 10 ** numeric_length
    
    # Secure random number
    numeric = secrets.randbelow(max_val - min_val) + min_val
    return f"{prefix}{numeric}"


def generate_pin(length: int = 4) -> str:
    """Bola uchun tasodifiy PIN yaratish"""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_username(first_name: str) -> str:
    """Bola uchun unique username yaratish"""
    random_suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"{first_name.lower()}{random_suffix}"


class IDMixin:
    """
    Mixin class for models using 8-digit ID
    
    Usage:
        class MyModel(Base, IDMixin):
            __tablename__ = "my_table"
            # id column will be auto-created
    """
    pass


def add_8_digit_id_listener(mapper, class_):
    """
    SQLAlchemy event listener to auto-generate 8-digit ID before insert
    """
    from sqlalchemy import Column, String
    from sqlalchemy.orm import attributes
    
    # Check if model has 'id' column
    if not hasattr(class_, '__table__'):
        return
    
    table = class_.__table__
    if 'id' not in table.columns:
        return
    
    id_column = table.columns['id']
    
    # Only for String type ID columns
    if not isinstance(id_column.type, String):
        return
    
    @event.listens_for(class_, 'before_insert')
    def generate_id_before_insert(mapper, connection, target):
        if target.id is None:
            target.id = generate_8_digit_id()


async def generate_unique_id(db_session, model_class, max_attempts: int = 10) -> str:
    """
    Generate unique 8-digit ID checking against database (async)
    
    Args:
        db_session: SQLAlchemy AsyncSession
        model_class: Model class to check uniqueness
        max_attempts: Maximum attempts to find unique ID
        
    Returns:
        Unique 8-digit ID string
        
    Raises:
        RuntimeError: If unique ID cannot be generated
    """
    from sqlalchemy import select as sa_select
    for attempt in range(max_attempts):
        new_id = generate_8_digit_id()
        
        # Check if ID already exists
        result = await db_session.execute(
            sa_select(model_class).where(model_class.id == new_id)
        )
        existing = result.scalar_one_or_none()
        if existing is None:
            return new_id
    
    raise RuntimeError(f"Could not generate unique ID after {max_attempts} attempts")

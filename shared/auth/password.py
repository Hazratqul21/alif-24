"""
Password Hashing - Parolni hash qilish va tekshirish
bcrypt yordamida xavfsiz parol saqlash
"""
import bcrypt


def hash_password(password: str) -> str:
    """
    Parolni hash qilish (bcrypt)
    
    Args:
        password (str): Plain text parol
    
    Returns:
        str: Hash qilingan parol
    
    Example:
        hashed = hash_password("my_password123")
        # user.password_hash = hashed
    """
    # Parolni bytega aylantirish va hash qilish
    password_bytes = password.encode('utf-8')[:72]  # bcrypt 72 byte limit
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Parolni tekshirish
    
    Args:
        plain_password (str): Foydalanuvchi kiritgan parol
        hashed_password (str): Database'dan olingan hash
    
    Returns:
        bool: True agar parol to'g'ri bo'lsa
    
    Example:
        if verify_password(input_password, user.password_hash):
            # Login successful
    """
    try:
        password_bytes = plain_password.encode('utf-8')[:72]
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def hash_pin(pin: str) -> str:
    """
    PIN kod'ni hash qilish (bolalar uchun)
    
    Args:
        pin (str): 4-6 raqamli PIN
    
    Returns:
        str: Hash qilingan PIN
    """
    pin_bytes = pin.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pin_bytes, salt)
    return hashed.decode('utf-8')


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """
    PIN kod'ni tekshirish
    
    Args:
        plain_pin (str): Foydalanuvchi kiritgan PIN
        hashed_pin (str): Database'dan olingan hash
    
    Returns:
        bool: True agar PIN to'g'ri bo'lsa
    """
    try:
        pin_bytes = plain_pin.encode('utf-8')
        hashed_bytes = hashed_pin.encode('utf-8')
        return bcrypt.checkpw(pin_bytes, hashed_bytes)
    except Exception:
        return False


__all__ = [
    "hash_password",
    "verify_password",
    "hash_pin",
    "verify_pin"
]

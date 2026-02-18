# 🔗 Shared - Umumiy Kod va Database

## 📋 Umumiy Ma'lumot

`shared/` papkasi - barcha platformalar uchun umumiy kod, database models va utilities.

---

## 🗂️ Struktura

```
shared/
├── database/
│   ├── models/           # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── student.py
│   │   ├── teacher.py
│   │   ├── organization.py
│   │   └── coins.py
│   ├── migrations/       # Alembic migrations
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   └── versions/
│   ├── base.py          # Base class
│   └── session.py       # Database session
│
├── auth/
│   ├── __init__.py
│   ├── jwt.py           # JWT token functions
│   ├── password.py      # Password hashing
│   └── permissions.py   # RBAC permissions
│
├── payments/
│   ├── __init__.py
│   ├── coin_service.py  # Coin management
│   └── transactions.py  # Transaction history
│
├── notifications/
│   ├── __init__.py
│   ├── telegram.py      # Telegram bot
│   └── email.py         # Email service
│
└── utils/
    ├── __init__.py
    ├── validators.py    # Input validation
    ├── helpers.py       # Helper functions
    └── constants.py     # Global constants
```

---

## 🗄️ Database Models

### Users & Profiles
```python
# shared/database/models/user.py
class User(Base):
    id: UUID
    email: str
    phone: str
    password_hash: str
    username: str
    role: UserRole  # student, parent, teacher, organization, moderator
    status: AccountStatus
    created_at: datetime
```

```python
# shared/database/models/student.py
class StudentProfile(Base):
    id: UUID
    user_id: UUID  # FK -> users
    grade: int
    xp: int
    level: int
    streak_days: int
    total_lessons_completed: int
```

```python
# shared/database/models/teacher.py
class TeacherProfile(Base):
    id: UUID
    user_id: UUID
    organization_id: UUID
    status: TeacherStatus  # pending, approved, rejected
    subjects: List[str]
```

### Coins & Payments
```python
# shared/database/models/coins.py
class StudentCoins(Base):
    id: UUID
    student_id: UUID  # FK -> users
    balance: int
    lifetime_earned: int
    lifetime_spent: int

class CoinTransaction(Base):
    id: UUID
    student_id: UUID
    amount: int  # positive = earned, negative = spent
    source: str  # "lesson", "game", "olympiad", "purchase"
    description: str
    created_at: datetime
```

---

## 🔐 Authentication (shared/auth/)

### JWT Tokens
```python
# shared/auth/jwt.py
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict, expires_delta: timedelta = None):
    """JWT access token yaratish"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    """Token tekshirish"""
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload
```

### Password Hashing
```python
# shared/auth/password.py
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

---

## 💰 Coin System (shared/payments/)

### Coin Service
```python
# shared/payments/coin_service.py
from sqlalchemy.orm import Session
from shared.database.models.coins import StudentCoins, CoinTransaction

def add_coins(db: Session, student_id: UUID, amount: int, source: str, description: str):
    """O'quvchiga coin qo'shish"""
    coins = db.query(StudentCoins).filter_by(student_id=student_id).first()
    if not coins:
        coins = StudentCoins(student_id=student_id, balance=0, lifetime_earned=0)
        db.add(coins)
    
    coins.balance += amount
    coins.lifetime_earned += amount
    
    transaction = CoinTransaction(
        student_id=student_id,
        amount=amount,
        source=source,
        description=description
    )
    db.add(transaction)
    db.commit()
    
    return coins

def deduct_coins(db: Session, student_id: UUID, amount: int, reason: str):
    """Coinlarni kamaytirish"""
    coins = db.query(StudentCoins).filter_by(student_id=student_id).first()
    if not coins or coins.balance < amount:
        raise ValueError("Yetarli coin yo'q")
    
    coins.balance -= amount
    coins.lifetime_spent += amount
    
    transaction = CoinTransaction(
        student_id=student_id,
        amount=-amount,
        source="purchase",
        description=reason
    )
    db.add(transaction)
    db.commit()
    
    return coins
```

---

## 📦 Platformalarda Ishlatish

### Backend'da Import
```python
# Har qanday platforma backend'ida
from shared.database.models import User, StudentProfile, StudentCoins
from shared.auth.jwt import create_access_token, verify_token
from shared.payments.coin_service import add_coins, deduct_coins
from shared.utils.validators import validate_email, validate_phone

# Example: Login endpoint
@router.post("/auth/login")
async def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token}

# Example: Add coins after lesson
@router.post("/lessons/{id}/complete")
async def complete_lesson(id: UUID, user_id: UUID, db: Session = Depends(get_db)):
    # ... lesson logic ...
    add_coins(db, user_id, 50, "lesson", f"Dars {id} tugatildi")
    return {"message": "Lesson completed", "coins_earned": 50}
```

---

## 🔄 Database Migration

### Setup
```bash
cd shared/database/migrations
alembic init .
```

### Yangi Migration Yaratish
```bash
cd shared/database/migrations
alembic revision --autogenerate -m "Add new table"
```

### Migration Qo'llash
```bash
cd shared/database/migrations
alembic upgrade head
```

---

## 🎯 RBAC Permissions

```python
# shared/auth/permissions.py
from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    PARENT = "parent"
    TEACHER = "teacher"
    ORGANIZATION = "organization"
    MODERATOR = "moderator"

def has_permission(user_role: UserRole, required_role: UserRole) -> bool:
    """Foydalanuvchi ruxsatini tekshirish"""
    role_hierarchy = {
        "student": 1,
        "parent": 2,
        "teacher": 3,
        "organization": 4,
        "moderator": 5
    }
    return role_hierarchy[user_role] >= role_hierarchy[required_role]
```

---

## 📊 Database Connection

```python
# shared/database/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/alif24")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 🔗 Environment Variables

Barcha platformalar quyidagi .env'dan foydalanadi:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/alif24

# JWT
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret

# Azure OpenAI
AZURE_OPENAI_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT_NAME=
AZURE_OPENAI_API_VERSION=

# Azure Speech
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Admin
ADMIN_SECRET_KEY=
```

---

## 📝 Best Practices

1. **Har doim shared models'dan foydalaning** - Yangi jadval yaratganizda shared/database/models/ ga qo'shing
2. **Migration'larni shared'da yarating** - Barcha platformalar bir xil schema'dan foydalanadi
3. **Authentication shared'da** - Barcha platformalar bir xil JWT tokendan foydalanadi
4. **Coin tizimi bir biriga bog'liq** - Har qanday platformada coin olsa, boshqa platformada ham ko'rinadi

---

**Oxirgi yangilanish**: 2026-02-14

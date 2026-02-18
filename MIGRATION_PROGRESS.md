# 🎯 Mikroservislar Migratsiyasi - Hozirgi Holat

**Oxirgi yangilanish**: 2026-02-14  
**Holat**: ✅ Shared modullar yaratildi, kodlarni ko'chirish boshlash mumkin

---

## ✅ Bajarilgan Ishlar

### 1. Arxitektura Dizayni ✅
- [x] 8 platformani aniqladik (MainPlatform, Harf, TestAI, CRM, Games, Olimp, Lessions + Gateway)
- [x] Har bir platforma uchun mas'uliyatlarni belgiladik
- [x] Database schema strategiyasini ishlab chiqdik (shared models + platform-specific)
- [x] API Gateway routing sxemasini yaratdik
- [x] [ARCHITECTURE.md](./ARCHITECTURE.md) yaratildi

### 2. Papka Strukturasi ✅
```
alif24-platform/
├── shared/                    ✅ Yaratildi
│   ├── database/
│   │   ├── base.py           ✅
│   │   ├── session.py        ✅
│   │   └── models/           ✅ (user, student, teacher, parent, organization, coin)
│   ├── auth/                 ✅
│   │   ├── jwt.py            ✅
│   │   ├── password.py       ✅
│   │   └── permissions.py    ✅
│   ├── payments/             ✅
│   │   └── coin_service.py   ✅
│   └── README.md             ✅
│
├── MainPlatform/             ✅ Struktura yaratildi
│   ├── backend/              📁 Bo'sh
│   ├── frontend/             📁 Bo'sh
│   └── docs/                 ✅ README.md bor
│
├── Harf/                     ✅ Struktura yaratildi
├── TestAI/                   ✅ Struktura yaratildi
├── CRM/                      ✅ Struktura yaratildi
├── Games/                    ✅ Struktura yaratildi
├── Olimp/                    ✅ Struktura yaratildi
├── Lessions/                 ✅ Struktura yaratildi
│
└── gateway/                  ✅ Struktura yaratildi
    └── nginx.conf            ✅
```

### 3. Shared Database Models ✅

**Yaratilgan modellar**:
- ✅ `user.py` - User, UserRole, AccountStatus, TeacherStatus, ChildRelationship enums
- ✅ `student.py` - StudentProfile
- ✅ `parent.py` - ParentProfile
- ✅ `teacher.py` - TeacherProfile
- ✅ `organization.py` - OrganizationProfile, ModeratorProfile
- ✅ `coin.py` - StudentCoin, CoinTransaction, Prize, PrizeRedemption, CoinWithdrawal

**Funksionallik**:
- SQLAlchemy Base class (shared/database/base.py)
- Database session management (shared/database/session.py)
- Barcha platformalar bir xil database'ga ulanadi
- Coin tizimi barcha platformalarda ishlaydi

### 4. Shared Auth Modullari ✅

**Yaratilgan modullar**:
- ✅ `jwt.py` - JWT token yaratish va tekshirish
  - `create_access_token()` - Access token yaratish
  - `create_refresh_token()` - Refresh token yaratish
  - `verify_token()` - Token tekshirish
  
- ✅ `password.py` - Parol va PIN hash qilish
  - `hash_password()` / `verify_password()` - Parol
  - `hash_pin()` / `verify_pin()` - PIN (bolalar uchun)
  
- ✅ `permissions.py` - RBAC (Role-Based Access Control)
  - `has_permission()` - Ruxsat tekshirish
  - `require_role()` - Decorator: rol talab qilish
  - `only_student()`, `only_teacher()`, etc. - Role-specific decorators

### 5. Shared Payments Moduli ✅

**Yaratilgan funksiyalar**:
- ✅ `get_or_create_coin_balance()` - Balansni olish/yaratish
- ✅ `add_coins()` - Coin qo'shish
- ✅ `deduct_coins()` - Coin ayirish
- ✅ `get_coin_balance()` - Balansni ko'rish
- ✅ `get_transaction_history()` - Tranzaksiya tarixi
- ✅ `reward_lesson_completion()` - Dars uchun coin
- ✅ `reward_game_win()` - O'yin uchun coin
- ✅ `reward_olympiad()` - Olimpiada uchun coin

**Coin qiymatlari**:
```python
COIN_REWARDS = {
    "lesson_complete": 10,
    "game_win": 5,
    "quiz_correct": 2,
    "olympiad_first": 500,
    "olympiad_second": 300,
    "olympiad_third": 100,
    "olympiad_participation": 10
}
```

### 6. Dokumentatsiya ✅

- ✅ [ARCHITECTURE.md](./ARCHITECTURE.md) - To'liq arxitektura tavsifi
- ✅ Har bir platforma uchun README.md
- ✅ [shared/README.md](./shared/README.md) - Shared modullar qo'llanmasi
- ✅ [gateway/nginx.conf](./gateway/nginx.conf) - Nginx konfiguratsiyasi

---

## 🔄 Keyingi Qadamlar

### Phase 1: MainPlatform Migratsiyasi (Eng muhim!)

**Backend migration**:
```bash
# 1. MainPlatform/backend/ strukturasini yaratish
MainPlatform/backend/
├── main.py                    # FastAPI app (shared'dan import)
├── requirements.txt           # Dependencies
└── app/
    ├── api/
    │   └── v1/
    │       ├── auth.py        # alif24/backend/app/api/v1/auth.py'dan
    │       └── dashboard.py   # alif24/backend/app/api/v1/dashboard.py'dan
    ├── smartkids/             # alif24/backend/app/smartkids/ dan ko'chirish
    └── mathkids/              # alif24/backend/app/mathkids/ dan ko'chirish

# 2. Import'larni yangilash
# Eski:
from app.models import User, StudentProfile
from app.core.database import get_db

# Yangi:
from shared.database.models import User, StudentProfile
from shared.database.session import get_db
from shared.auth import create_access_token, verify_password
from shared.payments import add_coins, reward_lesson_completion
```

**Frontend migration**:
```bash
MainPlatform/frontend/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── pages/
    │   ├── HomePage.jsx           # alif24/frontend/src/pages/ dan
    │   ├── StudentDashboard.jsx
    │   ├── ParentDashboard.jsx
    │   ├── SmartKidsAI.jsx
    │   └── MathKidsAI.jsx
    ├── components/
    │   ├── smartkids/
    │   └── mathkids/
    └── context/
        ├── AuthContext.jsx
        └── LanguageContext.jsx
```

### Phase 2: Boshqa Platformalar

**Harf Platform**:
- `alif24/backend/app/harf/` → `Harf/backend/app/`
- `alif24/backend/app/rharf/` → `Harf/backend/app/`
- `alif24/backend/app/eharf/` → `Harf/backend/app/`
- `alif24/frontend/src/harf/` → `Harf/frontend/src/`

**TestAI Platform**:
- `alif24/backend/app/api/v1/testai.py` → `TestAI/backend/app/api/v1/`
- `alif24/frontend/src/pages/TestAIPage.jsx` → `TestAI/frontend/src/pages/`

**CRM Platform**:
- `alif24/backend/app/crm/` → `CRM/backend/app/`
- `alif24/backend/app/organization/` → `CRM/backend/app/`
- `alif24/frontend/src/pages/CRMPage.jsx` → `CRM/frontend/src/pages/`

**Games Platform**:
- `alif24/backend/app/api/v1/games.py` → `Games/backend/app/api/v1/`
- `alif24/frontend/src/lessiongames/` → `Games/frontend/src/`
- `alif24/frontend/src/mathgames/` → `Games/frontend/src/`

**Olimp Platform**:
- `alif24/backend/app/models/olympiad.py` → Use from shared or platform-specific
- `alif24/backend/app/models/live_quiz.py` → ditto
- `alif24/frontend/src/pages/OlympiadPage.jsx` → `Olimp/frontend/src/pages/`
- `alif24/frontend/src/pages/LiveQuizStudent.jsx` → ditto

**Lessions Platform**:
- `alif24/backend/app/api/v1/lessons.py` → `Lessions/backend/app/api/v1/`
- `alif24/backend/app/letters/` → `Lessions/backend/app/`
- `alif24/frontend/src/ertak/` → `Lessions/frontend/src/`

### Phase 3: Testing

**Har bir platformani alohida test qilish**:
```bash
# MainPlatform test
cd MainPlatform/backend
uvicorn main:app --host 0.0.0.0 --port 8000

cd MainPlatform/frontend
npm run dev -- --port 5173

# Harf test
cd Harf/backend
uvicorn main:app --host 0.0.0.0 --port 8001

cd Harf/frontend
npm run dev -- --port 5174
```

**Integration testing**:
- Bir platformada coin yig'ilsa, boshqa platformada ko'rinishi kerak
- Authentication bir platformada bo'lsa, boshqa platformalarda ham ishlashi kerak

### Phase 4: Deployment

**Docker Compose setup**:
```bash
cd j:\alif24-platform
docker-compose up -d
```

**Vercel deployment** (Individual platforms):
- MainPlatform → alif24.uz
- Harf → harf.alif24.uz
- TestAI → testai.alif24.uz
- CRM → crm.alif24.uz
- Games → games.alif24.uz
- Olimp → olimp.alif24.uz
- Lessions → lession.alif24.uz

---

## 📋 Migration Checklist

### Shared Modullar ✅
- [x] Database models yaratildi
- [x] Auth modullar yaratildi
- [x] Payments modullar yaratildi
- [ ] Utils modullar (validators, helpers) - NEXT
- [ ] Notifications modullar (Telegram, Email) - NEXT

### Platform Migration
- [ ] MainPlatform backend
- [ ] MainPlatform frontend
- [ ] Harf backend
- [ ] Harf frontend
- [ ] TestAI backend
- [ ] TestAI frontend
- [ ] CRM backend
- [ ] CRM frontend
- [ ] Games backend
- [ ] Games frontend
- [ ] Olimp backend
- [ ] Olimp frontend
- [ ] Lessions backend
- [ ] Lessions frontend

### Gateway & Infrastructure
- [x] Nginx config yaratildi
- [ ] Docker Compose setup
- [ ] CI/CD pipeline
- [ ] Monitoring setup

---

## 🎯 Keyingi Bosqich: MainPlatform Migration

**Boshlash**:
1. `MainPlatform/backend/main.py` yaratish
2. `alif24/backend/app/api/v1/auth.py` ni ko'chirish va import'larni yangilash
3. SmartKids va MathKids router'larini ko'chirish
4. Test qilish

**Kutilayotgan natija**:
- MainPlatform mustaqil ishlaydi
- Shared modullardan foydalanadi
- Database bir xil (barcha platformalar bilan)
- Coin tizimi ishlaydi

---

**Savol yoki muammolar** bo'lsa, [ARCHITECTURE.md](./ARCHITECTURE.md) ga qarang yoki so'rang!


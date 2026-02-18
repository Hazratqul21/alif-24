# 🏠 MainPlatform - Asosiy Platforma

## 📋 Umumiy Ma'lumot

MainPlatform - Alif24'ning asosiy platformasi bo'lib, foydalanuvchi autentifikatsiyasi, dashboardlar va AI-powered ta'lim modullari (SmartKids, MathKids) joylashgan.

**Domain**: `alif24.uz`

---

## 🎯 Funksiyalar

### Asosiy Sahifalar
- 🏠 **HomePage**: Platformaga kirish sahifasi
- 📖 **AboutUs**: Platforma haqida ma'lumot
- 🤝 **Partners**: Hamkorlar sahifasi

### Authentication
- 🔐 **Login**: Tizimga kirish
- 📝 **Register**: Ro'yxatdan o'tish (Student, Parent, Teacher, Organization)
- 🔄 **Refresh Token**: JWT token yangilash
- 📱 **Phone Verification**: Telegram orqali telefon raqamni tasdiqlash

### Dashboardlar
- 👦 **Student Dashboard**: O'quvchi shaxsiy sahifasi
  - XP, Coins, Streak
  - Lessons progress
  - Achievements
- 👨‍👩‍👧 **Parent Dashboard**: Ota-ona dashboardi
  - Bolalar ro'yxati
  - Har bir bolaning progressi
  - Aktivlik tarixi

### AI Modullari
- 🧠 **SmartKids AI**
  - Generativ hikoyalar (GPT-4)
  - O'qish tahlili (Speech SDK)
  - File upload va matn ekstraktsiyasi
  
- 🧮 **MathKids AI**
  - Matematik masalalarni yechish
  - Qadam-baqadam tushuntirish
  - Rasm orqali masala tanish
  - O'xshash masalalar generatsiyasi

---

## 🗂️ Struktura

```
MainPlatform/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       ├── students.py
│   │   │       ├── profiles.py
│   │   │       └── dashboard.py
│   │   ├── smartkids/
│   │   │   ├── story_router.py
│   │   │   ├── image_reader_router.py
│   │   │   ├── file_reader_router.py
│   │   │   └── speech_token_router.py
│   │   ├── mathkids/
│   │   │   ├── math_solver_router.py
│   │   │   └── math_image_router.py
│   │   └── core/
│   │       ├── config.py
│   │       └── database.py (reference shared)
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── src/
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── AboutPage.jsx
│       │   ├── StudentDashboard.jsx
│       │   ├── ParentDashboard.jsx
│       │   ├── SmartKidsAI.jsx
│       │   └── MathKidsAI.jsx
│       ├── components/
│       │   ├── smartkids/
│       │   ├── mathkids/
│       │   └── Dashboard/
│       └── context/
│           ├── AuthContext.jsx
│           └── LanguageContext.jsx
└── docs/
    └── API.md
```

---

## 🔌 Backend API Endpoints

### Authentication
```
POST   /api/v1/auth/register       # Ro'yxatdan o'tish
POST   /api/v1/auth/login          # Kirish
POST   /api/v1/auth/refresh        # Token yangilash
GET    /api/v1/auth/me             # Joriy foydalanuvchi
POST   /api/v1/verification/send   # Telefon tasdiqlash kodi yuborish
POST   /api/v1/verification/verify # Telefon tasdiqlash
```

### Users & Profiles
```
GET    /api/v1/users/{id}          # Foydalanuvchi ma'lumotlari
PUT    /api/v1/users/{id}          # Ma'lumotlarni yangilash
GET    /api/v1/profiles/{id}       # Profil ma'lumotlari
POST   /api/v1/avatars/             # Avatar yuklash
```

### Dashboard
```
GET    /api/v1/dashboard/student   # O'quvchi dashboardi
GET    /api/v1/dashboard/parent    # Ota-ona dashboardi
GET    /api/v1/students/{id}/stats # O'quvchi statistikasi
```

### SmartKids AI
```
POST   /api/v1/smartkids/generate-story      # Hikoya generatsiya
POST   /api/v1/smartkids/file/read           # Fayl o'qish (PDF, DOCX)
POST   /api/v1/smartkids/analyze-image       # Rasm tahlil
GET    /api/v1/smartkids/speech-token        # Azure Speech token
```

### MathKids AI
```
POST   /api/v1/mathkids/solve                # Masala yechish
POST   /api/v1/mathkids/explain-step         # Qadamni tushuntirish
POST   /api/v1/mathkids/generate-similar     # O'xshash masala
POST   /api/v1/mathkids/extract-from-image   # Rasmdan masala tanish
POST   /api/v1/mathkids/chat                 # Yechim haqida suhbat
```

---

## 🗄️ Database Models (Shared)

MainPlatform quyidagi shared modellardan foydalanadi:

- `users` - Barcha foydalanuvchilar
- `student_profiles` - O'quvchilar profili
- `parent_profiles` - Ota-onalar profili
- `child_relationships` - Ota-ona ↔ Bola bog'lanishi
- `student_coins` - Coin balansi
- `coin_transactions` - Tranzaksiyalar tarixi
- `student_achievements` - Yutuqlar

---

## 🛠️ Texnologiyalar

### Backend
- **Framework**: FastAPI 0.109+
- **Database**: PostgreSQL (Supabase) / SQLite (local dev)
- **ORM**: SQLAlchemy 2.0+
- **Auth**: JWT (python-jose)
- **AI**: Azure OpenAI (GPT-4)
- **Speech**: Azure Speech SDK

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State**: Context API
- **UI**: Tailwind CSS, Lucide Icons
- **HTTP**: Axios

---

## ⚙️ O'rnatish va Ishga Tushirish

### Backend

```bash
cd j:\alif24-platform\MainPlatform\backend

# Virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # Linux/Mac

# Dependencies
pip install -r requirements.txt

# Environment
cp .env.example .env
# .env faylini to'ldiring

# Database migration
alembic upgrade head

# Ishga tushirish
python -m uvicorn main:app --reload --port 8000
```

**Backend ishga tushdi**: http://localhost:8000
**API Docs**: http://localhost:8000/docs

### Frontend

```bash
cd j:\alif24-platform\MainPlatform\frontend

# Dependencies
npm install

# Environment
cp .env.example .env
# VITE_API_URL=http://localhost:8000

# Ishga tushirish
npm run dev
```

**Frontend ishga tushdi**: http://localhost:5173

---

## 🔗 Shared Integration

MainPlatform `shared/` papkasidan quyidagilarni import qiladi:

```python
# Backend
from shared.database.models import User, StudentProfile, ParentProfile
from shared.auth.jwt import create_access_token, verify_token
from shared.payments.coin_service import add_coins, deduct_coins
from shared.utils.validators import validate_phone, validate_email
```

---

## 🚀 Deployment

### Backend Deployment (Vercel)
```bash
cd MainPlatform/backend
vercel --prod
```

### Frontend Deployment (Vercel)
```bash
cd MainPlatform/frontend
npm run build
vercel --prod
```

**Production URL**: `https://alif24.uz`

---

## 📊 Analytics & Monitoring

- **Logs**: Backend loglar `backend.log` faylida
- **Errors**: Sentry integratsiyasi (kelajakda)
- **Usage**: Google Analytics (frontend)

---

## 🔐 Security

- JWT token'lar (access + refresh)
- Password hashing (bcrypt)
- Rate limiting (SlowAPI)
- CORS konfiguratsiyasi
- Admin endpoint'lar secret key bilan himoyalangan

---

## 👨‍💻 Development

### Backend Test
```bash
cd MainPlatform/backend
pytest tests/
```

### Frontend Test
```bash
cd MainPlatform/frontend
npm run test
```

---

## 📝 Migration Notes

Joriy `alif24/` papkasidan MainPlatform'ga migratsiya:

**Backend**:
- `alif24/backend/main.py` → `MainPlatform/backend/main.py`
- `alif24/backend/app/api/v1/auth.py` → `MainPlatform/backend/app/api/v1/auth.py`
- `alif24/backend/app/smartkids/` → `MainPlatform/backend/app/smartkids/`
- `alif24/backend/app/mathkids/` → `MainPlatform/backend/app/mathkids/`

**Frontend**:
- `alif24/frontend/src/pages/HomePage.jsx` → `MainPlatform/frontend/src/pages/HomePage.jsx`
- `alif24/frontend/src/pages/SmartKidsAI.jsx` → `MainPlatform/frontend/src/pages/SmartKidsAI.jsx`
- `alif24/frontend/src/pages/MathKidsAI.jsx` → `MainPlatform/frontend/src/pages/MathKidsAI.jsx`

---

**Oxirgi yangilanish**: 2026-02-14
**Versiya**: 1.0

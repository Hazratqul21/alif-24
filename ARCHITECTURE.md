# 🏗️ Alif24 Platform - Mikroservislar Arxitekturasi

## 📋 Umumiy Ko'rinish

Alif24 platformasi mikroservislar (microservices) arxitekturasida qurilgan bo'lib, har bir platforma mustaqil backend va frontend'ga ega.

```
alif24-platform/
├── shared/                    # Umumiy kod va database
│   ├── database/             # Database models va migrations
│   ├── auth/                 # Authentication & Authorization
│   ├── payments/             # To'lov tizimi (coin, transactions)
│   └── utils/                # Umumiy utilities
│
├── MainPlatform/             # alif24.uz - Asosiy platforma
│   ├── backend/
│   ├── frontend/
│   └── docs/
│
├── Harf/                     # harf.alif24.uz - Til o'rganish
│   ├── backend/
│   ├── frontend/
│   └── docs/
│
├── TestAI/                   # testai.alif24.uz - AI Test generatori
│   ├── backend/
│   ├── frontend/
│   └── docs/
│
├── CRM/                      # crm.alif24.uz - Ta'lim tashkilotlari
│   ├── backend/
│   ├── frontend/
│   └── docs/
│
├── Games/                    # games.alif24.uz - O'yinlar
│   ├── backend/
│   ├── frontend/
│   └── docs/
│
├── Olimp/                    # olimp.alif24.uz - Olimpiadalar
│   ├── backend/
│   ├── frontend/
│   └── docs/
│
├── Lessions/                 # lession.alif24.uz - Darsliklar
│   ├── backend/
│   ├── frontend/
│   └── docs/
│
└── gateway/                  # API Gateway (Nginx/Traefik)
    └── nginx.conf
```

---

## 🎯 Platformalar

### 1. **MainPlatform** (alif24.uz)
**Maqsad**: Asosiy sahifa, autentifikatsiya, o'quvchi va ota-ona dashboardlari

**Funksiyalar**:
- 🏠 HomePage, AboutUs
- 🔐 Authentication (Login, Register)
- 👦 SmartKids AI (Hikoyalar, o'qish tahlili)
- 🧮 MathKids AI (Matematik masalalar)
- 📊 Student Dashboard
- 👨‍👩‍👧 Parent Dashboard

**Backend Endpoints**:
- `/api/v1/auth/*`
- `/api/v1/users/*`
- `/api/v1/students/*`
- `/api/v1/profiles/*`
- `/api/v1/smartkids/*`
- `/api/v1/mathkids/*`
- `/api/v1/dashboard/*`

---

### 2. **Harf** (harf.alif24.uz)
**Maqsad**: Ko'p tilli alifbo o'rganish platformasi

**Funksiyalar**:
- 🇺🇿 O'zbek alifbosi (Harf)
- 🇷🇺 Rus alifbosi (RHarf)
- 🇬🇧 Ingliz alifbosi (EHarf)
- 🇰🇿 Qozoq alifbosi (kelajakda)
- 🇰🇬 Qirg'iz alifbosi (kelajakda)
- 🎤 TTS/STT (Text-to-Speech, Speech-to-Text)

**Backend Endpoints**:
- `/api/v1/harf/*`
- `/api/v1/rharf/*`
- `/api/v1/eharf/*`
- `/api/v1/unified/*` (Multi-language TTS/STT)

---

### 3. **TestAI** (testai.alif24.uz)
**Maqsad**: AI yordamida test generatsiyasi

**Funksiyalar**:
- 🤖 AI Test Generator
- 📝 Quiz Management
- 📊 Test Analytics

**Backend Endpoints**:
- `/api/v1/testai/*`
- `/api/v1/teacher-tests/*`

---

### 4. **CRM** (crm.alif24.uz)
**Maqsad**: Ta'lim tashkilotlari va o'qituvchilar uchun

**Funksiyalar**:
- 🏢 Organization Dashboard
- 👨‍🏫 Teacher Dashboard
- 📋 Lead Management (CRM)
- 🎓 Classroom Management
- 📊 O'quvchilar statistikasi
- ✅ O'qituvchi tasdiqlash

**Backend Endpoints**:
- `/api/v1/crm/*`
- `/api/v1/organization/*`
- `/api/v1/org-dashboard/*`
- `/api/v1/teachers/*`
- `/api/v1/admin/*`

---

### 5. **Games** (games.alif24.uz)
**Maqsad**: Ta'limiy o'yinlar

**Funksiyalar**:
- 🎮 Letter Memory Game
- 🧮 Math Monster Game
- 🎯 Boshqa o'yinlar (kelajakda)

**Backend Endpoints**:
- `/api/v1/games/*`

---

### 6. **Olimp** (olimp.alif24.uz)
**Maqsad**: Olimpiadalar va jonli viktorinalar

**Funksiyalar**:
- 🏆 Olympiad Management
- ⚡ Live Quiz (real-time)
- 🎖️ Leaderboard

**Backend Endpoints**:
- `/api/v1/olympiad/*`
- `/api/v1/live-quiz/*`

---

### 7. **Lessions** (lession.alif24.uz)
**Maqsad**: Darsliklar va o'quv materiallari

**Funksiyalar**:
- 📚 Lesson Management
- 📖 Reading Materials (Ertak)
- 📝 Lesson Builder
- 📊 Student Lesson Progress

**Backend Endpoints**:
- `/api/v1/lessons/*`
- `/api/v1/student-lessons/*`
- `/api/v1/letters/*`

---

## 🔗 Shared Komponentlar

### Database
- **Bir biriga bog'liq**: Barcha platformalar bitta PostgreSQL/Supabase'dan foydalanadi
- **Models**: `shared/database/models/`
- **Migrations**: Alembic yordamida shared migrations

### Authentication
- **JWT Token**: Barcha platformalar uchun umumiy
- **Roles**: Student, Parent, Teacher, Organization, Moderator

### Payments & Coins
- **Coin System**: Barcha platformalarda bir xil coin tizimi
- **Transactions**: Umumiy tranzaksiya jadvali
- **Rewards**: Bolalarni rag'batlantirish tizimi

### Notifications
- Telegram Bot integratsiyasi
- Email notifications

---

## 🌐 Deployment

### Domains
```
alif24.uz           → MainPlatform
harf.alif24.uz      → Harf
testai.alif24.uz    → TestAI
crm.alif24.uz       → CRM
games.alif24.uz     → Games
olimp.alif24.uz     → Olimp
lession.alif24.uz   → Lessions
api.alif24.uz       → API Gateway
```

### Backend Deployment
- Har bir platforma mustaqil deploy qilinadi
- Vercel / Railway / DigitalOcean

### Frontend Deployment
- Vercel / Netlify
- Static hosting

---

## 🔐 API Gateway

Nginx orqali barcha so'rovlar yo'naltiriladi:

```nginx
# MainPlatform
location /api/v1/auth { proxy_pass http://main-backend:8000; }
location /api/v1/smartkids { proxy_pass http://main-backend:8000; }

# Harf
location /api/v1/harf { proxy_pass http://harf-backend:8001; }
location /api/v1/rharf { proxy_pass http://harf-backend:8001; }

# TestAI
location /api/v1/testai { proxy_pass http://testai-backend:8002; }

# CRM
location /api/v1/crm { proxy_pass http://crm-backend:8003; }
location /api/v1/organization { proxy_pass http://crm-backend:8003; }

# Games
location /api/v1/games { proxy_pass http://games-backend:8004; }

# Olimp
location /api/v1/olympiad { proxy_pass http://olimp-backend:8005; }
location /api/v1/live-quiz { proxy_pass http://olimp-backend:8005; }

# Lessions
location /api/v1/lessons { proxy_pass http://lessions-backend:8006; }
location /api/v1/letters { proxy_pass http://lessions-backend:8006; }
```

---

## 📊 Database Schema

### Users va Authentication (shared)
- `users`
- `student_profiles`
- `teacher_profiles`
- `parent_profiles`
- `organization_profiles`

### Coins va Payments (shared)
- `student_coins`
- `coin_transactions`
- `coin_withdrawals`
- `prizes`
- `prize_redemptions`

### Platformaga xos jadvallar
Har bir platforma o'z jadvallariga ega, lekin `users` jadvalidan foreign key orqali bog'langan.

---

## 🚀 Migration Strategiyasi

### Pha 1: Strukturani yaratish ✅
- Papkalar yaratish
- README va docs yozish

### Phase 2: Shared kodlarni ajratish
- Database models → `shared/database/`
- Auth logic → `shared/auth/`
- Utils → `shared/utils/`

### Phase 3: Platformalarni ajratish
- Har bir platforma kodini alohida papkalarga ko'chirish
- Backend va frontend ajratish

### Phase 4: API Gateway sozlash
- Nginx konfiguratsiyasi
- Domain routing

### Phase 5: Testing va Deploy
- Har bir platformani alohida test qilish
- Subdomain'larga deploy qilish

---

## 🎯 Afzalliklar

✅ **Mustaqillik**: Har bir platforma alohida ishlaydi va deploy qilinadi
✅ **Scalability**: Faqat kerakli platformani scale qilish mumkin
✅ **Maintenance**: Bir platformadagi xato boshqalarga ta'sir qilmaydi
✅ **Team Work**: Turli jamoalar turli platformalarda parallel ishlashi mumkin
✅ **Shared Resources**: Database va auth umumiy, integratsiya oson

---

## 📝 Keyingi Qadamlar

1. ✅ Arxitektura hujjatini yaratish
2. ⏳ Shared papkalarni yaratish
3. ⏳ Har bir platformani alohida papkalarga ajratish
4. ⏳ Database migration'larni shared'ga ko'chirish
5. ⏳ API Gateway sozlash
6. ⏳ Har bir platformani test qilish
7. ⏳ Deployment strategiyasini amalga oshirish

---

**Yaratilgan sana**: 2026-02-14
**Versiya**: 1.0
**Muallif**: Alif24 Platform Team

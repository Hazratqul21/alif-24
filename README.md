# 🎓 Alif24 Platform - Microservices Architecture

**O'zbekiston ta'lim platformasi** - 7 ta microservice, yagona ma'lumotlar bazasi

[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docker.com)

---

## 📋 Loyiha Tuzilishi

```
alif24-platform/
├── MainPlatform/          # Asosiy platforma (Auth, SmartKids, MathKids)
├── Harf/                  # Kiritish dasturi (Harf o'rganish)
├── TestAI/                # Test tizimi
├── CRM/                   # O'quv markazlar boshqaruvi
├── Games/                 # O'yinlar platformasi
├── Olimp/                 # Olimpiadalar tizimi
├── Lessions/              # Darslar boshqaruvi
├── shared/                # Umumiy modullar
│   ├── database/          # 8-digit ID modellar
│   ├── auth/              # JWT autentifikatsiya
│   └── services/          # Notification, Speech
└── docker/                # Deployment konfiguratsiya
```

---

## 🚀 Tez Ishga Tushirish

### 1. Muhit O'zgaruvchanlari

```bash
cp .env.production.example .env
# .env faylini tahrirlang
```

### 2. Docker Compose

```bash
# Barcha servicelarni ishga tushirish
docker-compose up -d

# Loglarni ko'rish
docker-compose logs -f

# Ma'lumotlar bazasini ishga tushirish
docker-compose up -d postgres redis
```

### 3. Ma'lumotlar Bazasi Migratsiyasi

```bash
cd MainPlatform/backend

# Alembic orqali migratsiya
alembic upgrade head

# Yoki Python skript orqali
python -c "from shared.database import init_db; init_db()"
```

---

## 🏗️ Arxitektura

### Microservices

| Service | Port | Tavsif |
|---------|------|--------|
| MainPlatform | 8000 | Auth, SmartKids AI, MathKids AI |
| Harf | 8001 | Kiritish dasturi |
| TestAI | 8002 | Test tizimi |
| CRM | 8003 | O'quv markazlar boshqaruvi |
| Games | 8004 | O'yinlar |
| Olimp | 8005 | Olimpiadalar |
| Lessions | 8006 | Darslar |

### 8-Digit ID Tizimi

Barcha jadvallar 8 xonalik string ID ishlatadi:

```python
from shared.database.id_generator import generate_8_digit_id

user_id = generate_8_digit_id()  # "12345678"
```

### Ma'lumotlar Bazasi Modellar

| Model | Tavsif |
|-------|--------|
| **User** | Foydalanuvchilar (student, teacher, parent, organization, moderator) |
| **StudentProfile** | O'quvchi profili |
| **TeacherProfile** | O'qituvchi profili |
| **ParentProfile** | Ota-ona profili |
| **OrganizationProfile** | O'quv markazi profili |
| **PhoneVerification** | Telefon raqam tasdiqlash |
| **TelegramUser** | Telegram bot integratsiyasi |
| **StudentCoin** | Tanga tizimi |
| **CoinTransaction** | Tanga tranzaksiyalari |
| **Achievement** | Yutuqlar tizimi |
| **Avatar** | Avatarlar |
| **Olympiad** | Olimpiada tizimi |
| **Game** | O'yinlar |
| **Quiz** | Viktorinalar |
| **Subject** | Fanlar |

---

## 🔧 Ishlab Chiqish

### Lokal Ishga Tushirish

```bash
# Postgres va Redis
docker-compose up -d postgres redis

# MainPlatform (alohida terminal)
cd MainPlatform/backend
pip install -r requirements.txt
python -c "from shared.database import init_db; init_db()"
uvicorn main:app --reload --port 8000

# MainPlatform Frontend (alohida terminal)
cd MainPlatform/frontend
npm install
npm run dev
```

### Telegram Bot

```bash
# Bot ni ishga tushirish (main.py ichida)
python -c "from shared.services.telegram_bot_service import TelegramBotService; TelegramBotService().start()"
```

---

## 🔐 Admin Panel

| Endpoint | Kalit | Huquqlar |
|----------|-------|----------|
| `/admin/hazratqul` | ADMIN_HAZRATQUL_KEY | Super Admin |
| `/admin/nurali` | ADMIN_NURALI_KEY | Moderator |
| `/admin/pedagog` | ADMIN_PEDAGOG_KEY | Teacher Admin |

```bash
curl -H "X-Admin-Key: your-key" http://localhost/api/v1/admin/hazratqul/users
```

---

## 📝 API Hujjatlari

| Platform | URL |
|----------|-----|
| MainPlatform | http://localhost:8000/api/v1/docs |
| Health Check | http://localhost:8000/api/v1/health |

---

## 🧪 Test

```bash
# Shared modullarni test qilish
python test_shared.py

# Barcha servicelarni test qilish
cd MainPlatform/backend
pytest
```

---

## 🐳 Docker

```bash
# Barcha servicelarni qurish
docker-compose build

# Bitta serviceni yangilash
docker-compose up -d --build main-backend

# Loglarni ko'rish
docker-compose logs -f main-backend

# To'xtatish
docker-compose down

# To'liq tozalash (ma'lumotlar bilan)
docker-compose down -v
```

---

## 🗄️ Ma'lumotlar Bazasi

### Connection String

```
postgresql://postgres:password@localhost:5432/alif24
```

### Migratsiyalar

```bash
# Yangi migratsiya yaratish
cd MainPlatform/backend
alembic revision --autogenerate -m "description"

# Migratsiyani qo'llash
alembic upgrade head

# Orqaga qaytish
alembic downgrade -1
```

---

## 📚 Xizmatlar

| Xizmat | Fayl | Tavsif |
|--------|------|--------|
| **Auth** | `shared/auth/` | JWT autentifikatsiya |
| **Database** | `shared/database/` | SQLAlchemy modellar |
| **Notification** | `shared/services/notification_service.py` | SMS, Email, Telegram |
| **Speech** | `shared/services/azure_speech_service.py` | Azure TTS/STT |
| **Telegram Bot** | `shared/services/telegram_bot_service.py` | Telegram integratsiya |

---

## 🌐 Subdomenlar

| Subdomen | Platform |
|----------|----------|
| alif24.uz | MainPlatform |
| harf.alif24.uz | Harf |
| testai.alif24.uz | TestAI |
| crm.alif24.uz | CRM |
| games.alif24.uz | Games |
| olimp.alif24.uz | Olimp |
| lessions.alif24.uz | Lessions |
| api.alif24.uz | Unified API Gateway |

---

## ⚡ Tez Malumotlar

- **ID Tizimi**: 8 xonalik string (masalan: `12345678`)
- **Autentifikatsiya**: JWT tokens
- **Ma'lumotlar Bazasi**: PostgreSQL 15
- **Kesh**: Redis
- **Reverse Proxy**: Nginx
- **Container**: Docker + Docker Compose

---

## 🆘 Yordam

**Muammo yuzaga kelganda:**

1. Loglarni tekshiring: `docker-compose logs -f`
2. Health check: `curl http://localhost/api/v1/health`
3. Ma'lumotlar bazasi: `docker-compose exec postgres psql -U postgres -d alif24`

---

**Loyiha**: Alif24 Platform  
**Versiya**: 2.0.0 (8-digit ID)  
**Oxirgi yangilanish**: 2026-02-17

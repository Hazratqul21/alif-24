# Alif24 Platform - Ishga Tushirish Qo'llanmasi

## 🚀 Barcha Platformalarni Ishga Tushirish

```bash
python start_all.py
```

Bu quyidagi platformalarni ishga tushiradi:
- **MainPlatform** (Port 8000) - Asosiy platforma
- **Harf** (Port 8001) - Harf o'rganish
- **TestAI** (Port 8002) - Test va olimpiadalar
- **CRM** (Port 8003) - O'qituvchilar paneli
- **Games** (Port 8004) - O'yinlar

## 🔧 Development Mode (Alohida Platform)

Bitta platformani hot-reload bilan ishga tushirish:

```bash
python dev.py testai    # Faqat TestAI
python dev.py harf      # Faqat Harf
python dev.py crm       # Faqat CRM
python dev.py games     # Faqat Games
python dev.py main      # Faqat MainPlatform
```

**Afzalligi**: Boshqa platformalar ishlashda davom etadi. Siz faqat bitta platformada o'zgartirish kiritib test qilasiz.

## 📋 Platformalar Ro'yxati

```bash
python start_all.py --list
```

## ⚙️ Maxsus Sozlamalar

### Faqat MainPlatform
```bash
python start_all.py --main
```

### Tanlangan platformalar
```bash
python start_all.py --only main harf testai
```

### Ayrim platformalarsiz
```bash
python start_all.py --exclude games crm
```

## 🌐 URL'lar

| Platform | Backend | Frontend | Docs |
|----------|---------|----------|------|
| MainPlatform | http://localhost:8000 | http://localhost:5173 | http://localhost:8000/docs |
| Harf | http://localhost:8001 | http://localhost:5174 | http://localhost:8001/docs |
| TestAI | http://localhost:8002 | http://localhost:5175 | http://localhost:8002/docs |
| CRM | http://localhost:8003 | http://localhost:5176 | http://localhost:8003/docs |
| Games | http://localhost:8004 | http://localhost:5177 | http://localhost:8004/docs |

## 🛠️ Development Workflow

### 1. Barcha platformalarni ishga tushirish
```bash
# Terminal 1
python start_all.py
```

### 2. TestAI ustida ishlash (alohida terminal)
```bash
# Terminal 2 - TestAI uchun dev mode
python dev.py testai
```

Bu holatda:
- MainPlatform, Harf, CRM, Games - avvalgidek ishlaydi (start_all.py)
- TestAI - dev mode da, hot-reload bilan

### 3. Frontend ishga tushirish
```bash
# Terminal 3 - Kerakli frontend
cd MainPlatform/frontend && npm run dev
# yoki
cd TestAI/frontend && npm run dev
```

## 🔄 To'xtatish

- `Ctrl+C` - Barcha platformalarni to'xtatadi

## 📁 Tuzilma

```
alif24-platform/
├── start_all.py          # Barcha platformalar orchestrator
├── dev.py                # Development helper
├── shared/               # Umumiy modullar (database, auth, payments)
├── MainPlatform/         # Asosiy platforma
│   ├── backend/
│   │   └── main.py       # Port 8000
│   └── frontend/
├── Harf/                 # Harf o'rganish
│   ├── backend/
│   │   └── main.py       # Port 8001
│   └── frontend/
├── TestAI/               # Test va olimpiadalar
│   ├── backend/
│   │   └── main.py       # Port 8002
│   └── frontend/
├── CRM/                  # O'qituvchilar
│   ├── backend/
│   │   └── main.py       # Port 8003
│   └── frontend/
└── Games/                # O'yinlar
    ├── backend/
    │   └── main.py       # Port 8004
    └── frontend/
```

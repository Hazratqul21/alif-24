# 📝 Harf Platform - Ko'p Tilli Alifbo O'rganish

## 📋 Umumiy Ma'lumot

Harf platformasi - ko'p tilli alifbo o'rganish tizimi. O'zbek, rus, ingliz va boshqa tillardagi alifbolarni o'rganish uchun interaktiv platforma.

**Domain**: `harf.alif24.uz`

---

## 🎯 Funksiyalar

### Til Modullari
- 🇺🇿 **Harf** - O'zbek alifbosi (33 harf + sonlar)
- 🇷🇺 **RHarf** - Rus alifbosi (33 harf)
- 🇬🇧 **EHarf** - Ingliz alifbosi (26 harf)
- 🇰🇿 **QHarf** - Qozoq alifbosi (kelajakda)
- 🇰🇬 **KHarf** - Qirg'iz alifbosi (kelajakda)

### Interaktiv O'rganish
- 🔊 **Text-to-Speech (TTS)**: Harflarni eshitish
- 🎤 **Speech-to-Text (STT)**: O'qish tahlili
- 🖼️ **Vizual Namunalar**: Har bir harf uchun rasmlar
- ⭐ **Yutuqlar**: Coin va XP yig'ish
- 🎮 **Gamifikatsiya**: O'yin elementlari

---

## 🗂️ Struktura

```
Harf/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── app/
│   │   ├── harf/
│   │   │   └── router.py
│   │   ├── rharf/
│   │   │   └── router.py
│   │   ├── eharf/
│   │   │   └── router.py
│   │   └── unified/
│   │       └── router.py  (Multi-language TTS/STT)
│   └── tests/
├── frontend/
│   ├── package.json
│   └── src/
│       ├── harf/
│       │   ├── Harf.jsx
│       │   └── HarfModal.jsx
│       ├── rharf/
│       │   ├── Harfr.jsx
│       │   └── HarfrModal.jsx
│       └── eharf/
│           ├── Eharf.jsx
│           └── EharfModal.jsx
└── docs/
    └── LANGUAGES.md
```

---

## 🔌 Backend API Endpoints

### O'zbek Alifbosi
```
GET    /api/v1/harf/letters        # Barcha harflar ro'yxati
POST   /api/v1/harf/tts            # Text-to-Speech
POST   /api/v1/harf/stt            # Speech-to-Text
POST   /api/v1/harf/practice       # Amaliyot natijalari saqlash
```

### Rus Alifbosi
```
GET    /api/v1/rharf/letters
POST   /api/v1/rharf/tts
POST   /api/v1/rharf/stt
```

### Ingliz Alifbosi
```
GET    /api/v1/eharf/letters
POST   /api/v1/eharf/tts
POST   /api/v1/eharf/stt
```

### Unified (Multi-language)
```
POST   /api/v1/unified/tts         # Har qanday tilda TTS
POST   /api/v1/unified/stt         # Har qanday tilda STT
GET    /api/v1/unified/languages   # Qo'llab-quvvatlanadigan tillar
```

---

## 🗄️ Database Models

Harf platformasi quyidagi jadvallardan foydalanadi:

**Shared**:
- `users` - Foydalanuvchilar
- `student_coins` - Coin tizimi

**Platform-specific**:
- `harf_progress` - O'zbek alifbosi progressi
- `rharf_progress` - Rus alifbosi progressi
- `eharf_progress` - Ingliz alifbosi progressi
- `speech_recordings` - Audio yozuvlar

---

## 🛠️ Texnologiyalar

### Backend
- FastAPI
- Azure Speech SDK (TTS/STT)
- Azure Cognitive Services

### Frontend
- React
- Audio Recording API
- Tailwind CSS

---

## ⚙️ O'rnatish

### Backend
```bash
cd Harf/backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# .env
AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=eastus

python -m uvicorn main:app --reload --port 8001
```

### Frontend
```bash
cd Harf/frontend
npm install
npm run dev
```

---

## 🌐 Yangi Til Qo'shish

1. **Backend Router Yaratish**
```python
# app/qharf/router.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/letters")
async def get_qharf_letters():
    return [
        {"letter": "Ә", "name": "Ә", "example": "Әке"}
    ]
```

2. **Frontend Komponent Yaratish**
```jsx
// src/qharf/Qharf.jsx
const items = [
  { label: "Ә ә", image: "👨", examples: ["Әке"] }
];
```

3. **Router Qo'shish**
```python
# main.py
from app.qharf import router as qharf_router
app.include_router(qharf_router, prefix="/api/v1/qharf")
```

---

## 📊 Coin Integratsiyasi

Har bir to'g'ri amaliyot uchun:
- ✅ To'g'ri talaffuz: +10 coin
- ⭐ 100% aniqlik: +20 coin
- 🎯 Harf to'plamini yakunlash: +50 coin

---

## 🚀 Deployment

**Production**: `https://harf.alif24.uz`

```bash
cd Harf/backend
vercel --prod

cd Harf/frontend
npm run build
vercel --prod
```

---

**Oxirgi yangilanish**: 2026-02-14

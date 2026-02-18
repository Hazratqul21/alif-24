# 🤖 TestAI Platform - AI Test Generatori

## 📋 Umumiy Ma'lumot

TestAI - sun'iy intellekt yordamida test va quiz yaratish platformasi. O'qituvchilar uchun vaqtni tejovchi automatik test generatori.

**Domain**: `testai.alif24.uz`

---

## 🎯 Funksiyalar

- 📝 **AI Test Generator**: Matndan avtomatik test yaratish
- 🎯 **Quiz Management**: Test yaratish, tahrirlash, o'chirish
- 📊 **Analytics**: Test natijalari statistikasi
- 👨‍🏫 **O'qituvchi Dashboard**: Barcha testlarni boshqarish
- 👦 **O'quvchi Interface**: Test topshirish

---

## 🔌 API Endpoints

```
POST   /api/v1/testai/generate       # AI orqali test generatsiya
GET    /api/v1/testai/quizzes        # Barcha testlar
POST   /api/v1/testai/quizzes        # Yangi test yaratish
GET    /api/v1/testai/quizzes/{id}   # Test ma'lumotlari
PUT    /api/v1/testai/quizzes/{id}   # Testni tahrirlash
DELETE /api/v1/testai/quizzes/{id}   # Testni o'chirish
POST   /api/v1/testai/submit         # Test topshirish
GET    /api/v1/testai/results/{id}   # Natijalar
```

---

## 🗄️ Database Models

- `quizzes` - Testlar
- `quiz_questions` - Savollar
- `quiz_attempts` - Topshirishlar
- `quiz_answers` - Javoblar

---

## ⚙️ Texnologiyalar

- Backend: FastAPI + Azure OpenAI (GPT-4)
- Frontend: React + Tailwind

---

**Domain**: `https://testai.alif24.uz`

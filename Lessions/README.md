# 📚 Lessions Platform - Darsliklar va Materiallar

## 📋 Umumiy Ma'lumot

Lessions - darsliklar, o'quv materiallari va hikoyalar platformasi.

**Domain**: `lession.alif24.uz`

---

## 🎯 Funksiyalar

### Lesson Management
- 📖 Darsliklar yaratish
- 📝 Lesson Builder
- 📊 O'quvchi progressi
- ✅ Baholash tizimi

### Reading Materials (Ertak)
- 📚 Bolalar hikoyalari
- 🎤 Audio hikoyalar
- 📖 O'qish platformasi (mobile-friendly)
- 🌟 Interaktiv elementlar

### Letters Module
- 📝 Harf o'rganish materiallari
- 🔊 Audio-vizual darslar

---

## 🔌 API Endpoints

```
GET    /api/v1/lessons/list
POST   /api/v1/lessons/create
GET    /api/v1/lessons/{id}
PUT    /api/v1/lessons/{id}
POST   /api/v1/student-lessons/start
POST   /api/v1/student-lessons/complete
GET    /api/v1/letters/stories
POST   /api/v1/letters/text-to-speech
```

---

## 🗄️ Database Models

- `lessons` - Darsliklar
- `lesson_content` - Dars tarkibi
- `student_lesson_progress` - O'quvchi progressi
- `stories` - Hikoyalar
- `story_readings` - O'qish tarixi

---

**Domain**: `https://lession.alif24.uz`

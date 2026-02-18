# 🏆 Olimp Platform - Olimpiadalar va Live Quiz

## 📋 Umumiy Ma'lumot

Olimp - olimpiadalar va jonli viktorinalar platformasi.

**Domain**: `olimp.alif24.uz`

---

## 🎯 Funksiyalar

### Olympiad
- 🏆 Olimpiadalar yaratish va boshqarish
- 📝 O'quvchilar ishtirok etishi
- 🎖️ Natijalar va medal'lar
- 📊 Leaderboard

### Live Quiz
- ⚡ Real-time viktorinalar
- 👥 Ko'p ishtirokchilar
- 🎯 Tezkorlik bilan javob berish
- 🏅 Jonli reytinglar

---

## 🔌 API Endpoints

### Olympiad
```
GET    /api/v1/olympiad/list
POST   /api/v1/olympiad/create
POST   /api/v1/olympiad/{id}/participate
GET    /api/v1/olympiad/{id}/leaderboard
```

### Live Quiz
```
POST   /api/v1/live-quiz/create
POST   /api/v1/live-quiz/{code}/join
POST   /api/v1/live-quiz/{id}/submit-answer
GET    /api/v1/live-quiz/{id}/results
```

---

## 🗄️ Database Models

- `olympiads` - Olimpiadalar
- `olympiad_participants` - Ishtirokchilar
- `olympiad_questions` - Savollar
- `live_quizzes` - Jonli viktorinalar
- `live_quiz_participants` - Ishtirokchilar
- `live_quiz_answers` - Javoblar

---

**Domain**: `https://olimp.alif24.uz`

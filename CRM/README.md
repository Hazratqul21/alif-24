# 🏢 CRM Platform - Ta'lim Tashkilotlari Boshqaruvi

## 📋 Umumiy Ma'lumot

CRM - ta'lim tashkilotlari, o'qituvchilar va boshqaruv uchun CRM tizimi.

**Domain**: `crm.alif24.uz`

---

## 🎯 Funksiyalar

### Organization Dashboard
- 📊 Statistika (o'quvchilar, o'qituvchilar, darslar)
- 👨‍🏫 O'qituvchilarni tasdiqlash
- 📚 Materiallar boshqaruvi
- 💰 To'lovlar va obunalar

### Teacher Dashboard
- 🎓 Sinflar boshqaruvi
- 👦 O'quvchilar ro'yxati
- 📝 Vazifalar berish
- 📊 Progress monitoring

### CRM (Lead Management)
- 🎯 Lead'larni boshqarish
- 📞 Aktivliklar tarixi
- 📧 Email/SMS kampaniyalari
- 📈 Konversiya statistikasi

---

## 🔌 API Endpoints

### Organization
```
GET    /api/v1/org-dashboard/stats
GET    /api/v1/org-dashboard/teachers
POST   /api/v1/organization/approve-teacher/{id}
GET    /api/v1/organization/materials
```

### Teachers
```
GET    /api/v1/teachers/classrooms
POST   /api/v1/teachers/classrooms
GET    /api/v1/teachers/students
POST   /api/v1/teachers/assign-homework
```

### CRM
```
GET    /api/v1/crm/leads
POST   /api/v1/crm/leads
PUT    /api/v1/crm/leads/{id}
POST   /api/v1/crm/activities
GET    /api/v1/crm/pipeline
```

---

## 🗄️ Database Models

**Shared**:
- `users`, `organization_profiles`, `teacher_profiles`

**CRM-specific**:
- `leads` - Potentsial mijozlar
- `activities` - Aktivliklar
- `campaigns` - Marketing kampaniyalari
- `classrooms` - Sinflar
- `homework_assignments` - Vazifalar

---

**Domain**: `https://crm.alif24.uz`

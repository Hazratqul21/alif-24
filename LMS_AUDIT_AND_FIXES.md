# ALIF24 LMS — TO'LIQ AUDIT VA TUZATISHLAR

**Sana:** 2026-02-22 (yangilangan)
**Status:** 17 ta bug topildi va tuzatildi

---

## MUAMMO #1: StudentDashboard — LMS data fetch YO'Q

**Fayl:** `MainPlatform/frontend/src/pages/StudentDashboard.jsx` (46-68 qatorlar)

**Muammo:** `classrooms`, `invitations`, `assignments` state'lari bor (36-42), lekin ularni backenddan fetch qiladigan useEffect **yo'q**. Faqat eski dashboard va coin fetch bor.

**Yechim:** Mavjud useEffect ichiga LMS data fetch qo'shish + handler funksiyalar + notification polling.

### Prompt #1
```
MainPlatform/frontend/src/pages/StudentDashboard.jsx faylida 46-68 qatorlardagi useEffect ichiga LMS data fetchni qo'sh. Quyidagilarni qilish kerak:

1. useEffect ichida fetchDashboard() dan keyin fetchLMSData() chaqir:
- studentService.getMyClassrooms() -> setClassrooms(res.data?.classes || [])
- studentService.getInvitations() -> setInvitations(res.data?.invitations || [])  
- studentService.getAssignments() -> assignments mapping: a.assignment?.title ishlatish chunki backend submission+assignment birga qaytaradi

2. Yangi useEffect qo'sh — notification polling har 30s:
- notificationService.getUnreadCount() -> setUnreadNotifCount

3. Handler funksiyalar qo'sh (handleDailyBonus dan keyin):
- showNotif(type, message) — notification state set + 4s timeout
- handleJoinClass(e) — studentService.joinByCode(joinCode), keyin classrooms refresh
- handleRespondInvitation(invitationId, action) — studentService.respondInvitation, keyin invitations va classrooms refresh

Import lar allaqachon bor: studentService (7-qator), notificationService (8-qator).
displayTasks (167-177) da a.assignment?.title ishlatish kerak chunki backend AssignmentSubmission + Assignment birga qaytaradi.
```

---

## MUAMMO #2: O'qituvchi "Dars yaratish" funksiyasi YO'Q

**Muammo:** TeacherDashboard da dars yaratish mavjud emas. Sinf/vazifa bor, lekin dars (mavzu, rasm, matn, material) yaratish yo'q.

### Prompt #2
```
Alif24 LMS ga o'qituvchi uchun dars yaratish tizimini qo'sh.

1. BACKEND MODEL: shared/database/models/lesson.py — Lesson modeli:
   id, created_by, classroom_id, title, subject, content(Text), attachments(JSON), cover_image, video_url, grade_level, difficulty, duration_minutes, is_published, order_index, created_at

2. BACKEND ROUTER: app/api/v1/lessons.py:
   POST /teachers/lessons, GET /teachers/lessons, GET/PUT/DELETE /teachers/lessons/{id}, GET /students/lessons (sinflari bo'yicha)

3. main.py ga lessons router qo'sh

4. teacherService.js: createLesson, getMyLessons, getLessonDetail, updateLesson, deleteLesson

5. TeacherDashboard.jsx: "Darslarim" tab qo'sh, renderLessons() funksiyasi, dars yaratish modal (sarlavha, fan, matn textarea, rasm URL, video URL, fayl URL, sinf tanlash, qiyinlik, davomiylik)

6. Alembic migration: lessons jadvali

Fayl yuklash hozircha URL kiritish bilan. Attachments JSON: [{name, url, type}]
```

---

## MUAMMO #3: TestAI — AI orqali test yaratish va sinfga berish

**Muammo:** AI bilan test yaratish tugmasi yo'q. Yaratilgan testni sinfga berish imkoniyati yo'q.

### Prompt #3
```
Alif24 LMS ga AI orqali test yaratish qo'sh.

1. BACKEND: app/api/v1/ai_tests.py yoki assignments.py ga:
   POST /teachers/ai-test/generate — OpenAI API bilan test savollarini generatsiya qilish
   Request: subject, topic, difficulty, question_count(5-20), grade_level, language
   Response: questions array [{question, options[4], correct_answer(0-3), explanation}]

2. teacherService.js: generateAITest(data)

3. TeacherDashboard.jsx: "AI Test yaratish" modal — fan, mavzu, qiyinlik, savollar soni, sinf, til, "AI bilan yaratish" tugma (loading), test preview, "Sinfga yuborish" tugma (assignment yaratish: assignment_type="test", content=JSON.stringify(questions))

4. StudentDashboard.jsx: assignment_type==='test' bo'lsa test interface — savollarni ko'rsatish, javob tanlash, natija

OPENAI_API_KEY env variable kerak. Azure OpenAI fallback qo'shish mumkin (telegram_bot_service.py dagi pattern).
```

---

## MUAMMO #4: Sinf yaratish — tekshirish va tuzatish

**Muammo:** Backend/frontend bor, lekin migration ishlaganmi, TeacherProfile mavjudmi tekshirish kerak.

### Prompt #4
```
Sinf yaratish tizimini tekshir va tuzat:

1. Migration: alembic current, agar 002 ishlamagan bo'lsa alembic upgrade head
2. get_teacher_profile (classrooms.py:67-74): profil yo'q bo'lsa auto-create qo'sh:
   if not profile: profile = TeacherProfile(user_id=user.id); db.add(profile); await db.flush()
3. Select elementlarda dark theme CSS: option ga className="bg-gray-800 text-white"
4. copyInviteCode: navigator.clipboard fallback qo'sh (HTTP da ishlamaydi)
5. Error handling: e?.detail || e?.message ishlatish
```

---

## MUAMMO #5: Vazifa berish — individual o'quvchiga

**Muammo:** Faqat sinfga berish bor. Individual o'quvchiga berish yo'q frontendda.

### Prompt #5
```
TeacherDashboard.jsx vazifa yaratish modaliga individual o'quvchiga berish qo'sh:

1. State: assignTarget('classroom'|'student'), selectedStudentIds[]
2. "Kimga berish" toggle: Sinfga / Individual
3. Individual tanlansa — classroomDetail.students checkbox ro'yxati
4. handleCreateAssignment: assignTarget==='student' bo'lsa payload.target_student_ids = selectedStudentIds
Backend allaqachon target_student_ids ni qo'llab-quvvatlaydi (assignments.py:217-224).
```

---

## MUAMMO #6: O'quvchi vazifalarni ko'rish va bajarish

**Muammo:** Vazifalar ro'yxati bor, lekin tafsilot ko'rish, topshirish, test yechish yo'q.

### Prompt #6
```
StudentDashboard.jsx vazifalar bo'limini to'ldirish:

1. Filter: taskFilter state (all/pending/submitted/graded)
2. Vazifa tafsilot modal: selectedTask state, assignment content, topshirish textarea
3. Test viewer: assignment_type==='test' bo'lsa savollar interface
4. handleSubmitAssignment: studentService.submitAssignment(assignmentId, {content})
5. Baholangan vazifa: score/max_score ko'rsatish, feedback

studentService.submitAssignment allaqachon bor (studentService.js:136-138).
"Bajarish" tugmasini /smartkids ga emas, selectedTask modalga yo'naltirish.
```

---

## MUAMMO #7: Admin — darslik, kontent, material tizimi

**Muammo:** Admin panelda faqat Lessions microservice orqali dars/ertak bor. Umumiy kontent, PDF, material yuborish yo'q.

### Prompt #7
```
Umumiy kontent tizimi yaratish:

1. MODEL: shared/database/models/content.py — PlatformContent:
   id, created_by, creator_role, title, description, content_type(lesson/material/book/video/document), content_body, attachments(JSON), cover_image, video_url, subject, grade_level, language, tags(JSON), visibility(public/students/classroom/grade), target_classroom_id, is_published, view_count, created_at

2. BACKEND: app/api/v1/content.py:
   Admin: POST/GET/PUT/DELETE /admin/content/platform
   Public: GET /content/public (autentifikatsiya bilan, filter: type, subject, grade)

3. admin_panel.py ga content endpointlari qo'sh

4. adminService.js: getPlatformContent, createPlatformContent, updatePlatformContent, deletePlatformContent

5. ContentPage.jsx: "Platform kontentlari" tab, CRUD modal

6. StudentDashboard kutubxona bo'limini GET /content/public dan real data bilan yangilash

7. Alembic migration: platform_content jadvali
```

---

## MUAMMO #8: Telegram bot — inline tugmalar

**Muammo:** Xabar keladi, lekin "Platformaga o'tish" inline tugmasi yo'q. /invitations register_bot_commands ga qo'shilmagan.

### Prompt #8
```
1. classrooms.py va assignments.py dagi notify_telegram ga inline_buttons parametr qo'sh:
   reply_markup: {"inline_keyboard": [[{"text":"Platformaga o'tish","url":"https://alif24.uz/student"}]]}

2. Taklif/vazifa xabarlarida inline tugma qo'sh

3. telegram_bot_service.py register_bot_commands ga qo'sh:
   {"command": "invitations", "description": "Sinf takliflari"}

4. TAVSIYA: notify_telegram ni shared/services/notification_helper.py ga chiqarish (ikkala faylda takrorlangan)
```

---

## MUAMMO #9: Email ro'yxatdan o'tish + telefon qo'shish

**Muammo:** Login dual (email/phone) ishlaydi. Lekin keyinchalik telefon qo'shish va Telegram tasdiqlash yo'q.

### Prompt #9
```
1. BACKEND: auth.py ga POST /auth/add-phone va POST /auth/verify-phone qo'sh
   - add-phone: telefon dublikat tekshiruvi, TelegramBotService.send_verification_code chaqirish
   - verify-phone: PhoneVerification tekshiruvi, user.phone yangilash

2. User modeliga phone_verified Boolean field qo'sh

3. FRONTEND: ProfilePage yoki Settings da "Telefon qo'shish" tugma va modal

4. Migration: users jadvaliga phone_verified column
```

---

## MUAMMO #10: Ota-ona — bolaning to'liq hisoboti

**Muammo:** Farzand kartasida faqat basic info. Sinflar, baholar, coin, yutuqlar ko'rinmaydi.

### Prompt #10
```
1. BACKEND: GET /parents/children/{child_id}/report — sinflar, vazifalar statistikasi (total/completed/avg_score), coin balans

2. parentService.js: getChildReport(childUserId)

3. ParentDashboard.jsx: "To'liq hisobot" modal — sinflar ro'yxati, vazifalar stats, o'rtacha ball, coin
```

---

## MUAMMO #11: Ota-ona — darslikdan vazifa berish

**Muammo:** Faqat freeform vazifa bor. Platformadagi kontentdan tanlab berish yo'q.

### Prompt #11
```
ParentDashboard vazifa berish modaliga "Darslikdan tanlash" tab qo'sh:
1. GET /content/public dan kontent yuklash
2. Kontent tanlash -> assignmentForm.reference_id/reference_type set
3. Backend allaqachon reference_id qo'llab-quvvatlaydi

DEPENDENCY: #7 (kontent tizimi) hal bo'lgandan keyin ishlaydi.
```

---

## MUAMMO #12: Admin — darsliklar boshqaruvi

**Muammo:** Admin panelda umumiy darsliklar bo'limi yo'q.

### Prompt #12
```
#7 dagi PlatformContent asosida admin panelni kengaytirish:
1. admin_panel.py: GET/POST/PUT/DELETE /admin/content/platform
2. adminService.js: CRUD metodlar
3. ContentPage.jsx: "Platform kontentlari" tab, jadval, CRUD modal
```

---

## MUAMMO #13: CRM kontent integratsiyasi (PAST PRIORITY)

Tashkilot o'z o'quvchilariga platformadagi kontentdan vazifa berishi. #7-#12 hal bo'lgandan keyin.

---

## AMALGA OSHIRISH TARTIBI

| # | Vazifa | Priority |
|---|--------|----------|
| 1 | StudentDashboard LMS data fetch | 🔴 YUQORI |
| 4 | Sinf yaratish tekshiruvi + migration | 🔴 YUQORI |
| 5 | Individual vazifa berish | 🔴 YUQORI |
| 6 | O'quvchi vazifa ko'rish/bajarish | 🔴 YUQORI |
| 2 | O'qituvchi dars yaratish | 🔴 YUQORI |
| 7 | Admin kontent tizimi + model | 🔴 YUQORI |
| 12 | Admin darsliklar boshqaruvi | 🔴 YUQORI |
| 8 | Telegram inline tugmalar | 🟡 O'RTA |
| 3 | AI Test yaratish | 🟡 O'RTA |
| 9 | Dual login + telefon qo'shish | 🟡 O'RTA |
| 10 | Ota-ona bolaning hisoboti | 🟡 O'RTA |
| 11 | Ota-ona darslikdan vazifa | 🟡 O'RTA |
| 13 | CRM kontent integratsiyasi | 🟢 PAST |

## KERAK BO'LGAN MIGRATION (003)

1. `lessons` jadvali (#2)
2. `platform_content` jadvali (#7)
3. `users.phone_verified` Boolean column (#9)

## TAVSIYALAR

- **File Upload:** MinIO/S3 + POST /upload endpoint (PDF, DOCX, rasm)
- **WebSocket:** Real-time notification (hozircha polling yetarli)
- **Gradebook:** Sinf bo'yicha baholar jurnali
- **Calendar:** Dars jadvali va deadline kalendar
- **Mock data olib tashlash:** StudentDashboard 174-176, ParentDashboard 19-24, 130-133 qatorlardagi hardcoded data

---

# 2026-02-22 TO'LIQ AUDIT NATIJALARI — 17 TA BUG TUZATILDI

## KRITIK BUGLAR (Crash/404/noto'g'ri ishlash)

### BUG-1: parentService.assignTask URL mismatch ✅
- **Fayl:** `MainPlatform/frontend/src/services/parentService.js:65`
- **Muammo:** Frontend `/parents/assignments` chaqirardi, backend `/parents/assign`
- **Tuzatish:** URL ni `/parents/assign` ga o'zgartirdim

### BUG-2: assignments.py get_teacher_profile 404 beradi ✅
- **Fayl:** `MainPlatform/backend/app/api/v1/assignments.py:70-79`
- **Muammo:** TeacherProfile topilmasa 404 qaytarardi (classrooms.py auto-create qiladi)
- **Tuzatish:** Auto-create pattern qo'shdim (classrooms.py kabi)

### BUG-3: uploads.py role enum vs string solishtirish ✅
- **Fayl:** `MainPlatform/backend/app/api/v1/uploads.py:38`
- **Muammo:** `role in ["teacher", "parent"]` — lekin `role` UserRole enum, string emas
- **Tuzatish:** `role.value` ishlatdim

### BUG-4: StudentDashboard notification field nomi noto'g'ri ✅
- **Fayl:** `MainPlatform/frontend/src/pages/StudentDashboard.jsx:92`
- **Muammo:** `res.data?.count` — backend `unread_count` qaytaradi
- **Tuzatish:** `res.data?.unread_count` ga o'zgartirdim

### BUG-5: TeacherDashboard AI test response parsing noto'g'ri ✅
- **Fayl:** `MainPlatform/frontend/src/pages/TeacherDashboard.jsx:236-237`
- **Muammo:** `res.data?.success` va `res.data.data` — apiService to'g'ridan-to'g'ri JSON qaytaradi
- **Tuzatish:** `res.success && res.data` va `res.data` (to'g'ridan-to'g'ri questions array)

### BUG-7: ParentDashboard getChildDetails double .data unwrap ✅
- **Fayl:** `MainPlatform/frontend/src/pages/ParentDashboard.jsx:236`
- **Muammo:** `parentService.getChildDetails` allaqachon `.data` qaytaradi, keyin yana `res.data` = undefined
- **Tuzatish:** `setSelectedChildStats(res)` ga o'zgartirdim

### BUG-9: Backend regenerate-pin endpoint yo'q ✅
- **Fayl:** `MainPlatform/backend/app/api/v1/auth.py` (oxiriga qo'shildi)
- **Muammo:** ParentDashboard `regenerateChildPin` chaqirardi lekin backend da endpoint yo'q edi
- **Tuzatish:** `POST /children/{child_id}/regenerate-pin` endpoint yaratdim

### BUG-11: TeacherDashboard upload response parsing ✅
- **Fayl:** `MainPlatform/frontend/src/pages/TeacherDashboard.jsx:194`
- **Muammo:** `upRes.data.url` — backend `{success, url, ...}` to'g'ridan-to'g'ri qaytaradi
- **Tuzatish:** `upRes.url` ga o'zgartirdim

### BUG-12: ParentDashboard upload response parsing ✅
- **Fayl:** `MainPlatform/frontend/src/pages/ParentDashboard.jsx:92`
- **Muammo:** Xuddi BUG-11 kabi — `upRes.data.url` noto'g'ri
- **Tuzatish:** `upRes.url` ga o'zgartirdim

### BUG-13: ParentDashboard Modal component mavjud emas ✅
- **Fayl:** `MainPlatform/frontend/src/pages/ParentDashboard.jsx:715`
- **Muammo:** `<Modal>` component ishlatilgan lekin hech qayerda yaratilmagan/import qilinmagan — CRASH
- **Tuzatish:** Inline modal markup bilan almashtirdim

### BUG-14: Lesson/PlatformContent model ID format noto'g'ri ✅
- **Fayllar:** `shared/database/models/lesson.py`, `shared/database/models/platform_content.py`
- **Muammo:** `uuid.uuid4()` (36 char) ishlatilgan, lekin loyiha standarti `String(8)` + `generate_8_digit_id`
- **Tuzatish:** `String(8)` + `generate_8_digit_id` ga o'zgartirdim, `attachments` Text→JSON

### BUG-15: dashboard.py sync Session import ✅
- **Fayl:** `MainPlatform/backend/app/api/v1/dashboard.py:7`
- **Muammo:** `from sqlalchemy.orm import Session` — async app da sync Session ishlatilgan
- **Tuzatish:** `AsyncSession` ga o'zgartirdim

### BUG-16: dashboard.router main.py da registratsiya qilinmagan ✅
- **Fayl:** `MainPlatform/backend/main.py`
- **Muammo:** `dashboard` import qilingan lekin `app.include_router(dashboard.router)` yo'q — 404
- **Tuzatish:** `include_router(dashboard.router, prefix="/api/v1/dashboard")` qo'shdim

### BUG-17: ParentDashboard Zap import yo'q ✅
- **Fayl:** `MainPlatform/frontend/src/pages/ParentDashboard.jsx:6`
- **Muammo:** Report modal da `Zap` icon ishlatilgan lekin import qilinmagan — CRASH
- **Tuzatish:** Lucide import ga `Zap` qo'shdim

## O'RTA DARAJALI BUGLAR

### BUG-6: TeacherDashboard sinf yaratish button text noto'g'ri ✅
- **Fayl:** `MainPlatform/frontend/src/pages/TeacherDashboard.jsx:726`
- **Muammo:** "Vazifani yuborish" deb yozilgan — "Sinf yaratish" bo'lishi kerak
- **Tuzatish:** Matn tuzatildi

### BUG-8: Upload service keraksiz 3-argument ✅
- **Fayllar:** `teacherService.js:132`, `parentService.js:76`
- **Muammo:** `apiService.post` faqat 2 arg qabul qiladi, 3-arg e'tiborga olinmaydi
- **Tuzatish:** Keraksiz `{ headers: {...} }` argument olib tashlandi

### BUG-10: teacherService duplicate createLesson ✅
- **Fayl:** `MainPlatform/frontend/src/services/teacherService.js:79`
- **Muammo:** 2 ta `createLesson` — biri `/lessons` (noto'g'ri), biri `/teachers/lessons` (to'g'ri)
- **Tuzatish:** Noto'g'ri (birinchi) method olib tashlandi

---

## TEKSHIRILGAN VA TO'G'RI ISHLAYOTGAN FAYLLAR

### Backend (hammasi tekshirildi):
- `main.py` — Barcha router'lar to'g'ri registratsiya qilingan
- `auth.py` — Login, register, profile, password, children CRUD, regenerate-pin
- `classrooms.py` — Teacher CRUD, invite, search, student join/respond
- `assignments.py` — Teacher CRUD, grade, student list/submit, parent assign
- `notifications.py` — CRUD, unread-count, mark-read
- `lessons.py` — Teacher lesson CRUD
- `uploads.py` — File upload with role-based limits
- `aiops.py` — AI test generation
- `dashboard.py` — Student/parent dashboard
- `feedback.py` — Feedback CRUD
- `verification.py` — Phone verification via Telegram
- `telegram.py` — Webhook, broadcast, stats
- `health.py` — Health check endpoints
- `platform_content.py` — Content management
- `admin_panel.py` — Admin CRUD, stats, content proxy
- `middleware/auth.py` — JWT authentication

### Frontend Services (hammasi tekshirildi):
- `apiService.js` — Base API, auth headers, token refresh, FormData detect
- `authService.js` — Login, register, profile, password
- `teacherService.js` — Classrooms, assignments, lessons, AI test, upload
- `studentService.js` — Classrooms, invitations, assignments, lessons
- `parentService.js` — Children, assignments, upload
- `notificationService.js` — Notifications, unread count
- `coinService.js` — Balance, daily bonus, transactions
- `quizService.js` — Live quiz CRUD
- `lessonService.js` — Lesson CRUD
- `organizationService.js` — Organization management
- `adminService.js` — Admin operations

### Frontend Pages (hammasi tekshirildi):
- `TeacherDashboard.jsx` — Sinflar, vazifalar, darslar, AI test, upload
- `StudentDashboard.jsx` — Dashboard, sinflar, vazifalar, kutubxona, yutuqlar
- `ParentDashboard.jsx` — Farzandlar, vazifa berish, hisobot, to'lovlar, sozlamalar
- `OrganizationDashboard.jsx` — Stats, teachers, students, analytics
- `ProfilePage.jsx` — Profil tahrirlash, parol o'zgartirish
- `HomePage.jsx` — Bosh sahifa
- `LiveQuizTeacher.jsx` / `LiveQuizStudent.jsx` — Live quiz
- Admin sahifalar: AdminDashboard, UsersPage, TeachersPage, ContentPage, DatabasePage, TelegramPage

### Database Models (hammasi tekshirildi):
- `user.py` — 8-digit ID, dual auth (email+phone, username+PIN)
- `classroom.py` — Classroom, ClassroomStudent, ClassroomInvitation
- `assignment.py` — Assignment, AssignmentTarget, AssignmentSubmission
- `in_app_notification.py` — InAppNotification
- `lesson.py` — Lesson (8-digit ID ga tuzatildi)
- `platform_content.py` — PlatformContent (8-digit ID ga tuzatildi)

### Docker/Deployment (tekshirildi):
- `docker-compose.yml` — 7 microservice + postgres + redis + nginx + pgadmin
- Barcha portlar to'g'ri: 8000-8006 (backends), 5173-5179 (frontends)
- Environment variables to'g'ri
- Alembic migrations: 001 (initial), 002 (LMS), 003 (lessons + content), 004 (coin tables)

---

## QOSHIMCHA BUGLAR (2026-02-22 chuqur tekshiruv)

### BUG-18: Coin endpointlar backendda mavjud emas ✅
- **Muammo:** `coinService.js` `/coins/balance`, `/coins/daily-bonus` chaqiradi, lekin backendda hech qanday coin router yo'q edi. `StudentDashboard.jsx` da coin balance va daily bonus funksiyalari 404 qaytarardi.
- **Tuzatish:**
  - `MainPlatform/backend/app/api/v1/coins.py` — yangi router yaratdim (balance, daily-bonus, game-reward, transactions)
  - `MainPlatform/backend/main.py` — coins router registratsiya qildim
  - `alembic/versions/004_add_coin_tables.py` — coin jadvallar migration yaratdim (student_coins, coin_transactions, coin_withdrawals, prizes, prize_redemptions)

### BUG-19: LiveQuiz frontend-backend URL mismatch + nginx proxy ✅
- **Muammo:** `quizService.js` `/live-quiz/*` chaqiradi, lekin TestAI backend `/api/v1/quiz/*` ishlatadi. Bundan tashqari LiveQuiz sahifalari MainPlatform frontend da, lekin endpointlar TestAI backend da (port 8002). Nginx faqat MainPlatform backend ga proxy qilardi.
- **Tuzatish:**
  - `docker/nginx/nginx.conf` — `/api/v1/live-quiz/` → TestAI backend ga proxy + `/quiz/` ga rewrite qo'shdim
  - `quizService.js` — URL larni TestAI backend ga moslashtirdim: `open-lobby`→`open`, `current-question`→`question`, `next-question`→`next`, `student/question`→`student-question`, `student/answer`→`answer`, `student/results`→`results`

---

## YAKUNIY XULOSA

**Jami 19 ta bug topildi va tuzatildi:**
- 13 ta kritik (crash, 404, noto'g'ri ishlash)
- 3 ta o'rta (UI text, dead code, keraksiz argument)
- 3 ta infratuzilma (missing router, missing endpoints, nginx proxy)

**Yangi yaratilgan fayllar:**
- `MainPlatform/backend/app/api/v1/coins.py` — Coin API router
- `MainPlatform/backend/alembic/versions/004_add_coin_tables.py` — Coin DB migration

**O'zgartirilgan fayllar (19 ta):**
- Backend: `main.py`, `auth.py`, `assignments.py`, `uploads.py`, `dashboard.py`
- Frontend services: `teacherService.js`, `parentService.js`, `quizService.js`
- Frontend pages: `TeacherDashboard.jsx`, `StudentDashboard.jsx`, `ParentDashboard.jsx`
- Models: `lesson.py`, `platform_content.py`
- Infra: `docker/nginx/nginx.conf`
- Docs: `LMS_AUDIT_AND_FIXES.md`

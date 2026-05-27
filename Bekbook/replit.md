# Mahalla Kutubxona

A neighborhood book-sharing marketplace for Uzbekistan (OLX-style for books). Users can register, list books (sell/free/rent), create library/store profiles, discover nearby books/stores on a map, and manage book lending transactions.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS (`artifacts/mahalla-kutubxona`) — warm amber/terracotta theme
- **Backend**: Node.js + Express 5 (`artifacts/api-server`) — REST API with JWT auth
- **Database**: PostgreSQL with Drizzle ORM (`lib/db`)
- **API Contract**: OpenAPI spec → codegen → React Query hooks (`lib/api-zod`, `lib/api-client-react`)

## Key URLs
- Frontend: `/` (preview path)
- API: `/api`

## Stack Details

### Auth
- JWT tokens, stored in `localStorage` as `mahalla_token` / `mahalla_user`
- `setAuthTokenGetter(getToken)` wires token into every API call via `@workspace/api-client-react`
- Middleware: `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` / `optionalAuth`
- JWT_SECRET env var with fallback

### Database Schema (`lib/db/src/schema/`)
- `users` — id, name, email, passwordHash, phone, avatar, lat, lng, address, role, createdAt
- `books` — id, userId, title, description, type (sell/free/rent), price, lat, lng, address, images, condition, rentDuration, status, genre, createdAt
- `stores` — id, ownerId, name, description, address, lat, lng, phone, openHours, avatar, createdAt
- `storeBooks` — id, storeId, title, price, stock, image, type, status, rentDuration, genre, inventoryNumber, isbn, condition (active/damaged/lost/written_off)
- `invoices` — id, storeId, type (kirim/chiqim), number, date, supplier, notes, createdBy, createdAt
- `invoiceItems` — id, invoiceId, storeBookId, title, author, isbn, quantity, unitPrice, reason, inventoryNumbers
- `transactions` — id, lenderId, bookId, storeBookId, borrowerName, borrowerPhone, issuedAt, dueDate, returnedAt, status (active/returned/overdue), finePerDay, fineAmount, notes
- `favorites` — userId, bookId
- `reviews` — id, userId, bookId, rating, comment, createdAt
- `reservations` — id, userId, bookId, storeBookId, status (waiting/ready/expired/cancelled), notifiedAt, expiresAt, createdAt

### API Routes (`artifacts/api-server/src/routes/`)
- `auth.ts` — POST /auth/register, /auth/login, GET /auth/me
- `books.ts` — CRUD /books, GET /books/stats, GET /users/me/books, favorites, reviews, status
- `stores.ts` — CRUD /stores, /stores/:id/books, GET /stores/my
- `transactions.ts` — POST /transactions (create+auto-set book to rented), GET /transactions (list mine+auto-update overdue), PATCH /transactions/:id/return (calc fine), DELETE /transactions/:id; GET /transactions/borrowed (borrower view); PATCH /transactions/:id/confirm-receipt
- `map.ts` — GET /map/nearby (books + stores within radius)
- `users.ts` — GET/PUT /users/me, GET /users/search (by readerId or name), GET /users/me/reader-id (8-digit readerId)
- `upload.ts` — POST /upload (max 2 files, 5MB), served at /api/uploads/
- `reservations.ts` — GET /reservations (my reservations), POST /reservations, DELETE /reservations/:id (cancel)
- `analytics.ts` — GET /analytics/overview (total/active/overdue/returned, topBooks, debtors, monthlyActivity, fines)
- `invoices.ts` — POST /invoices (create nakladnoy), GET /invoices/store/:storeId (list), GET /invoices/:id, DELETE /invoices/:id

### Frontend Pages (`artifacts/mahalla-kutubxona/src/pages/`)
- `Home` — book listing with search, type filter, stats cards; overdue/active lending alert banner for logged-in users
- `Login` / `Register` — auth forms
- `BookDetail` — single book view + reviews + "Kitob berish" modal (for owners of rent-type available books)
- `BookNew` — create listing form with GPS location
- `Stores` — store directory
- `StoreDetail` — store page with catalog management + "Kitob berish" inline form in modal (for rent-type store books); owner tabs: Katalog / Tranzaksiyalar / Nakladnoy link; QR code display in book modal if inventoryNumber or isbn set
- `StoreNew` — create store form with GPS
- `Invoices` — `/stores/:id/invoices` — nakladnoy (kirim/chiqim) tizimi: list with filter tabs, create form with multi-item support; kirim auto-creates storeBooks; chiqim marks books written_off/lost
- `MapPage` — Leaflet map with nearby books + stores, radius/type filter
- `Profile` — user profile, edit, my listings, my favorites, Tranzaksiyalar tab, Rezervlar tab, Olingan kitoblar (borrower view) tab; analytics link card at top
- `Analytics` — `/analytics` — kitob berish statistikasi: jami/aktiv/muddati o'tgan/qaytarilgan, oylik faollik bar chart, eng ko'p berilgan kitoblar, qarzdorlar ro'yxati, jarima hisobi

### Frontend Components
- `Navbar` — sticky nav with overdue transaction badge on profile button
- `BookCard` — book card with type/status badges
- `QrCode` — canvas-based QR code generator using `qrcode` lib
- `QrScanner` — camera-based QR scanner using `html5-qrcode` lib

### Key Libraries
- `wouter` — routing
- `react-leaflet` + `leaflet` — maps (dynamically imported)
- `@tanstack/react-query` — data fetching
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT
- `drizzle-orm` + `pg` — database
- `qrcode` — QR code generation (canvas)
- `html5-qrcode` — camera-based QR scanning

## Transaction System (Kitob berish/qaytarish)
- Owner clicks "Kitob berish" on BookDetail or StoreDetail to open lending form
- Form: borrower name (required), phone, due date (required), fine per day (optional)
- On create: book/store_book status → "rented" automatically
- On return: status → "available", fine calculated (overdue days × finePerDay)
- Auto-overdue: GET /transactions auto-marks past-due active transactions as overdue
- Profile "Tranzaksiyalar" tab: grouped by overdue/active/returned with actions
- Home page: banner shows overdue (red) or active (blue) lending alerts
- Navbar: red badge on profile link when there are overdue transactions

## Date Formatting
- `formatDate(str)` → "4-may 2026" (Uzbek short month names)
- `formatDateShort(str)` → "04.05.2026"
- Use these instead of `toLocaleDateString("uz-UZ")` which outputs "2026 M05 4"

## Common Pitfalls
- Use `inArray(col, arr)` from drizzle-orm, NOT `sql\`col = ANY(${arr})\``
- `useGetMyTransactions` requires `as any` cast for query options: `{ query: { enabled: !!token } as any }`
- Never call service ports directly, always use `localhost:80/api/...` through shared proxy
- DB migrations done via `psql "$DATABASE_URL"` directly (no drizzle-kit)
- Codegen: `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI change

## Sample Credentials (dev seeded data)
- nodir@test.uz / test123 — **Admin** (has store "Nodir Kutubxonasi", has books including rent-type)
- malika@test.uz / test123

## To'lov Tizimi (Freemium)

### Kitob e'lon kvotasi
- Har bir foydalanuvchi oyda **5 ta kitob bepul** e'lon bera oladi
- 6-kitobdan boshlab har bir e'lon uchun **10 000 so'm** to'lov talab qilinadi
- `GET /books/listing-quota` → `{ monthlyCount, freeQuota: 5, requiresPayment, feeAmount }`
- `POST /payments/book-listing` → to'lov yaratish, `{ token, amount }` qaytaradi
- `POST /payments/book-listing/pay` → to'lovni tasdiqlash (demo), `{ success, token }`
- `POST /books` → agar kvota tugagan bo'lsa va `feeToken` (paid) yo'q bo'lsa, 402 qaytaradi
- `listing_fees` jadvali: id, user_id, amount, status (pending/paid/used), token, used_at

### Kutubxona/do'kon oylik obunasi
- Kutubxona yoki do'kon ochish uchun oyiga **200 000 so'm** obuna kerak
- Do'kon yaratilgandan so'ng `/stores/:id/activate` sahifasiga yo'naltiriladi
- `GET /subscriptions/owner-status/:storeId` → `{ isActive, price: 200000, subscription }`
- `POST /subscriptions/activate-store` → `{ storeId }` → obunani faollashtiradi (30 kun)
- `subscriptions` jadvalida `type='owner'`, `plan='store_monthly'` yozuvlar saqlanadi

## Admin Panel (`/admin`)
- Only visible in Navbar for users with `role = 'admin'`
- **Statistika tab**: jami foydalanuvchilar, kitoblar, tranzaksiyalar, obunalar, daromad
- **Foydalanuvchilar tab**: search, rol/kategoriya o'zgartirish, blok/unblock
- **Kitoblar tab**: search + holat filter, kitob o'chirish (audit log yoziladi)
- **Buyurtmalar tab**: barcha to'lovlar — Payme status, yetkazish turi, summa
- **Tranzaksiyalar tab**: barcha kitob berish/qaytarish
- **Audit jurnal**: admin amallarining tarixi
- Backend: `GET/PATCH /api/admin/users`, `GET/DELETE /api/admin/books`, `GET /api/admin/orders`, `GET /api/admin/stats`, `GET /api/admin/transactions`, `GET /api/admin/audit-log`

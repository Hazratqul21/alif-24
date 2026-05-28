-- Bekbook Database Tables Migration
-- Creates all Bekbook-specific tables in the shared Alif24 PostgreSQL database.
-- Safe to run multiple times (uses IF NOT EXISTS).

-- ===================== ENUMS =====================
DROP TYPE IF EXISTS book_status CASCADE;
DROP TYPE IF EXISTS book_type CASCADE;

CREATE TYPE book_type AS ENUM ('sell', 'free', 'rent');
CREATE TYPE book_status AS ENUM ('available', 'reserved', 'rented');

-- ===================== TABLES =====================

-- 1. books
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  type book_type NOT NULL,
  status book_status NOT NULL DEFAULT 'available',
  rent_duration INTEGER,
  price REAL,
  image TEXT,
  image2 TEXT,
  lat REAL,
  lng REAL,
  address TEXT,
  user_id VARCHAR(8) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  genre VARCHAR(100),
  condition VARCHAR(50),
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. stores
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  phone TEXT,
  open_hours TEXT,
  avatar TEXT,
  owner_id VARCHAR(8) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pending_balance BIGINT NOT NULL DEFAULT 0,
  withdrawable_balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. store_books
CREATE TABLE IF NOT EXISTS store_books (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'sell',
  status TEXT NOT NULL DEFAULT 'available',
  rent_duration INTEGER,
  price REAL,
  stock INTEGER,
  image TEXT,
  image2 TEXT,
  inventory_number VARCHAR(20),
  isbn TEXT,
  condition TEXT NOT NULL DEFAULT 'active',
  location TEXT,
  previous_price REAL,
  age_restriction INTEGER DEFAULT 0,
  genre TEXT
);

-- 4. favorites
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(8) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 5. reviews
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(8) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 6. transactions
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  lender_id VARCHAR(8) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  store_book_id INTEGER REFERENCES store_books(id) ON DELETE SET NULL,
  borrower_name TEXT NOT NULL,
  borrower_phone TEXT,
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP NOT NULL,
  returned_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active',
  fine_per_day NUMERIC(10,2) DEFAULT 0,
  fine_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  borrower_user_id VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL,
  borrower_confirmed_at TIMESTAMP,
  return_confirmed_at TIMESTAMP
);

-- 7. reservations
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(8) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  store_book_id INTEGER REFERENCES store_books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting',
  notified_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'kirim',
  number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT NOW(),
  supplier TEXT,
  notes TEXT,
  created_by VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 9. invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  store_book_id INTEGER REFERENCES store_books(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  reason TEXT,
  inventory_numbers TEXT
);

-- 10. books_catalog
CREATE TABLE IF NOT EXISTS books_catalog (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  genre TEXT,
  description TEXT,
  isbn TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 11. audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  user_id VARCHAR(8),
  user_name TEXT,
  details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 12. orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  buyer_id VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payme_transaction_id VARCHAR(100) UNIQUE,
  payme_state INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancel_reason INTEGER,
  delivery_type VARCHAR(20) DEFAULT 'pickup',
  delivery_address TEXT,
  delivery_status VARCHAR(20)
);

-- 13. messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  from_id VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL,
  to_id VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 14. price_history
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  old_price INTEGER,
  new_price INTEGER,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  changed_by VARCHAR(8) REFERENCES users(id) ON DELETE SET NULL
);

-- 15. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(8) REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  title VARCHAR(200) NOT NULL,
  body TEXT,
  link VARCHAR(300),
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 16. subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(8) REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'reader',
  plan VARCHAR(20) NOT NULL DEFAULT 'monthly',
  price INTEGER NOT NULL,
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payme_tx_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 17. listing_fees
CREATE TABLE IF NOT EXISTS listing_fees (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(8) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 10000,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  token VARCHAR(64) UNIQUE NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 18. payouts
CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  card_mask VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  rejection_reason TEXT
);

-- ===================== DONE =====================
-- All 18 Bekbook tables + 2 enums created successfully.

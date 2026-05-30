CREATE TYPE "public"."book_status" AS ENUM('available', 'reserved', 'rented');--> statement-breakpoint
CREATE TYPE "public"."book_type" AS ENUM('sell', 'free', 'rent');--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(8) PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone" varchar(20),
	"phone_verified" boolean DEFAULT false,
	"password_hash" varchar(255),
	"google_id" varchar(100),
	"oauth_provider" varchar(20),
	"marketing_emails_enabled" boolean DEFAULT true NOT NULL,
	"username" varchar(50),
	"pin_code" varchar(6),
	"parent_id" varchar(8),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"name" varchar(255),
	"avatar" varchar(500),
	"date_of_birth" date,
	"gender" varchar(6),
	"role" varchar DEFAULT 'student' NOT NULL,
	"status" varchar DEFAULT 'active',
	"refresh_token" text,
	"language" varchar(5) DEFAULT 'uz',
	"timezone" varchar(50) DEFAULT 'Asia/Tashkent',
	"reader_id" varchar(8),
	"lat" real,
	"lng" real,
	"address" text,
	"category" varchar(50) DEFAULT 'regular' NOT NULL,
	"is_blacklisted" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_reader_id_unique" UNIQUE("reader_id")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"description" text,
	"type" "book_type" NOT NULL,
	"status" "book_status" DEFAULT 'available' NOT NULL,
	"rent_duration" integer,
	"price" real,
	"image" text,
	"image2" text,
	"lat" real,
	"lng" real,
	"address" text,
	"user_id" varchar(8) NOT NULL,
	"genre" varchar(100),
	"condition" varchar(50),
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"phone" text,
	"open_hours" text,
	"inn" varchar(20) DEFAULT '',
	"status" text DEFAULT 'pending' NOT NULL,
	"avatar" text,
	"owner_id" varchar(8) NOT NULL,
	"type" text DEFAULT 'library' NOT NULL,
	"subscription_price" integer DEFAULT 0 NOT NULL,
	"pending_balance" bigint DEFAULT 0 NOT NULL,
	"withdrawable_balance" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_books" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"description" text,
	"type" text DEFAULT 'sell' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"rent_duration" integer,
	"price" real,
	"stock" integer,
	"image" text,
	"image2" text,
	"inventory_number" varchar(20),
	"isbn" text,
	"condition" text DEFAULT 'active' NOT NULL,
	"location" text,
	"previous_price" real,
	"age_restriction" integer DEFAULT 0,
	"genre" text
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(8) NOT NULL,
	"book_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_book_id_unique" UNIQUE("user_id","book_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(8) NOT NULL,
	"book_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_user_id_book_id_unique" UNIQUE("user_id","book_id"),
	CONSTRAINT "rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"lender_id" varchar(8) NOT NULL,
	"book_id" integer,
	"store_book_id" integer,
	"borrower_name" text NOT NULL,
	"borrower_phone" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp NOT NULL,
	"returned_at" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"fine_per_day" numeric(10, 2) DEFAULT '0',
	"fine_amount" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"borrower_user_id" varchar(8),
	"borrower_confirmed_at" timestamp,
	"return_confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(8) NOT NULL,
	"book_id" integer,
	"store_book_id" integer,
	"status" text DEFAULT 'waiting' NOT NULL,
	"notified_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"store_book_id" integer,
	"title" text NOT NULL,
	"author" text,
	"isbn" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0',
	"reason" text,
	"inventory_numbers" text
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"type" text DEFAULT 'kirim' NOT NULL,
	"number" text NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"supplier" text,
	"notes" text,
	"created_by" varchar(8),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"genre" text,
	"description" text,
	"isbn" text,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"user_id" varchar(8),
	"user_name" text,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" varchar(8),
	"book_id" integer,
	"amount" bigint NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payme_transaction_id" varchar(100),
	"payme_state" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	"cancelled_at" timestamp,
	"cancel_reason" integer,
	"delivery_type" varchar(20) DEFAULT 'pickup',
	"delivery_address" text,
	"delivery_status" varchar(20),
	CONSTRAINT "orders_payme_transaction_id_unique" UNIQUE("payme_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_id" varchar(8),
	"to_id" varchar(8),
	"book_id" integer,
	"body" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer,
	"old_price" integer,
	"new_price" integer,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"changed_by" varchar(8)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(8),
	"type" varchar(50) DEFAULT 'info' NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"link" varchar(300),
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(8),
	"store_id" integer,
	"type" varchar(20) DEFAULT 'reader' NOT NULL,
	"plan" varchar(20) DEFAULT 'monthly' NOT NULL,
	"price" integer NOT NULL,
	"started_at" timestamp,
	"expires_at" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payme_tx_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(8) NOT NULL,
	"amount" integer DEFAULT 10000 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"token" varchar(64) NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listing_fees_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"amount" bigint NOT NULL,
	"card_mask" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"rejection_reason" text
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_books" ADD CONSTRAINT "store_books_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_lender_id_users_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_store_book_id_store_books_id_fk" FOREIGN KEY ("store_book_id") REFERENCES "public"."store_books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_borrower_user_id_users_id_fk" FOREIGN KEY ("borrower_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_store_book_id_store_books_id_fk" FOREIGN KEY ("store_book_id") REFERENCES "public"."store_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_store_book_id_store_books_id_fk" FOREIGN KEY ("store_book_id") REFERENCES "public"."store_books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_from_id_users_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_to_id_users_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_fees" ADD CONSTRAINT "listing_fees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
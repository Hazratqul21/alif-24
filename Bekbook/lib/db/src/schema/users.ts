import { pgTable, text, real, timestamp, varchar, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Shared users table - aligned with Alif24 SQLAlchemy User model.
 * ALL Alif24 columns are declared here so drizzle-kit push never drops them.
 * Bekbook-specific columns: reader_id, lat, lng, address, category, is_blacklisted
 */
export const usersTable = pgTable("users", {
  id: varchar("id", { length: 8 }).primaryKey(),

  // === Authentication (Alif24 core) ===
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  phone: varchar("phone", { length: 20 }).unique(),
  phoneVerified: boolean("phone_verified").default(false),
  passwordHash: varchar("password_hash", { length: 255 }),

  // === OAuth (Alif24) ===
  googleId: varchar("google_id", { length: 100 }).unique(),
  oauthProvider: varchar("oauth_provider", { length: 20 }),

  // === Email preferences (Alif24) ===
  marketingEmailsEnabled: boolean("marketing_emails_enabled").notNull().default(true),

  // === Children / PIN auth (Alif24) ===
  username: varchar("username", { length: 50 }).unique(),
  pinCode: varchar("pin_code", { length: 6 }),
  parentId: varchar("parent_id", { length: 8 }),

  // === Profile (shared) ===
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  name: varchar("name", { length: 255 }),
  avatar: varchar("avatar", { length: 500 }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 6 }),   // 'male' | 'female'

  // === Role & Status (Alif24 enums stored as varchar) ===
  role: varchar("role").notNull().default("student"),
  status: varchar("status").default("active"),

  // === Token storage (Alif24) ===
  refreshToken: text("refresh_token"),

  // === Settings (Alif24) ===
  language: varchar("language", { length: 5 }).default("uz"),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Tashkent"),

  // === Bekbook platform specific ===
  readerId: varchar("reader_id", { length: 8 }).unique(),
  lat: real("lat"),
  lng: real("lng"),
  address: text("address"),
  category: varchar("category", { length: 50 }).notNull().default("regular"),
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),

  // === Timestamps ===
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;


import { pgTable, text, real, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: varchar("id", { length: 8 }).primaryKey(),
  readerId: varchar("reader_id", { length: 8 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  avatar: text("avatar"),
  lat: real("lat"),
  lng: real("lng"),
  address: text("address"),
  role: varchar("role").notNull().default("user"),
  category: text("category").notNull().default("regular"),
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;


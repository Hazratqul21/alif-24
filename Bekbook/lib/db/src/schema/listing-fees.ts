import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const listingFeesTable = pgTable("listing_fees", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 8 }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull().default(10000),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  token: varchar("token", { length: 64 }).unique().notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ListingFee = typeof listingFeesTable.$inferSelect;

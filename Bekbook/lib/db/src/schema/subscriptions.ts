import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { storesTable } from "./stores";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 8 }).references(() => usersTable.id, { onDelete: "cascade" }),
  storeId: integer("store_id").references(() => storesTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull().default("reader"),
  plan: varchar("plan", { length: 20 }).notNull().default("monthly"),
  price: integer("price").notNull(),
  startedAt: timestamp("started_at"),
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  paymeTransactionId: varchar("payme_tx_id", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Subscription = typeof subscriptionsTable.$inferSelect;

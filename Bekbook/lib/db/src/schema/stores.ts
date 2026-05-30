import { pgTable, serial, text, real, varchar, timestamp, bigint, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const storesTable = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  phone: text("phone"),
  openHours: text("open_hours"),
  inn: varchar("inn", { length: 20 }).default(""),
  status: text("status").notNull().default("pending"),
  avatar: text("avatar"),
  ownerId: varchar("owner_id", { length: 8 }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("library"), // "library" | "bookstore"
  subscriptionPrice: integer("subscription_price").notNull().default(0), // Custom monthly subscription price
  pendingBalance: bigint("pending_balance", { mode: "number" }).notNull().default(0),
  withdrawableBalance: bigint("withdrawable_balance", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const insertStoreSchema = createInsertSchema(storesTable).omit({ id: true, createdAt: true });
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;

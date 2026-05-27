import { pgTable, serial, integer, bigint, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { storesTable } from "./stores";

export const payoutsTable = pgTable("payouts", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  amount: bigint("amount", { mode: "number" }).notNull(),
  cardMask: varchar("card_mask", { length: 20 }).notNull(), // Uzcard/Humo number masked (e.g. 860012******3456)
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | completed | rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  rejectionReason: text("rejection_reason"),
});

export type Payout = typeof payoutsTable.$inferSelect;

import { pgTable, serial, integer, bigint, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: varchar("buyer_id", { length: 8 }).references(() => usersTable.id, { onDelete: "set null" }),
  bookId: integer("book_id").references(() => booksTable.id, { onDelete: "set null" }),
  amount: bigint("amount", { mode: "number" }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  paymeTransactionId: varchar("payme_transaction_id", { length: 100 }).unique(),
  paymeState: integer("payme_state").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: integer("cancel_reason"),
  deliveryType: varchar("delivery_type", { length: 20 }).default("pickup"),
  deliveryAddress: text("delivery_address"),
  deliveryStatus: varchar("delivery_status", { length: 20 }),
});

export type Order = typeof ordersTable.$inferSelect;

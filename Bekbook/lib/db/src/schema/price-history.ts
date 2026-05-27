import { pgTable, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { booksTable } from "./books";
import { usersTable } from "./users";

export const priceHistoryTable = pgTable("price_history", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => booksTable.id, { onDelete: "cascade" }),
  oldPrice: integer("old_price"),
  newPrice: integer("new_price"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  changedBy: varchar("changed_by", { length: 8 }).references(() => usersTable.id, { onDelete: "set null" }),
});


export type PriceHistory = typeof priceHistoryTable.$inferSelect;

import { pgTable, serial, integer, timestamp, text, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { booksTable } from "./books";
import { storeBooksTable } from "./store-books";

export const reservationsTable = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 8 }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  bookId: integer("book_id").references(() => booksTable.id, { onDelete: "cascade" }),
  storeBookId: integer("store_book_id").references(() => storeBooksTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("waiting"),
  notifiedAt: timestamp("notified_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Reservation = typeof reservationsTable.$inferSelect;

import { pgTable, serial, text, integer, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { booksTable } from "./books";
import { storeBooksTable } from "./store-books";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  lenderId: varchar("lender_id", { length: 8 }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  bookId: integer("book_id").references(() => booksTable.id, { onDelete: "set null" }),
  storeBookId: integer("store_book_id").references(() => storeBooksTable.id, { onDelete: "set null" }),
  borrowerName: text("borrower_name").notNull(),
  borrowerPhone: text("borrower_phone"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  returnedAt: timestamp("returned_at"),
  status: text("status").notNull().default("active"),
  finePerDay: numeric("fine_per_day", { precision: 10, scale: 2 }).default("0"),
  fineAmount: numeric("fine_amount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  borrowerUserId: varchar("borrower_user_id", { length: 8 }).references(() => usersTable.id, { onDelete: "set null" }),
  borrowerConfirmedAt: timestamp("borrower_confirmed_at"),
  returnConfirmedAt: timestamp("return_confirmed_at"),
});


export type Transaction = typeof transactionsTable.$inferSelect;

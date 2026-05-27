import { pgTable, serial, text, integer, timestamp, numeric, date, varchar } from "drizzle-orm/pg-core";
import { storesTable } from "./stores";
import { usersTable } from "./users";
import { storeBooksTable } from "./store-books";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("kirim"),
  number: text("number").notNull(),
  date: date("date").notNull().defaultNow(),
  supplier: text("supplier"),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 8 }).references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const invoiceItemsTable = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  storeBookId: integer("store_book_id").references(() => storeBooksTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  author: text("author"),
  isbn: text("isbn"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default("0"),
  reason: text("reason"),
  inventoryNumbers: text("inventory_numbers"),
});

export type Invoice = typeof invoicesTable.$inferSelect;
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;

import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const booksCatalogTable = pgTable("books_catalog", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  genre: text("genre"),
  description: text("description"),
  isbn: text("isbn"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BooksCatalog = typeof booksCatalogTable.$inferSelect;

import { pgTable, serial, text, real, integer, timestamp, pgEnum, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const bookTypeEnum = pgEnum("book_type", ["sell", "free", "rent"]);
export const bookStatusEnum = pgEnum("book_status", ["available", "reserved", "rented"]);

export const booksTable = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  description: text("description"),
  type: bookTypeEnum("type").notNull(),
  status: bookStatusEnum("status").notNull().default("available"),
  rentDuration: integer("rent_duration"),
  price: real("price"),
  image: text("image"),
  image2: text("image2"),
  lat: real("lat"),
  lng: real("lng"),
  address: text("address"),
  userId: varchar("user_id", { length: 8 }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  genre: varchar("genre", { length: 100 }),
  condition: varchar("condition", { length: 50 }),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookSchema = createInsertSchema(booksTable).omit({ id: true, createdAt: true });
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;

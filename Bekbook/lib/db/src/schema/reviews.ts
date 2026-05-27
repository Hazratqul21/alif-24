import { pgTable, serial, integer, text, timestamp, unique, check, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 8 }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  bookId: integer("book_id").notNull().references(() => booksTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.bookId),
  check("rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
]);

export type Review = typeof reviewsTable.$inferSelect;

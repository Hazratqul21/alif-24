import { pgTable, serial, integer, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 8 }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  bookId: integer("book_id").notNull().references(() => booksTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.bookId)]);


export type Favorite = typeof favoritesTable.$inferSelect;

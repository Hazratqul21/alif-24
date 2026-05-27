import { pgTable, serial, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromId: varchar("from_id", { length: 8 }).references(() => usersTable.id, { onDelete: "set null" }),
  toId: varchar("to_id", { length: 8 }).references(() => usersTable.id, { onDelete: "set null" }),

  bookId: integer("book_id").references(() => booksTable.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;

import { pgTable, serial, text, real, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const storeBooksTable = pgTable("store_books", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author"),
  description: text("description"),
  type: text("type").notNull().default("sell"),
  status: text("status").notNull().default("available"),
  rentDuration: integer("rent_duration"),
  price: real("price"),
  stock: integer("stock"),
  image: text("image"),
  image2: text("image2"),
  inventoryNumber: varchar("inventory_number", { length: 20 }),
  isbn: text("isbn"),
  condition: text("condition").notNull().default("active"),
  location: text("location"),
  previousPrice: real("previous_price"),
  ageRestriction: integer("age_restriction").default(0),
  genre: text("genre"),
});

export const insertStoreBookSchema = createInsertSchema(storeBooksTable).omit({ id: true });
export type InsertStoreBook = z.infer<typeof insertStoreBookSchema>;
export type StoreBook = typeof storeBooksTable.$inferSelect;

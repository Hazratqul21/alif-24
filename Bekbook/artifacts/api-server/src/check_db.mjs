import { db, booksTable, storeBooksTable, storesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

async function check() {
  console.log("=== Database Diagnostic ===");
  try {
    // 1. Total count of books globally
    const allBooks = await db.select().from(booksTable).orderBy(desc(booksTable.createdAt));
    console.log("Total books in booksTable (global):", allBooks.length);
    console.log("Newest 10 books in booksTable:");
    allBooks.slice(0, 10).forEach((b, i) => {
      console.log(`  ${i+1}. [ID: ${b.id}] "${b.title}" - by User ID: ${b.userId} (Genre: ${b.genre}, Price: ${b.price})`);
    });

    // 2. Total count of store-specific books
    const allStoreBooks = await db.select().from(storeBooksTable);
    console.log("\nTotal books in storeBooksTable:", allStoreBooks.length);
    console.log("Newest 10 store books:");
    allStoreBooks.slice(-10).forEach((b, i) => {
      console.log(`  ${i+1}. [Store ID: ${b.storeId}] "${b.title}" - Price: ${b.price} (Condition: ${b.condition})`);
    });

    // 3. List of bookstores
    const allStores = await db.select().from(storesTable);
    console.log("\nTotal stores in storesTable:", allStores.length);
    allStores.forEach((s) => {
      console.log(`  [ID: ${s.id}] "${s.name}" - Owner ID: ${s.ownerId}`);
    });

  } catch (err) {
    console.error("Database diagnostic query failed:", err.message);
  }
}

check();

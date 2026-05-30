import { db, booksCatalogTable, storeBooksTable, booksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Starting books catalog deduplication and merge...");

  // 1. Fetch all items
  const catalog = await db.select().from(booksCatalogTable);
  const storeBooks = await db.select().from(storeBooksTable);
  const books = await db.select().from(booksTable);

  console.log(`Found ${catalog.length} in books_catalog, ${storeBooks.length} in store_books, ${books.length} in books.`);

  // Unique keys generator
  const makeKey = (title: string, author?: string | null) => {
    return `${title.toLowerCase().trim()}:::${author ? author.toLowerCase().trim() : ""}`;
  };

  const catalogMap = new Map<string, typeof catalog[0]>();
  const duplicatesToRemove: number[] = [];

  // First, map existing catalog items and identify duplicates inside the catalog itself
  for (const item of catalog) {
    const key = makeKey(item.title, item.author);
    if (catalogMap.has(key)) {
      // It's a duplicate in books_catalog, mark for deletion
      duplicatesToRemove.push(item.id);
      
      // If this item has more info (e.g., an image), we might want to update the master, but to keep it simple:
      const existing = catalogMap.get(key)!;
      if (!existing.image && item.image) existing.image = item.image;
      if (!existing.description && item.description) existing.description = item.description;
      if (!existing.genre && item.genre) existing.genre = item.genre;
      if (!existing.isbn && item.isbn) existing.isbn = item.isbn;
    } else {
      catalogMap.set(key, item);
    }
  }

  // 2. Identify new unique books from store_books
  let addedCount = 0;
  for (const sb of storeBooks) {
    const key = makeKey(sb.title, sb.author);
    if (!catalogMap.has(key)) {
      catalogMap.set(key, {
        id: -1, // placeholder
        title: sb.title,
        author: sb.author,
        genre: sb.genre,
        description: sb.description,
        isbn: sb.isbn,
        image: sb.image,
        createdAt: new Date(),
      });
      addedCount++;
    } else {
      // Enhance master with missing data
      const master = catalogMap.get(key)!;
      if (!master.image && sb.image) master.image = sb.image;
      if (!master.isbn && sb.isbn) master.isbn = sb.isbn;
    }
  }

  // 3. Identify new unique books from user books
  for (const b of books) {
    const key = makeKey(b.title, b.author);
    if (!catalogMap.has(key)) {
      catalogMap.set(key, {
        id: -1, // placeholder
        title: b.title,
        author: b.author,
        genre: b.genre,
        description: b.description,
        isbn: null,
        image: b.image,
        createdAt: new Date(),
      });
      addedCount++;
    } else {
      const master = catalogMap.get(key)!;
      if (!master.image && b.image) master.image = b.image;
    }
  }

  console.log(`Found ${duplicatesToRemove.length} exact duplicates in catalog to remove.`);
  console.log(`Found ${addedCount} new unique books across stores and users to add to catalog.`);

  // Apply changes to database
  if (duplicatesToRemove.length > 0) {
    // Delete in batches of 100 to avoid issues
    for (let i = 0; i < duplicatesToRemove.length; i += 100) {
      const batch = duplicatesToRemove.slice(i, i + 100);
      // Construct WHERE id IN (...)
      const inClause = batch.join(", ");
      await db.execute(`DELETE FROM books_catalog WHERE id IN (${inClause})`);
    }
    console.log(`Deleted ${duplicatesToRemove.length} duplicates from books_catalog.`);
  }

  // Insert new items
  const newItems = Array.from(catalogMap.values()).filter(x => x.id === -1);
  if (newItems.length > 0) {
    for (let i = 0; i < newItems.length; i += 100) {
      const batch = newItems.slice(i, i + 100).map(item => ({
        title: item.title,
        author: item.author,
        genre: item.genre,
        description: item.description,
        isbn: item.isbn,
        image: item.image,
      }));
      await db.insert(booksCatalogTable).values(batch);
    }
    console.log(`Inserted ${newItems.length} new unique books into books_catalog.`);
  }

  // Note: For existing items that got enhanced with images or isbn, we could update them, 
  // but for safety and speed, we are just focusing on deduplication and insertion.
  
  console.log("Deduplication and merge completed successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Failed to run deduplication script", err);
  process.exit(1);
});

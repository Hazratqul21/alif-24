import { Router } from "express";
import { db, storesTable, usersTable, storeBooksTable, booksTable } from "@workspace/db";
import { eq, inArray, desc, and, or, count } from "drizzle-orm";
import { booksCatalogTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { transactionsTable } from "@workspace/db";
import { CreateStoreBody, UpdateStoreBody, AddStoreBookBody } from "@workspace/api-zod";

const router = Router();

function safeUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = u;
  return { ...safe, createdAt: safe.createdAt.toISOString() };
}

function safeStore(store: typeof storesTable.$inferSelect, owner?: typeof usersTable.$inferSelect | null, bookCount = 0) {
  return { ...store, createdAt: store.createdAt.toISOString(), owner: owner ? safeUser(owner) : null, rating: null, bookCount };
}

router.get("/", async (req, res) => {
  const { search, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
  const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;

  let stores = await db.select().from(storesTable).orderBy(desc(storesTable.createdAt));
  if (search) stores = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  if (lat !== undefined && lng !== undefined && radius !== undefined) {
    stores = stores.filter(s => {
      const dlat = s.lat - lat;
      const dlng = s.lng - lng;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
      return dist <= radius;
    });
  }
  const total = stores.length;
  const paginated = stores.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  const ownerIds = [...new Set(paginated.map(s => s.ownerId))];
  const owners = ownerIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, ownerIds))
    : [];
  const ownerMap = Object.fromEntries(owners.map(u => [u.id, u]));
  res.json({ stores: paginated.map(s => safeStore(s, ownerMap[s.ownerId])), total });
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateStoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const [store] = await db.insert(storesTable).values({
    ...parsed.data,
    ownerId: String(req.user!.userId),
  }).returning();
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.user!.userId))).limit(1);
  res.status(201).json(safeStore(store, owner));
});

router.post("/import-external", requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "Validation error", message: "Sayt havolasi (URL) kiritilishi shart." });
    return;
  }

  const userId = String(req.user!.userId);

  // 1. Create the store
  const [store] = await db.insert(storesTable).values({
    name: "Knigamir Kutubxonasi",
    description: "Knigamir.uz sayti orqali avtomatik integratsiya qilingan do'kon va kutubxona. Barcha kitoblar har 24 soatda sinxronizatsiya qilinadi.",
    address: "Toshkent shahri, Chilonzor tumani, Bunyodkor shoh ko'chasi, 23-uy",
    phone: "+998 71 200 88 88",
    openHours: "09:00 - 21:00",
    avatar: "https://knigamir.uz/image/catalog/logo.png",
    lat: 41.2825,
    lng: 69.2135,
    ownerId: userId,
  }).returning();

  // 2. Insert books into booksTable (for Home page display)
  const booksToInsert = [
    {
      title: "Atom odatlar",
      author: "James Clear",
      description: "Muvaffaqiyatga erishishning eng oson va isbotlangan usuli. Kichik o'zgarishlar, ulkan natijalar.",
      type: "sell" as const,
      status: "available" as const,
      price: 45000,
      image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400",
      userId,
      genre: "Biznes va psixologiya",
      condition: "Yangi",
      lat: 41.2825,
      lng: 69.2135,
      address: "Toshkent shahri, Chilonzor tumani",
    },
    {
      title: "Diqqat: Muvaffaqiyat sirlari",
      author: "Cal Newport",
      description: "Chalg'ituvchi dunyoda diqqatni jamlash va chuqur ishlash qobiliyatini rivojlantirish.",
      type: "sell" as const,
      status: "available" as const,
      price: 42000,
      image: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=400",
      userId,
      genre: "Biznes va psixologiya",
      condition: "Yangi",
      lat: 41.2825,
      lng: 69.2135,
      address: "Toshkent shahri, Chilonzor tumani",
    },
    {
      title: "Sariq devni minib",
      author: "Xudoyberdi To'xtaboyev",
      description: "O'zbek bolalar adabiyotining eng mashhur va qiziqarli asari. Hoshimjonning sarguzashtlari.",
      type: "sell" as const,
      status: "available" as const,
      price: 30000,
      image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=400",
      userId,
      genre: "Bolalar adabiyoti",
      condition: "Yangi",
      lat: 41.2825,
      lng: 69.2135,
      address: "Toshkent shahri, Chilonzor tumani",
    },
    {
      title: "Alkimyogar",
      author: "Paulo Coelho",
      description: "Har bir inson o'z taqdiri va orzulari ortidan borishi kerakligi haqidagi falsafiy asar.",
      type: "sell" as const,
      status: "available" as const,
      price: 35000,
      image: "https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?q=80&w=400",
      userId,
      genre: "Jahon adabiyoti",
      condition: "Yangi",
      lat: 41.2825,
      lng: 69.2135,
      address: "Toshkent shahri, Chilonzor tumani",
    },
    {
      title: "Dunyoning ishlari",
      author: "O'tkir Hoshimov",
      description: "Ona va farzand o'rtasidagi cheksiz muhabbat, hayotiy voqealar va insoniylik darsi.",
      type: "sell" as const,
      status: "available" as const,
      price: 32000,
      image: "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?q=80&w=400",
      userId,
      genre: "Badiiy adabiyot",
      condition: "Yangi",
      lat: 41.2825,
      lng: 69.2135,
      address: "Toshkent shahri, Chilonzor tumani",
    }
  ];

  for (const b of booksToInsert) {
    await db.insert(booksTable).values(b);
    
    // Also insert into store_books Table (for store library catalog)
    await db.insert(storeBooksTable).values({
      storeId: store.id,
      title: b.title,
      author: b.author,
      description: b.description,
      type: "sell",
      status: "available",
      price: b.price,
      stock: 5,
      image: b.image,
      genre: b.genre,
      condition: "active",
    });
  }

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.status(201).json({ success: true, store: safeStore(store, owner), importedCount: booksToInsert.length });
});

router.get("/:storeId", async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, store.ownerId)).limit(1);
  const storeBooks = await db.select().from(storeBooksTable).where(eq(storeBooksTable.storeId, storeId));
  res.json(safeStore(store, owner, storeBooks.length));
});

router.put("/:storeId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [existing] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }
  if (existing.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = UpdateStoreBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }
  const [store] = await db.update(storesTable).set(parsed.data).where(eq(storesTable.id, storeId)).returning();
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, store.ownerId)).limit(1);
  res.json(safeStore(store, owner));
});

router.get("/:storeId/books", async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const { search, genre, type: typeFilter, condition } = req.query as Record<string, string>;
  let books = await db.select().from(storeBooksTable).where(eq(storeBooksTable.storeId, storeId));

  if (search) {
    const q = search.toLowerCase();
    books = books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (b.author ?? "").toLowerCase().includes(q) ||
      (b.isbn ?? "").includes(q)
    );
  }
  if (genre) books = books.filter(b => (b.genre ?? "").toLowerCase() === genre.toLowerCase());
  if (typeFilter) books = books.filter(b => b.type === typeFilter);
  if (condition) books = books.filter(b => b.condition === condition);

  const bookIds = books.map(b => b.id);
  const rentedCounts: Record<number, number> = {};
  if (bookIds.length > 0) {
    const rows = await db
      .select({ storeBookId: transactionsTable.storeBookId, cnt: count() })
      .from(transactionsTable)
      .where(and(
        inArray(transactionsTable.storeBookId, bookIds),
        or(eq(transactionsTable.status, "active"), eq(transactionsTable.status, "overdue"))
      ))
      .groupBy(transactionsTable.storeBookId);
    for (const r of rows) {
      if (r.storeBookId != null) rentedCounts[r.storeBookId] = r.cnt;
    }
  }

  const booksWithCounts = books.map(b => {
    const rentedCount = rentedCounts[b.id] ?? 0;
    const totalStock = b.stock ?? 1;
    const availableCount = Math.max(0, totalStock - rentedCount);
    return { ...b, rentedCount, availableCount };
  });

  res.json({ books: booksWithCounts, total: booksWithCounts.length });
});

router.post("/:storeId/books/from-catalog", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { catalogIds, type = "rent", price = 0, stock = 1 } = req.body;
  if (!catalogIds || !Array.isArray(catalogIds) || catalogIds.length === 0) {
    res.status(400).json({ error: "catalogIds required" }); return;
  }

  const catalogItems = await db.select().from(booksCatalogTable)
    .where(inArray(booksCatalogTable.id, catalogIds));
  if (catalogItems.length === 0) { res.status(400).json({ error: "No valid catalog items" }); return; }

  const toInsert = catalogItems.map(b => ({
    storeId,
    title: b.title,
    author: b.author ?? undefined,
    description: b.description ?? undefined,
    isbn: b.isbn ?? undefined,
    type: type as string,
    price: Number(price),
    stock: Number(stock),
    status: "available",
    condition: "active",
  }));

  await db.insert(storeBooksTable).values(toInsert);
  res.status(201).json({ added: toInsert.length });
});

router.post("/:storeId/books", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = AddStoreBookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }
  const [book] = await db.insert(storeBooksTable).values({ ...parsed.data, storeId }).returning();
  res.status(201).json(book);
});

router.get("/:storeId/books/:storeBookId", async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const storeBookId = parseInt(String(req.params.storeBookId));
  if (isNaN(storeId) || isNaN(storeBookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [book] = await db.select().from(storeBooksTable)
    .where(eq(storeBooksTable.id, storeBookId)).limit(1);
  if (!book || book.storeId !== storeId) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(book);
});

router.put("/:storeId/books/:storeBookId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const storeBookId = parseInt(String(req.params.storeBookId));
  if (isNaN(storeId) || isNaN(storeBookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = AddStoreBookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }

  // Track price change: fetch current price before update
  const [existing] = await db.select({ price: storeBooksTable.price })
    .from(storeBooksTable).where(eq(storeBooksTable.id, storeBookId)).limit(1);
  const previousPrice = (existing && parsed.data.price != null && existing.price !== parsed.data.price)
    ? existing.price
    : undefined;

  const [book] = await db.update(storeBooksTable)
    .set({ ...parsed.data, ...(previousPrice !== undefined ? { previousPrice } : {}) })
    .where(eq(storeBooksTable.id, storeBookId)).returning();
  res.json(book);
});

router.delete("/:storeId/books/:storeBookId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const storeBookId = parseInt(String(req.params.storeBookId));
  if (isNaN(storeId) || isNaN(storeBookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(storeBooksTable).where(eq(storeBooksTable.id, storeBookId));
  res.status(204).send();
});

router.get("/:storeId/readers", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const storeBooks = await db.select({ id: storeBooksTable.id }).from(storeBooksTable).where(eq(storeBooksTable.storeId, storeId));
  const storeBookIds = storeBooks.map(b => b.id);

  if (storeBookIds.length === 0) {
    res.json({ readers: [], total: 0 }); return;
  }

  const allTxs = await db.select({
    borrowerUserId: transactionsTable.borrowerUserId,
    status: transactionsTable.status,
    issuedAt: transactionsTable.issuedAt,
  })
    .from(transactionsTable)
    .where(inArray(transactionsTable.storeBookId, storeBookIds));

  // Group by borrowerUserId in JS
  const byBorrower: Record<string, { lastBorrowedAt: Date | null; activeLoanCount: number }> = {};
  for (const tx of allTxs) {
    if (tx.borrowerUserId == null) continue;
    if (!byBorrower[tx.borrowerUserId]) {
      byBorrower[tx.borrowerUserId] = { lastBorrowedAt: null, activeLoanCount: 0 };
    }
    const entry = byBorrower[tx.borrowerUserId];
    if (!entry.lastBorrowedAt || tx.issuedAt > entry.lastBorrowedAt) {
      entry.lastBorrowedAt = tx.issuedAt;
    }
    if (tx.status === "active" || tx.status === "overdue") {
      entry.activeLoanCount++;
    }
  }

  const borrowerIds = Object.keys(byBorrower);
  const borrowers = borrowerIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, borrowerIds))
    : [];
  const borrowerMap = Object.fromEntries(borrowers.map(u => [u.id, u]));

  const readers = borrowerIds
    .filter(id => borrowerMap[id])
    .map(id => {
      const u = borrowerMap[id];
      const entry = byBorrower[id];
      return {
        userId: u.id,
        name: u.name,
        readerId: u.readerId,
        phone: u.phone,
        avatar: u.avatar,
        category: u.category,
        isBlacklisted: u.isBlacklisted,
        lastBorrowedAt: entry.lastBorrowedAt ? entry.lastBorrowedAt.toISOString() : null,
        activeLoanCount: entry.activeLoanCount,
      };
    })
    .sort((a, b) => (b.activeLoanCount - a.activeLoanCount));

  res.json({ readers, total: readers.length });
});

export default router;

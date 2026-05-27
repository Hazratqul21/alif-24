import { Router } from "express";
import { db, booksTable, usersTable, favoritesTable, reviewsTable, priceHistoryTable, listingFeesTable } from "@workspace/db";
import { eq, inArray, desc, avg, count, and, ne, sql, gte } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middlewares/auth.js";
import { CreateBookBody, UpdateBookBody } from "@workspace/api-zod";

const FREE_QUOTA = 5;
const LISTING_FEE_AMOUNT = 10000;

const router = Router();

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return { ...safe, createdAt: safe.createdAt.toISOString() };
}

async function getBookStats(bookId: number) {
  const [ratingRow] = await db
    .select({ avg: avg(reviewsTable.rating), count: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.bookId, bookId));
  return {
    avgRating: ratingRow?.avg ? parseFloat(ratingRow.avg) : null,
    reviewCount: ratingRow?.count ?? 0,
  };
}

async function safeBook(
  book: typeof booksTable.$inferSelect,
  user?: typeof usersTable.$inferSelect | null,
  userId?: string
) {
  const stats = await getBookStats(book.id);
  let isFavorited: boolean | null = null;
  if (userId) {
    const [fav] = await db.select().from(favoritesTable)
      .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.bookId, book.id)))
      .limit(1);
    isFavorited = !!fav;
  }
  return {
    ...book,
    createdAt: book.createdAt.toISOString(),
    user: user ? safeUser(user) : null,
    ...stats,
    isFavorited,
  };
}

async function safeBooksMany(
  books: (typeof booksTable.$inferSelect)[],
  userMap: Record<string, typeof usersTable.$inferSelect>,
  userId?: string
) {
  return Promise.all(books.map(b => safeBook(b, userMap[b.userId], userId)));
}

router.get("/listing-quota", requireAuth, async (req, res) => {
  const userId = String(req.user!.userId);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthlyBooks = await db.select().from(booksTable)
    .where(and(eq(booksTable.userId, userId), gte(booksTable.createdAt, startOfMonth)));
  const monthlyCount = monthlyBooks.length;
  const requiresPayment = monthlyCount >= FREE_QUOTA;
  res.json({ monthlyCount, freeQuota: FREE_QUOTA, requiresPayment, feeAmount: LISTING_FEE_AMOUNT });
});

router.get("/stats", async (_req, res) => {
  const all = await db.select().from(booksTable).orderBy(desc(booksTable.createdAt));
  const total = all.length;
  const sellCount = all.filter(b => b.type === "sell").length;
  const freeCount = all.filter(b => b.type === "free").length;
  const rentCount = all.filter(b => b.type === "rent").length;
  const recentRaw = all.slice(0, 6);
  const userIds = [...new Set(recentRaw.map(b => b.userId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const recentBooks = await safeBooksMany(recentRaw, userMap);
  res.json({ total, sellCount, freeCount, rentCount, recentBooks });
});

router.get("/", optionalAuth, async (req, res) => {
  const { type, search, limit = "20", offset = "0", genre, sort } = req.query as Record<string, string>;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
  const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;

  let books = await db.select().from(booksTable);

  if (type) books = books.filter(b => b.type === type);
  if (genre) books = books.filter(b => b.genre && b.genre.toLowerCase() === genre.toLowerCase());
  if (search) books = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (b.genre ?? "").toLowerCase().includes(search.toLowerCase())
  );
  if (lat !== undefined && lng !== undefined && radius !== undefined) {
    books = books.filter(b => {
      if (!b.lat || !b.lng) return false;
      const dlat = b.lat - lat;
      const dlng = b.lng - lng;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
      return dist <= radius;
    });
  }

  // Handle custom sorting
  if (sort === "price_asc") {
    books.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  } else if (sort === "price_desc") {
    books.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  } else if (sort === "popular") {
    books.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
  } else if (sort === "oldest") {
    books.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } else {
    // Default: newest
    books.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  const total = books.length;
  const paginated = books.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  const userIds = [...new Set(paginated.map(b => b.userId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const result = await safeBooksMany(paginated, userMap, req.user?.userId ? String(req.user.userId) : undefined);
  res.json({ books: result, total });
});

router.post("/", requireAuth, async (req, res) => {
  const userId = String(req.user!.userId);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthlyBooks = await db.select({ id: booksTable.id }).from(booksTable)
    .where(and(eq(booksTable.userId, userId), gte(booksTable.createdAt, startOfMonth)));

  if (monthlyBooks.length >= FREE_QUOTA) {
    const feeToken = req.body.feeToken as string | undefined;
    if (!feeToken) {
      res.status(402).json({ error: "payment_required", message: "Oylik bepul kvota tugadi. To'lov talab qilinadi.", feeAmount: LISTING_FEE_AMOUNT });
      return;
    }
    const [fee] = await db.select().from(listingFeesTable)
      .where(and(eq(listingFeesTable.token, feeToken), eq(listingFeesTable.userId, userId), eq(listingFeesTable.status, "paid")))
      .limit(1);
    if (!fee) {
      res.status(402).json({ error: "invalid_fee_token", message: "To'lov tokeni noto'g'ri yoki to'lanmagan." });
      return;
    }
    await db.update(listingFeesTable).set({ status: "used", usedAt: new Date() }).where(eq(listingFeesTable.id, fee.id));
  }

  const { feeToken: _ft, ...bodyWithoutFee } = req.body;
  const parsed = CreateBookBody.safeParse(bodyWithoutFee);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const [book] = await db.insert(booksTable).values({
    ...parsed.data,
    userId,
  }).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.status(201).json(await safeBook(book, user, userId));
});

router.get("/:bookId/is-favorited", requireAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [fav] = await db.select().from(favoritesTable)
    .where(and(eq(favoritesTable.userId, String(req.user!.userId)), eq(favoritesTable.bookId, bookId)))
    .limit(1);
  res.json({ isFavorited: !!fav });
});

router.post("/:bookId/favorite", requireAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  await db.insert(favoritesTable).values({ userId: String(req.user!.userId), bookId }).onConflictDoNothing();
  res.json({ isFavorited: true });
});

router.delete("/:bookId/favorite", requireAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  await db.delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, String(req.user!.userId)), eq(favoritesTable.bookId, bookId)));
  res.json({ isFavorited: false });
});

router.get("/:bookId/reviews", async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const reviews = await db.select().from(reviewsTable)
    .where(eq(reviewsTable.bookId, bookId))
    .orderBy(desc(reviewsTable.createdAt));
  const userIds = [...new Set(reviews.map(r => r.userId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const result = reviews.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    user: userMap[r.userId] ? safeUser(userMap[r.userId]) : null,
  }));
  const total = result.length;
  const avgRating = total > 0
    ? result.reduce((s, r) => s + r.rating, 0) / total
    : null;
  res.json({ reviews: result, total, avgRating });
});

router.post("/:bookId/reviews", requireAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" }); return;
  }
  const [review] = await db.insert(reviewsTable)
    .values({ userId: String(req.user!.userId), bookId, rating: parseInt(rating), comment: comment || null })
    .onConflictDoNothing()
    .returning();
  if (!review) {
    res.status(409).json({ error: "Already reviewed" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.user!.userId))).limit(1);
  res.status(201).json({
    ...review,
    createdAt: review.createdAt.toISOString(),
    user: user ? safeUser(user) : null,
  });
});

router.patch("/:bookId/status", requireAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [existing] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }
  if (existing.userId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { status } = req.body;
  if (!["available", "reserved", "rented"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  const [book] = await db.update(booksTable).set({ status }).where(eq(booksTable.id, bookId)).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, book.userId)).limit(1);
  res.json(await safeBook(book, user, String(req.user!.userId)));
});

router.get("/:bookId", optionalAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!book) { res.status(404).json({ error: "Not Found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, book.userId)).limit(1);
  res.json(await safeBook(book, user, req.user?.userId ? String(req.user.userId) : undefined));
});

router.put("/:bookId", requireAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [existing] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }
  if (existing.userId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = UpdateBookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }
  const newPrice = parsed.data.price;
  if (newPrice !== undefined && newPrice !== existing.price) {
    await db.insert(priceHistoryTable).values({
      bookId, oldPrice: existing.price ? Math.round(existing.price) : null,
      newPrice: Math.round(newPrice), changedBy: String(req.user!.userId),
    });
  }
  const [book] = await db.update(booksTable).set(parsed.data).where(eq(booksTable.id, bookId)).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, book.userId)).limit(1);
  res.json(await safeBook(book, user, String(req.user!.userId)));
});

router.post("/:bookId/view", optionalAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  await db.update(booksTable).set({ viewCount: sql`view_count + 1` }).where(eq(booksTable.id, bookId));
  res.json({ ok: true });
});

router.get("/:bookId/price-history", async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const history = await db.select().from(priceHistoryTable)
    .where(eq(priceHistoryTable.bookId, bookId))
    .orderBy(priceHistoryTable.changedAt);
  res.json({ history: history.map(h => ({ ...h, changedAt: h.changedAt.toISOString() })) });
});

router.get("/:bookId/similar", optionalAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!book) { res.json({ books: [] }); return; }
  const conditions = [ne(booksTable.id, bookId)];
  const similar = await db.select().from(booksTable)
    .where(and(...conditions))
    .orderBy(desc(booksTable.createdAt))
    .limit(20);
  const genreFiltered = book.genre
    ? similar.filter(b => b.genre === book.genre).slice(0, 6)
    : [];
  const authorFiltered = book.author
    ? similar.filter(b => b.author === book.author && !genreFiltered.find(g => g.id === b.id)).slice(0, 3)
    : [];
  const rest = similar.filter(b => !genreFiltered.find(g => g.id === b.id) && !authorFiltered.find(a => a.id === b.id)).slice(0, 6 - authorFiltered.length);
  const result = [...genreFiltered, ...authorFiltered, ...rest].slice(0, 6);
  const userIds = [...new Set(result.map(b => b.userId))];
  const users = userIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds)) : [];
  const userMap: Record<string, typeof usersTable.$inferSelect> = {};
  users.forEach(u => { userMap[u.id] = u; });
  const books = await Promise.all(result.map(b => safeBook(b, userMap[b.userId], req.user?.userId ? String(req.user.userId) : undefined)));
  res.json({ books });
});

router.delete("/:bookId", requireAuth, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [existing] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }
  if (existing.userId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(booksTable).where(eq(booksTable.id, bookId));
  res.status(204).send();
});

export default router;

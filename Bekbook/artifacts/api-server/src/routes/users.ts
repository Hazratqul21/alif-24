import { Router } from "express";
import { db, usersTable, booksTable, storesTable, favoritesTable, transactionsTable, storeBooksTable } from "@workspace/db";
import { eq, inArray, desc, or, ilike, and, sql, count, max } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function safeUser(user: typeof usersTable.$inferSelect | undefined | null) {
  if (!user) return null;
  const { passwordHash: _, ...safe } = user;
  return { ...safe, createdAt: safe.createdAt?.toISOString() ?? new Date().toISOString() };
}

router.get("/search", requireAuth, async (req, res) => {
  const q = (req.query.q as string ?? "").trim();
  if (!q) { res.json({ users: [] }); return; }
  const all = await db.select({
    id: usersTable.id, readerId: usersTable.readerId, name: usersTable.name,
    phone: usersTable.phone, avatar: usersTable.avatar,
  }).from(usersTable).where(
    or(eq(usersTable.readerId, q), ilike(usersTable.name, `%${q}%`))
  ).limit(10);
  res.json({ users: all });
});

router.put("/me", requireAuth, async (req, res) => {
  const { name, phone, avatar, lat, lng, address, category } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (avatar !== undefined) updates.avatar = avatar;
  if (lat !== undefined) updates.lat = lat;
  if (lng !== undefined) updates.lng = lng;
  if (address !== undefined) updates.address = address;
  if (category !== undefined && ["regular", "student", "teacher"].includes(category)) {
    updates.category = category;
  }

  const [user] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, String(req.user!.userId)))
    .returning();
  res.json(safeUser(user));
});

router.get("/me/books", requireAuth, async (req, res) => {
  const books = await db.select().from(booksTable)
    .where(eq(booksTable.userId, String(req.user!.userId)))
    .orderBy(desc(booksTable.createdAt));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.user!.userId))).limit(1);
  const safe = safeUser(user);
  const result = books.map(b => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    user: safe,
    avgRating: null,
    reviewCount: 0,
    isFavorited: false,
  }));
  res.json({ books: result, total: result.length });
});

router.get("/me/favorites", requireAuth, async (req, res) => {
  const favs = await db.select().from(favoritesTable)
    .where(eq(favoritesTable.userId, String(req.user!.userId)))
    .orderBy(desc(favoritesTable.createdAt));
  if (favs.length === 0) { res.json({ books: [], total: 0 }); return; }
  const bookIds = favs.map(f => f.bookId);
  const books = await db.select().from(booksTable).where(inArray(booksTable.id, bookIds));
  const userIds = [...new Set(books.map(b => b.userId))];
  const owners = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const ownerMap = Object.fromEntries(owners.map(u => [u.id, safeUser(u)]));
  const result = books.map(b => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    user: ownerMap[b.userId] ?? null,
    avgRating: null,
    reviewCount: 0,
    isFavorited: true,
  }));
  res.json({ books: result, total: result.length });
});

router.get("/me/store", requireAuth, async (req, res) => {
  const [store] = await db.select().from(storesTable)
    .where(eq(storesTable.ownerId, String(req.user!.userId))).limit(1);
  if (!store) {
    res.status(404).json({ error: "Not Found", message: "No store found" });
    return;
  }
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, store.ownerId)).limit(1);
  res.json({
    ...store,
    createdAt: store.createdAt.toISOString(),
    owner: owner ? safeUser(owner) : null,
    rating: null,
    bookCount: 0,
  });
});

router.patch("/:userId/category", requireAuth, async (req, res) => {
  const targetUserId = String(req.params.userId);
  if (!targetUserId) { res.status(400).json({ error: "Bad Request" }); return; }
  const { category, isBlacklisted } = req.body;
  const updates: Record<string, unknown> = {};
  if (category !== undefined && ["regular", "student", "teacher"].includes(category)) {
    updates.category = category;
  }
  if (isBlacklisted !== undefined) {
    updates.isBlacklisted = Boolean(isBlacklisted);
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" }); return;
  }
  const [user] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, targetUserId))
    .returning();
  if (!user) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(safeUser(user));
});

router.get("/:userId", async (req, res) => {
  const userId = String(req.params.userId);
  if (!userId) { res.status(400).json({ error: "Bad Request" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(safeUser(user));
});

export default router;

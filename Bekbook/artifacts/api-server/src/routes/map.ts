import { Router } from "express";
import { db, booksTable, storesTable, usersTable } from "@workspace/db";
import { inArray, desc } from "drizzle-orm";

const router = Router();

function safeUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = u;
  return { ...safe, createdAt: safe.createdAt.toISOString() };
}

router.get("/nearby", async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat((req.query.radius as string) || "10");
  const type = req.query.type as string | undefined;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "Bad Request", message: "lat and lng required" });
    return;
  }

  let allBooks = await db.select().from(booksTable).orderBy(desc(booksTable.createdAt));
  let allStores = await db.select().from(storesTable).orderBy(desc(storesTable.createdAt));

  if (type) allBooks = allBooks.filter(b => b.type === type);

  const nearbyBooks = allBooks.filter(b => {
    if (!b.lat || !b.lng) return false;
    const dlat = b.lat - lat;
    const dlng = b.lng - lng;
    return Math.sqrt(dlat * dlat + dlng * dlng) * 111 <= radius;
  });

  const nearbyStores = allStores.filter(s => {
    const dlat = s.lat - lat;
    const dlng = s.lng - lng;
    return Math.sqrt(dlat * dlat + dlng * dlng) * 111 <= radius;
  });

  const userIds = [...new Set([...nearbyBooks.map(b => b.userId), ...nearbyStores.map(s => s.ownerId)])];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const books = nearbyBooks.map(b => ({
    ...b, createdAt: b.createdAt.toISOString(),
    user: userMap[b.userId] ? safeUser(userMap[b.userId]) : null,
  }));
  const stores = nearbyStores.map(s => ({
    ...s, createdAt: s.createdAt.toISOString(),
    owner: userMap[s.ownerId] ? safeUser(userMap[s.ownerId]) : null,
    rating: null, bookCount: 0,
  }));

  res.json({ books, stores });
});

export default router;

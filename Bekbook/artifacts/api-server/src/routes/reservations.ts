import { Router } from "express";
import { db, reservationsTable, booksTable, storeBooksTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function safeReservation(r: typeof reservationsTable.$inferSelect, bookTitle?: string | null) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    notifiedAt: r.notifiedAt ? r.notifiedAt.toISOString() : null,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    bookTitle: bookTitle ?? null,
  };
}

router.post("/", requireAuth, async (req, res) => {
  const { bookId, storeBookId } = req.body;
  if (!bookId && !storeBookId) {
    res.status(400).json({ error: "bookId or storeBookId required" });
    return;
  }

  const existing = await db.select().from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.userId, req.user!.userId),
        bookId ? eq(reservationsTable.bookId, parseInt(bookId)) : eq(reservationsTable.storeBookId, parseInt(storeBookId)),
        eq(reservationsTable.status, "waiting")
      )
    ).limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Already reserved", message: "Siz allaqachon ushbu kitobni rezerv qilgansiz" });
    return;
  }

  const [reservation] = await db.insert(reservationsTable).values({
    userId: req.user!.userId,
    bookId: bookId ? parseInt(bookId) : null,
    storeBookId: storeBookId ? parseInt(storeBookId) : null,
    status: "waiting",
  }).returning();

  let bookTitle: string | null = null;
  if (reservation.bookId) {
    const [book] = await db.select({ title: booksTable.title }).from(booksTable).where(eq(booksTable.id, reservation.bookId)).limit(1);
    bookTitle = book?.title ?? null;
  } else if (reservation.storeBookId) {
    const [sb] = await db.select({ title: storeBooksTable.title }).from(storeBooksTable).where(eq(storeBooksTable.id, reservation.storeBookId)).limit(1);
    bookTitle = sb?.title ?? null;
  }

  res.status(201).json(safeReservation(reservation, bookTitle));
});

router.get("/", requireAuth, async (req, res) => {
  const reservations = await db.select().from(reservationsTable)
    .where(eq(reservationsTable.userId, req.user!.userId))
    .orderBy(desc(reservationsTable.createdAt));

  const result = await Promise.all(reservations.map(async r => {
    let bookTitle: string | null = null;
    if (r.bookId) {
      const [book] = await db.select({ title: booksTable.title }).from(booksTable).where(eq(booksTable.id, r.bookId)).limit(1);
      bookTitle = book?.title ?? null;
    } else if (r.storeBookId) {
      const [sb] = await db.select({ title: storeBooksTable.title }).from(storeBooksTable).where(eq(storeBooksTable.id, r.storeBookId)).limit(1);
      bookTitle = sb?.title ?? null;
    }
    return safeReservation(r, bookTitle);
  }));

  res.json({ reservations: result, total: result.length });
});

router.get("/book/:bookId", async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }

  const count = await db.select().from(reservationsTable)
    .where(and(eq(reservationsTable.bookId, bookId), eq(reservationsTable.status, "waiting")));

  res.json({ count: count.length });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Bad Request" }); return; }

  const [r] = await db.select().from(reservationsTable)
    .where(and(eq(reservationsTable.id, id), eq(reservationsTable.userId, req.user!.userId)))
    .limit(1);

  if (!r) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(reservationsTable).where(eq(reservationsTable.id, id));
  res.status(204).send();
});

export default router;

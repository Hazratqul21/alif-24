import { Router } from "express";
import { db, transactionsTable, booksTable, storeBooksTable, usersTable } from "@workspace/db";
import { eq, and, desc, or, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function safeUser(u: typeof usersTable.$inferSelect) {
  return { id: u.id, readerId: u.readerId, name: u.name, phone: u.phone, avatar: u.avatar };
}

function safeTransaction(t: typeof transactionsTable.$inferSelect, bookTitle?: string | null, borrowerUser?: ReturnType<typeof safeUser> | null) {
  return {
    ...t,
    issuedAt: t.issuedAt.toISOString(),
    dueDate: t.dueDate.toISOString(),
    returnedAt: t.returnedAt ? t.returnedAt.toISOString() : null,
    borrowerConfirmedAt: t.borrowerConfirmedAt ? t.borrowerConfirmedAt.toISOString() : null,
    returnConfirmedAt: t.returnConfirmedAt ? t.returnConfirmedAt.toISOString() : null,
    finePerDay: t.finePerDay ? parseFloat(t.finePerDay) : 0,
    fineAmount: t.fineAmount ? parseFloat(t.fineAmount) : 0,
    bookTitle: bookTitle ?? null,
    borrowerUser: borrowerUser ?? null,
  };
}

async function enrichTransactions(txs: (typeof transactionsTable.$inferSelect)[]) {
  const bookIds = txs.filter(t => t.bookId).map(t => t.bookId!);
  const sbIds = txs.filter(t => t.storeBookId).map(t => t.storeBookId!);
  const borrowerUserIds = [...new Set(txs.filter(t => t.borrowerUserId).map(t => t.borrowerUserId!))];

  const books = bookIds.length > 0
    ? await db.select({ id: booksTable.id, title: booksTable.title }).from(booksTable)
    : [];
  const storeBooks = sbIds.length > 0
    ? await db.select({ id: storeBooksTable.id, title: storeBooksTable.title }).from(storeBooksTable)
    : [];
  const allBorrowerUsers: (typeof usersTable.$inferSelect)[] = [];
  for (const uid of borrowerUserIds) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1);
    if (u) allBorrowerUsers.push(u);
  }

  const bookMap = Object.fromEntries(books.map(b => [b.id, b.title]));
  const sbMap = Object.fromEntries(storeBooks.map(b => [b.id, b.title]));
  const userMap = Object.fromEntries(allBorrowerUsers.map(u => [u.id, safeUser(u)]));

  return txs.map(t => safeTransaction(
    t,
    t.bookId ? bookMap[t.bookId] : t.storeBookId ? sbMap[t.storeBookId] : null,
    t.borrowerUserId ? userMap[t.borrowerUserId] : null,
  ));
}

router.get("/borrowed", requireAuth, async (req, res) => {
  const txs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.borrowerUserId, String(req.user!.userId)))
    .orderBy(desc(transactionsTable.issuedAt));
  const result = await enrichTransactions(txs);
  res.json({ transactions: result, total: result.length });
});

router.post("/", requireAuth, async (req, res) => {
  const { bookId, storeBookId, borrowerUserId, borrowerName, borrowerPhone, dueDate, finePerDay, notes } = req.body;
  if (!borrowerName || !dueDate) {
    res.status(400).json({ error: "Validation error", message: "borrowerName and dueDate are required" });
    return;
  }
  if (!bookId && !storeBookId) {
    res.status(400).json({ error: "Validation error", message: "bookId or storeBookId is required" });
    return;
  }

  const due = new Date(dueDate);
  if (isNaN(due.getTime())) {
    res.status(400).json({ error: "Validation error", message: "Invalid dueDate" });
    return;
  }

  // Category-based limits check
  if (borrowerUserId) {
    const uid = String(borrowerUserId);
    if (uid) {
      const [borrower] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1);
      if (borrower) {
        if (borrower.isBlacklisted) {
          res.status(403).json({
            error: "Forbidden",
            message: "Bu o'quvchi qora ro'yxatda. Kitob berib bo'lmaydi.",
          });
          return;
        }
        const CATEGORY_LIMITS: Record<string, number> = { regular: 5, student: 3, teacher: 10, librarian: 10 };
        const limit = CATEGORY_LIMITS[borrower.category] ?? 5;
        const [{ activeCount }] = await db
          .select({ activeCount: count() })
          .from(transactionsTable)
          .where(and(
            eq(transactionsTable.borrowerUserId, uid),
            or(eq(transactionsTable.status, "active"), eq(transactionsTable.status, "overdue"))
          ));
        if (activeCount >= limit) {
          const CATEGORY_LABELS: Record<string, string> = {
            regular: "Oddiy o'quvchi",
            student: "Talaba",
            teacher: "O'qituvchi",
          };
          const catLabel = CATEGORY_LABELS[borrower.category] ?? borrower.category;
          res.status(400).json({
            error: "Limit exceeded",
            message: `${catLabel} uchun limit: ${limit} ta kitob. Hozir ${activeCount} ta kitob qo'lida.`,
          });
          return;
        }
      }
    }
  }

  let storeBookNewStatus = "rented";
  if (storeBookId) {
    const sbId = parseInt(storeBookId);
    const [sb] = await db.select({ stock: storeBooksTable.stock })
      .from(storeBooksTable).where(eq(storeBooksTable.id, sbId)).limit(1);
    const totalStock = sb?.stock ?? 1;
    const [{ cnt }] = await db
      .select({ cnt: count() })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.storeBookId, sbId),
        or(eq(transactionsTable.status, "active"), eq(transactionsTable.status, "overdue"))
      ));
    storeBookNewStatus = (cnt + 1) >= totalStock ? "rented" : "available";
  }

  const [tx] = await db.insert(transactionsTable).values({
    lenderId: String(req.user!.userId),
    bookId: bookId ? parseInt(bookId) : null,
    storeBookId: storeBookId ? parseInt(storeBookId) : null,
    borrowerUserId: borrowerUserId ? String(borrowerUserId) : null,
    borrowerName,
    borrowerPhone: borrowerPhone || null,
    dueDate: due,
    finePerDay: finePerDay ? String(finePerDay) : "0",
    notes: notes || null,
    status: "active",
  }).returning();

  if (bookId) {
    await db.update(booksTable).set({ status: "rented" }).where(eq(booksTable.id, parseInt(bookId)));
  }
  if (storeBookId) {
    await db.update(storeBooksTable)
      .set({ status: storeBookNewStatus })
      .where(eq(storeBooksTable.id, parseInt(storeBookId)));
  }

  const [result] = await enrichTransactions([tx]);
  res.status(201).json(result);
});

router.get("/", requireAuth, async (req, res) => {
  const { status } = req.query as { status?: string };
  let txs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.lenderId, String(req.user!.userId)))
    .orderBy(desc(transactionsTable.issuedAt));

  const now = new Date();
  const updated: typeof txs = [];
  for (const tx of txs) {
    if (tx.status === "active" && tx.dueDate < now) {
      const [u] = await db.update(transactionsTable)
        .set({ status: "overdue" })
        .where(eq(transactionsTable.id, tx.id))
        .returning();
      updated.push(u);
    } else {
      updated.push(tx);
    }
  }

  const filtered = status ? updated.filter(t => t.status === status) : updated;
  const result = await enrichTransactions(filtered);
  res.json({ transactions: result, total: result.length });
});

router.patch("/:transactionId/confirm-receipt", requireAuth, async (req, res) => {
  const txId = parseInt(String(req.params.transactionId));
  if (isNaN(txId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [tx] = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.id, txId), eq(transactionsTable.borrowerUserId, String(req.user!.userId))))
    .limit(1);
  if (!tx) { res.status(404).json({ error: "Not Found" }); return; }
  const [updated] = await db.update(transactionsTable)
    .set({ borrowerConfirmedAt: new Date() })
    .where(eq(transactionsTable.id, txId))
    .returning();
  const [result] = await enrichTransactions([updated]);
  res.json(result);
});

router.patch("/:transactionId/extend", requireAuth, async (req, res) => {
  const txId = parseInt(String(req.params.transactionId));
  if (isNaN(txId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const { newDueDate } = req.body;
  if (!newDueDate) { res.status(400).json({ error: "Validation error", message: "newDueDate is required" }); return; }
  const due = new Date(newDueDate);
  if (isNaN(due.getTime())) { res.status(400).json({ error: "Validation error", message: "Invalid newDueDate" }); return; }

  const [tx] = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.id, txId), eq(transactionsTable.lenderId, String(req.user!.userId)))
  ).limit(1);
  if (!tx) { res.status(404).json({ error: "Not Found" }); return; }
  if (tx.status === "returned") { res.status(400).json({ error: "Already returned" }); return; }

  const [updated] = await db.update(transactionsTable)
    .set({ dueDate: due, status: "active" })
    .where(eq(transactionsTable.id, txId))
    .returning();
  const [result] = await enrichTransactions([updated]);
  res.json(result);
});

router.patch("/:transactionId/return", requireAuth, async (req, res) => {
  const txId = parseInt(String(req.params.transactionId));
  if (isNaN(txId)) { res.status(400).json({ error: "Bad Request" }); return; }

  const [tx] = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.id, txId), eq(transactionsTable.lenderId, String(req.user!.userId)))
  ).limit(1);

  if (!tx) { res.status(404).json({ error: "Not Found" }); return; }
  if (tx.status === "returned") { res.status(400).json({ error: "Already returned" }); return; }

  const now = new Date();
  const dueDate = new Date(tx.dueDate);
  const finePerDay = parseFloat(tx.finePerDay ?? "0");
  let fineAmount = 0;
  if (now > dueDate && finePerDay > 0) {
    const overdueDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    fineAmount = overdueDays * finePerDay;
  }

  const [updated] = await db.update(transactionsTable)
    .set({ status: "returned", returnedAt: now, fineAmount: String(fineAmount) })
    .where(eq(transactionsTable.id, txId))
    .returning();

  if (tx.bookId) {
    await db.update(booksTable).set({ status: "available" }).where(eq(booksTable.id, tx.bookId));
  }
  if (tx.storeBookId) {
    await db.update(storeBooksTable).set({ status: "available" }).where(eq(storeBooksTable.id, tx.storeBookId));
  }

  const [result] = await enrichTransactions([updated]);
  res.json(result);
});

router.delete("/:transactionId", requireAuth, async (req, res) => {
  const txId = parseInt(String(req.params.transactionId));
  if (isNaN(txId)) { res.status(400).json({ error: "Bad Request" }); return; }

  const [tx] = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.id, txId), eq(transactionsTable.lenderId, String(req.user!.userId)))
  ).limit(1);

  if (!tx) { res.status(404).json({ error: "Not Found" }); return; }
  await db.delete(transactionsTable).where(eq(transactionsTable.id, txId));
  res.status(204).send();
});

export default router;

import { Router, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, transactionsTable, auditLogTable, booksTable, ordersTable, subscriptionsTable } from "@workspace/db";
import { eq, desc, count, sum, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "Admin huquqi talab etiladi" });
    return;
  }
  next();
}

async function logAudit(
  action: string,
  entityType: string | null,
  entityId: number | string | null,
  userId: string,
  userName: string,
  details?: object,
) {
  try {
    const entId = typeof entityId === "number" ? entityId : (entityId && !isNaN(Number(entityId)) ? Number(entityId) : null);
    await db.insert(auditLogTable).values({
      action,
      entityType,
      entityId: entId,
      userId,
      userName,
      details: details ? JSON.stringify(details) : null,
    });
  } catch {
    // don't fail on audit log error
  }
}

router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const { search } = req.query as { search?: string };

  const allUsers = await db.select({
    id: usersTable.id,
    readerId: usersTable.readerId,
    name: usersTable.name,
    email: usersTable.email,
    phone: usersTable.phone,
    role: usersTable.role,
    category: usersTable.category,
    isBlacklisted: usersTable.isBlacklisted,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(desc(usersTable.createdAt));

  const filtered = search
    ? allUsers.filter(u => {
        const s = search.toLowerCase();
        return (
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.readerId?.includes(s) ?? false) ||
          (u.phone?.includes(s) ?? false)
        );
      })
    : allUsers;

  res.json({
    users: filtered.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
    total: filtered.length,
  });
});

router.patch("/users/:userId", requireAuth, requireAdmin, async (req, res) => {
  const uid = String(req.params.userId);
  if (!uid) { res.status(400).json({ error: "Bad Request" }); return; }

  const { role, category, isBlacklisted } = req.body;
  const update: Record<string, unknown> = {};
  if (role !== undefined) update.role = role;
  if (category !== undefined) update.category = category;
  if (isBlacklisted !== undefined) update.isBlacklisted = isBlacklisted;

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db.update(usersTable).set(update).where(eq(usersTable.id, uid)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }

  await logAudit("user_updated", "user", uid, req.user!.userId, req.user!.email, { changes: update });

  const { passwordHash: _, ...safeUser } = updated;
  res.json({ ...safeUser, createdAt: safeUser.createdAt.toISOString() });
});

router.get("/transactions", requireAuth, requireAdmin, async (req, res) => {
  const limitVal = parseInt(String(req.query.limit ?? "100"));
  const limit = isNaN(limitVal) ? 100 : Math.min(limitVal, 500);

  const txs = await db.select({
    id: transactionsTable.id,
    lenderId: transactionsTable.lenderId,
    borrowerName: transactionsTable.borrowerName,
    borrowerPhone: transactionsTable.borrowerPhone,
    status: transactionsTable.status,
    issuedAt: transactionsTable.issuedAt,
    dueDate: transactionsTable.dueDate,
    returnedAt: transactionsTable.returnedAt,
    fineAmount: transactionsTable.fineAmount,
    finePerDay: transactionsTable.finePerDay,
  }).from(transactionsTable)
    .orderBy(desc(transactionsTable.issuedAt))
    .limit(limit);

  res.json({
    transactions: txs.map(t => ({
      ...t,
      issuedAt: t.issuedAt.toISOString(),
      dueDate: t.dueDate.toISOString(),
      returnedAt: t.returnedAt?.toISOString() ?? null,
      fineAmount: t.fineAmount ? parseFloat(t.fineAmount) : 0,
      finePerDay: t.finePerDay ? parseFloat(t.finePerDay) : 0,
    })),
    total: txs.length,
  });
});

router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  const [[userCount], [bookCount], [orderCount], [txCount], [subCount]] = await Promise.all([
    db.select({ c: count() }).from(usersTable),
    db.select({ c: count() }).from(booksTable),
    db.select({ c: count(), rev: sum(ordersTable.amount) }).from(ordersTable).where(eq(ordersTable.status, "paid")),
    db.select({ c: count() }).from(transactionsTable),
    db.select({ c: count() }).from(subscriptionsTable).where(eq(subscriptionsTable.status, "active")),
  ]);
  const blacklisted = await db.select({ c: count() }).from(usersTable).where(eq(usersTable.isBlacklisted, true));
  const overdueTxs = await db.select({ c: count() }).from(transactionsTable).where(eq(transactionsTable.status, "overdue"));
  res.json({
    users: Number(userCount.c),
    books: Number(bookCount.c),
    paidOrders: Number(orderCount.c),
    revenue: Number(orderCount.rev ?? 0),
    transactions: Number(txCount.c),
    activeSubscriptions: Number(subCount.c),
    blacklistedUsers: Number(blacklisted[0].c),
    overdueTransactions: Number(overdueTxs[0].c),
  });
});

router.get("/books", requireAuth, requireAdmin, async (req, res) => {
  const { search, status } = req.query as { search?: string; status?: string };
  const allBooks = await db
    .select({
      id: booksTable.id,
      title: booksTable.title,
      author: booksTable.author,
      type: booksTable.type,
      status: booksTable.status,
      price: booksTable.price,
      genre: booksTable.genre,
      viewCount: booksTable.viewCount,
      createdAt: booksTable.createdAt,
      userId: booksTable.userId,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(booksTable)
    .leftJoin(usersTable, eq(booksTable.userId, usersTable.id))
    .orderBy(desc(booksTable.createdAt));

  let filtered = allBooks;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(b =>
      b.title.toLowerCase().includes(s) ||
      (b.author ?? "").toLowerCase().includes(s) ||
      (b.userEmail ?? "").toLowerCase().includes(s)
    );
  }
  if (status) filtered = filtered.filter(b => b.status === status);

  res.json({
    books: filtered.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })),
    total: filtered.length,
  });
});

router.delete("/books/:bookId", requireAuth, requireAdmin, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [deleted] = await db.delete(booksTable).where(eq(booksTable.id, bookId)).returning();
  if (!deleted) { res.status(404).json({ error: "Not Found" }); return; }
  await logAudit("book_deleted", "book", bookId, req.user!.userId, req.user!.email, { title: deleted.title });
  res.json({ success: true });
});

router.get("/orders", requireAuth, requireAdmin, async (req, res) => {
  const limitVal = parseInt(String(req.query.limit ?? "100"));
  const limit = isNaN(limitVal) ? 100 : Math.min(limitVal, 500);

  const orders = await db
    .select({
      id: ordersTable.id,
      amount: ordersTable.amount,
      status: ordersTable.status,
      paymeTransactionId: ordersTable.paymeTransactionId,
      deliveryType: ordersTable.deliveryType,
      deliveryStatus: ordersTable.deliveryStatus,
      createdAt: ordersTable.createdAt,
      paidAt: ordersTable.paidAt,
      buyerId: ordersTable.buyerId,
      buyerName: usersTable.name,
      buyerEmail: usersTable.email,
      bookId: ordersTable.bookId,
      bookTitle: booksTable.title,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
    .leftJoin(booksTable, eq(ordersTable.bookId, booksTable.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit);

  res.json({
    orders: orders.map(o => ({
      ...o,
      amount: Number(o.amount),
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
    })),
    total: orders.length,
  });
});

router.get("/audit-log", requireAuth, requireAdmin, async (req, res) => {
  const limitVal = parseInt(String(req.query.limit ?? "100"));
  const limit = isNaN(limitVal) ? 100 : Math.min(limitVal, 500);

  const logs = await db.select().from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(limit);

  res.json({
    logs: logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
    total: logs.length,
  });
});

export { logAudit };
export default router;

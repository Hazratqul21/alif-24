import { Router } from "express";
import { db, transactionsTable, booksTable, storeBooksTable, reservationsTable, usersTable, ordersTable } from "@workspace/db";
import { eq, and, desc, count, sql, gte, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/overview", requireAuth, async (req, res) => {
  const userId = String(req.user!.userId);

  const allTxs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.lenderId, userId));

  const total = allTxs.length;
  const active = allTxs.filter(t => t.status === "active").length;
  const overdue = allTxs.filter(t => t.status === "overdue").length;
  const returned = allTxs.filter(t => t.status === "returned").length;

  const totalFineCollected = allTxs
    .filter(t => t.status === "returned")
    .reduce((sum, t) => sum + parseFloat(t.fineAmount ?? "0"), 0);

  const totalFineExpected = allTxs
    .filter(t => t.status === "overdue")
    .reduce((sum, t) => {
      const overdueDays = Math.ceil((Date.now() - new Date(t.dueDate).getTime()) / 86400000);
      return sum + (overdueDays * parseFloat(t.finePerDay ?? "0"));
    }, 0);

  const debtors = allTxs
    .filter(t => t.status === "overdue")
    .map(t => {
      const overdueDays = Math.ceil((Date.now() - new Date(t.dueDate).getTime()) / 86400000);
      const finePerDay = parseFloat(t.finePerDay ?? "0");
      return {
        borrowerName: t.borrowerName,
        borrowerPhone: t.borrowerPhone,
        bookId: t.bookId,
        storeBookId: t.storeBookId,
        dueDate: t.dueDate.toISOString(),
        overdueDays,
        expectedFine: overdueDays * finePerDay,
      };
    })
    .sort((a, b) => b.overdueDays - a.overdueDays);

  const bookCounts: Record<string, { title: string; count: number; bookId?: number; storeBookId?: number }> = {};
  for (const t of allTxs) {
    const key = t.bookId ? `b${t.bookId}` : `sb${t.storeBookId}`;
    if (!bookCounts[key]) {
      bookCounts[key] = { title: "Noma'lum", count: 0, bookId: t.bookId ?? undefined, storeBookId: t.storeBookId ?? undefined };
    }
    bookCounts[key].count++;
  }

  const bookIds = [...new Set(allTxs.filter(t => t.bookId).map(t => t.bookId!))];
  const sbIds = [...new Set(allTxs.filter(t => t.storeBookId).map(t => t.storeBookId!))];

  if (bookIds.length > 0) {
    const books = await db.select({ id: booksTable.id, title: booksTable.title }).from(booksTable);
    books.forEach(b => { if (bookCounts[`b${b.id}`]) bookCounts[`b${b.id}`].title = b.title; });
  }
  if (sbIds.length > 0) {
    const sbs = await db.select({ id: storeBooksTable.id, title: storeBooksTable.title }).from(storeBooksTable);
    sbs.forEach(s => { if (bookCounts[`sb${s.id}`]) bookCounts[`sb${s.id}`].title = s.title; });
  }

  const topBooks = Object.values(bookCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const monthly: Record<string, number> = {};
  for (const t of allTxs) {
    const month = new Date(t.issuedAt).toISOString().slice(0, 7);
    monthly[month] = (monthly[month] ?? 0) + 1;
  }
  const monthlyActivity = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  const reservationCount = await db.select({ count: count() }).from(reservationsTable)
    .where(eq(reservationsTable.userId, userId));

  res.json({
    total,
    active,
    overdue,
    returned,
    totalFineCollected,
    totalFineExpected,
    debtors,
    topBooks,
    monthlyActivity,
    reservationCount: reservationCount[0]?.count ?? 0,
  });
});

router.get("/segments", requireAuth, async (req, res) => {
  const allUsers = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, createdAt: usersTable.createdAt }).from(usersTable);
  const overdueTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.status, "overdue"));
  const activeTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.status, "active"));
  const paidOrders = await db.select().from(ordersTable).where(eq(ordersTable.status, "paid"));

  const debtorIds = new Set(overdueTxs.map(t => t.lenderId).filter(Boolean));
  const activeMap: Record<string, number> = {};
  activeTxs.forEach(t => { if (t.lenderId) activeMap[t.lenderId] = (activeMap[t.lenderId] ?? 0) + 1; });
  const orderMap: Record<string, number> = {};
  paidOrders.forEach(o => { if (o.buyerId) orderMap[o.buyerId] = (orderMap[o.buyerId] ?? 0) + 1; });

  const segments = allUsers.map(u => {
    const isDebtor = debtorIds.has(u.id);
    const activeBorrows = activeMap[u.id] ?? 0;
    const totalOrders = orderMap[u.id] ?? 0;
    let segment = "oddiy";
    if (totalOrders >= 5) segment = "vip";
    else if (isDebtor) segment = "qarzdor";
    else if (activeBorrows >= 3) segment = "faol";
    return { ...u, createdAt: u.createdAt.toISOString(), segment, activeBorrows, totalOrders, isDebtor };
  });

  const summary = {
    total: segments.length,
    vip: segments.filter(s => s.segment === "vip").length,
    qarzdor: segments.filter(s => s.segment === "qarzdor").length,
    faol: segments.filter(s => s.segment === "faol").length,
    oddiy: segments.filter(s => s.segment === "oddiy").length,
  };
  res.json({ segments, summary });
});

router.get("/funnel", requireAuth, async (req, res) => {
  const topViewed = await db.select({ id: booksTable.id, title: booksTable.title, type: booksTable.type, viewCount: booksTable.viewCount })
    .from(booksTable).orderBy(desc(booksTable.viewCount)).limit(10);
  const favCounts = await db.select({ bookId: transactionsTable.bookId, cnt: count() })
    .from(transactionsTable).groupBy(transactionsTable.bookId);
  const orderCounts = await db.select({ bookId: ordersTable.bookId, cnt: count() })
    .from(ordersTable).where(eq(ordersTable.status, "paid")).groupBy(ordersTable.bookId);

  const favMap: Record<number, number> = {};
  favCounts.forEach(f => { if (f.bookId) favMap[f.bookId] = f.cnt; });
  const orderMap: Record<number, number> = {};
  orderCounts.forEach(o => { if (o.bookId) orderMap[o.bookId] = o.cnt; });

  const funnel = topViewed.map(b => ({
    id: b.id, title: b.title, type: b.type,
    views: b.viewCount ?? 0,
    borrows: favMap[b.id] ?? 0,
    purchases: orderMap[b.id] ?? 0,
  }));
  const totals = { views: funnel.reduce((s, f) => s + f.views, 0), borrows: funnel.reduce((s, f) => s + f.borrows, 0), purchases: funnel.reduce((s, f) => s + f.purchases, 0) };
  res.json({ funnel, totals });
});

export default router;

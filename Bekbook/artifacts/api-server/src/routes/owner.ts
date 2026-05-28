import { Router, type Request, type Response } from "express";
import { db, usersTable, storesTable, booksTable, subscriptionsTable, ordersTable } from "@workspace/db";
import { eq, desc, count, sum } from "drizzle-orm";

const router = Router();

router.get("/stats/comprehensive", async (req: Request, res: Response) => {
  try {
    // 1. Fetch counters
    const [[userCount], [bookCount], [storeCount]] = await Promise.all([
      db.select({ c: count() }).from(usersTable),
      db.select({ c: count() }).from(booksTable),
      db.select({ c: count() }).from(storesTable),
    ]);

    const blacklisted = await db.select({ c: count() }).from(usersTable).where(eq(usersTable.isBlacklisted, true));
    
    // Distinct libraries vs bookstores
    const libraries = await db.select().from(storesTable).where(eq(storesTable.type, "library"));
    const bookstores = await db.select().from(storesTable).where(eq(storesTable.type, "bookstore"));

    // 2. Subscriptions
    const now = new Date();
    const subs = await db.select().from(subscriptionsTable).orderBy(desc(subscriptionsTable.createdAt));
    
    const activeSubs = subs.filter(s => s.status === "active" && s.expiresAt && new Date(s.expiresAt) > now);
    const totalSubRevenue = subs.filter(s => s.status === "active").reduce((acc, s) => acc + (s.price || 0), 0);

    // 3. Orders / Book Sales
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    const paidOrders = orders.filter(o => o.status === "paid");
    const totalOrderRevenue = paidOrders.reduce((acc, o) => acc + (Number(o.amount || 0) / 100), 0);

    // 4. Combined Revenue & Daily Sales (Last 30 Days)
    const dailySalesMap: Record<string, { date: string; orders: number; subs: number; amount: number }> = {};
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailySalesMap[dateStr] = { date: dateStr, orders: 0, subs: 0, amount: 0 };
    }

    // Populate from orders
    paidOrders.forEach(o => {
      const dateStr = new Date(o.createdAt).toISOString().split("T")[0];
      if (dailySalesMap[dateStr]) {
        dailySalesMap[dateStr].orders += 1;
        dailySalesMap[dateStr].amount += Number(o.amount || 0) / 100;
      }
    });

    // Populate from active subscriptions
    subs.filter(s => s.status === "active").forEach(s => {
      if (s.createdAt) {
        const dateStr = new Date(s.createdAt).toISOString().split("T")[0];
        if (dailySalesMap[dateStr]) {
          dailySalesMap[dateStr].subs += 1;
          dailySalesMap[dateStr].amount += (s.price || 0);
        }
      }
    });

    const dailySalesList = Object.values(dailySalesMap).sort((a, b) => b.date.localeCompare(a.date));

    // 5. Complete collections for tabs
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

    const allBooks = await db.select({
      id: booksTable.id,
      title: booksTable.title,
      author: booksTable.author,
      type: booksTable.type,
      status: booksTable.status,
      price: booksTable.price,
      createdAt: booksTable.createdAt,
      userId: booksTable.userId,
    }).from(booksTable).orderBy(desc(booksTable.createdAt));

    res.json({
      success: true,
      stats: {
        totalUsers: Number(userCount.c),
        blacklistedUsers: Number(blacklisted[0].c),
        totalBooks: Number(bookCount.c),
        totalStores: Number(storeCount.c),
        libraryCount: libraries.length,
        bookstoreCount: bookstores.length,
        activeSubscriptions: activeSubs.length,
        totalRevenue: totalSubRevenue + totalOrderRevenue,
      },
      dailySales: dailySalesList,
      users: allUsers.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
      books: allBooks.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })),
      stores: [...libraries, ...bookstores].map(s => ({ ...s, createdAt: s.createdAt.toISOString() })),
      subscriptions: subs.map(s => ({
        ...s,
        createdAt: s.createdAt?.toISOString() ?? null,
        startedAt: s.startedAt?.toISOString() ?? null,
        expiresAt: s.expiresAt?.toISOString() ?? null,
      })),
    });
  } catch (err: any) {
    console.error("Owner comprehensive stats fetch failed:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

export default router;

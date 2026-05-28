import { Router } from "express";
import { db, subscriptionsTable, storesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const PLANS: Record<string, { label: string; days: number; price: number }> = {
  monthly:   { label: "Oylik",       days: 30,  price: 29900 },
  biannual:  { label: "Yarim yillik", days: 180, price: 149900 },
  annual:    { label: "Yillik",      days: 365, price: 249900 },
};

const STORE_OWNER_PRICE = 200000;

const router = Router();

router.get("/plans", (_req, res) => {
  res.json({ plans: Object.entries(PLANS).map(([key, v]) => ({ key, ...v })) });
});

router.get("/my", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const subs = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt));
  res.json({ subscriptions: subs });
});

router.get("/store/:storeId", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const storeId = parseInt(String(req.params.storeId));
  const now = new Date();
  const active = await db.select().from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.userId, userId),
      eq(subscriptionsTable.storeId, storeId),
      eq(subscriptionsTable.status, "active"),
    ));
  const isActive = active.some(s => s.expiresAt && new Date(s.expiresAt) > now);
  res.json({ active: isActive, subscriptions: active });
});

router.post("/create", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { storeId, plan } = req.body as { storeId: number; plan: string };
  if (!storeId || !plan) { res.status(400).json({ error: "Noto'g'ri so'rov" }); return; }

  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Kutubxona/do'kon topilmadi" }); return; }

  if (store.type === "bookstore") {
    // Bookstores are completely free to subscribe/join!
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 365); // Free active membership for 1 year
    const [sub] = await db.insert(subscriptionsTable).values({
      userId,
      storeId,
      type: "reader",
      plan: "monthly",
      price: 0,
      status: "active",
      startedAt: now,
      expiresAt: expires,
    }).returning();
    res.json({ subscription: sub, checkoutUrl: null });
    return;
  }

  // Libraries charge their own custom subscription price
  const monthlyPrice = store.subscriptionPrice || 29900;
  let activePrice = monthlyPrice;
  let days = 30;

  if (plan === "biannual") {
    activePrice = Math.round(monthlyPrice * 5); // 6 months for the price of 5 months
    days = 180;
  } else if (plan === "annual") {
    activePrice = Math.round(monthlyPrice * 9); // 12 months for the price of 9 months
    days = 365;
  }

  const [sub] = await db.insert(subscriptionsTable).values({
    userId,
    storeId,
    plan,
    price: activePrice,
    status: "pending",
  }).returning();

  const merchantId = process.env.PAYME_MERCHANT_ID ?? "test_merchant";
  const testMode = process.env.PAYME_TEST_MODE !== "false";
  const baseUrl = testMode ? "https://test.paycom.uz" : "https://checkout.paycom.uz";
  const returnUrl = `${process.env.FRONTEND_URL ?? ""}/payment/success?type=subscription`;
  const params = `m=${merchantId};ac.subscription_id=${sub.id};a=${activePrice * 100};l=uz;c=${encodeURIComponent(returnUrl)}`;
  const checkoutUrl = `${baseUrl}/${Buffer.from(params).toString("base64")}`;

  res.json({ subscription: sub, checkoutUrl });
});

router.get("/owner-status/:storeId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Do'kon topilmadi" }); return; }
  const now = new Date();
  const activeSubs = await db.select().from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.storeId, storeId),
      eq(subscriptionsTable.status, "active"),
    ));
  const isActive = activeSubs.some(s => s.expiresAt && new Date(s.expiresAt) > now);
  const latestSub = activeSubs.sort((a, b) =>
    (b.expiresAt?.getTime() ?? 0) - (a.expiresAt?.getTime() ?? 0)
  )[0] ?? null;
  res.json({
    isActive,
    price: STORE_OWNER_PRICE,
    subscription: latestSub ? { ...latestSub, expiresAt: latestSub.expiresAt?.toISOString() ?? null } : null,
  });
});

router.post("/activate-store", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { storeId } = req.body as { storeId: number };
  if (!storeId) { res.status(400).json({ error: "storeId required" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Do'kon topilmadi" }); return; }
  if (store.ownerId !== userId) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + 30);
  const [sub] = await db.insert(subscriptionsTable).values({
    userId,
    storeId,
    type: "owner",
    plan: "store_monthly",
    price: STORE_OWNER_PRICE,
    status: "active",
    startedAt: now,
    expiresAt: expires,
  }).returning();
  res.json({ success: true, subscription: { ...sub, expiresAt: sub.expiresAt?.toISOString() ?? null } });
});

export default router;

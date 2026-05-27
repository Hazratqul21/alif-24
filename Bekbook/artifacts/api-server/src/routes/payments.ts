import { Router } from "express";
import { db, ordersTable, booksTable, listingFeesTable, storesTable, payoutsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import type { Request } from "express";
import crypto from "crypto";

const router = Router();

const MERCHANT_ID = process.env["PAYME_MERCHANT_ID"] ?? "";
const SECRET_KEY = process.env["PAYME_SECRET_KEY"] ?? "";
const TEST_MODE = process.env["PAYME_TEST_MODE"] !== "false";

const ERRS = {
  ORDER_NOT_FOUND:    { code: -31050, message: { ru: "Заказ не найден", uz: "Buyurtma topilmadi", en: "Order not found" } },
  ORDER_CANNOT:       { code: -31008, message: { ru: "Невозможно выполнить", uz: "Bajarib bo'lmaydi", en: "Cannot perform" } },
  WRONG_AMOUNT:       { code: -31001, message: { ru: "Неверная сумма", uz: "Noto'g'ri miqdor", en: "Wrong amount" } },
  ALREADY_PAID:       { code: -31099, message: { ru: "Уже оплачен", uz: "Allaqachon to'langan", en: "Already paid" } },
  METHOD_NOT_FOUND:   { code: -32601, message: "Method not found" },
  INTERNAL:           { code: -32603, message: "Internal error" },
};

function checkPaymeAuth(req: Request): boolean {
  if (!SECRET_KEY) return false;
  const auth = req.headers["authorization"] ?? "";
  const expected = "Basic " + Buffer.from(`Paycom:${SECRET_KEY}`).toString("base64");
  return auth === expected;
}

router.post("/book-listing", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const token = crypto.randomBytes(32).toString("hex");
  const [fee] = await db.insert(listingFeesTable).values({
    userId,
    amount: 10000,
    status: "pending",
    token,
  }).returning();
  res.json({ token: fee.token, amount: fee.amount });
});

router.post("/book-listing/pay", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { token } = req.body as { token: string };
  if (!token) { res.status(400).json({ error: "token required" }); return; }
  const [fee] = await db.select().from(listingFeesTable)
    .where(and(eq(listingFeesTable.token, token), eq(listingFeesTable.userId, userId)))
    .limit(1);
  if (!fee) { res.status(404).json({ error: "To'lov topilmadi" }); return; }
  if (fee.status !== "pending") { res.status(400).json({ error: "To'lov allaqachon amalga oshirilgan" }); return; }
  await db.update(listingFeesTable).set({ status: "paid" }).where(eq(listingFeesTable.id, fee.id));
  res.json({ success: true, token: fee.token });
});

router.post("/create", requireAuth, async (req, res) => {
  const bookId = parseInt(String(req.body.bookId));
  if (isNaN(bookId)) { res.status(400).json({ error: "bookId required" }); return; }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!book) { res.status(404).json({ error: "Kitob topilmadi" }); return; }
  if (book.type !== "sell") { res.status(400).json({ error: "Bu kitob sotuvda emas" }); return; }
  if (book.status !== "available") { res.status(400).json({ error: "Kitob hozir mavjud emas" }); return; }
  if (!book.price || book.price <= 0) { res.status(400).json({ error: "Kitob narxi belgilanmagan" }); return; }
  if (book.userId === req.user!.userId) { res.status(400).json({ error: "O'z kitobingizni sotib ololmaysiz" }); return; }

  const amountTiyin = Math.round(book.price * 100);

  const [order] = await db.insert(ordersTable).values({
    buyerId: req.user!.userId,
    bookId: book.id,
    amount: amountTiyin,
    status: "pending",
  }).returning();

  const params = `m=${MERCHANT_ID};ac.order_id=${order.id};a=${amountTiyin};l=uz`;
  const encoded = Buffer.from(params).toString("base64");
  const checkoutBase = TEST_MODE ? "https://test.paycom.uz" : "https://checkout.paycom.uz";
  const checkoutUrl = `${checkoutBase}/${encoded}`;

  res.json({ orderId: order.id, checkoutUrl, amount: amountTiyin });
});

router.get("/orders/my", requireAuth, async (req, res) => {
  const orders = await db.select().from(ordersTable)
    .where(eq(ordersTable.buyerId, req.user!.userId));

  const result = await Promise.all(orders.map(async o => {
    const book = o.bookId
      ? (await db.select({ id: booksTable.id, title: booksTable.title, author: booksTable.author, image: booksTable.image })
          .from(booksTable).where(eq(booksTable.id, o.bookId)).limit(1))[0] ?? null
      : null;
    return {
      ...o,
      amount: Number(o.amount),
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      cancelledAt: o.cancelledAt?.toISOString() ?? null,
      book,
    };
  }));

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ orders: result });
});

router.post("/payme", async (req, res) => {
  if (!checkPaymeAuth(req)) {
    res.status(401).json({ jsonrpc: "2.0", id: req.body?.id ?? 0, error: { code: -32504, message: "Unauthorized" } });
    return;
  }

  const { method, params, id } = req.body ?? {};

  const ok = (result: object) => res.json({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: unknown) => res.json({ jsonrpc: "2.0", id, error: { code, message } });

  try {
    if (method === "CheckPerformTransaction") {
      const orderId = parseInt(String(params?.account?.order_id));
      if (isNaN(orderId)) { fail(ERRS.ORDER_NOT_FOUND.code, ERRS.ORDER_NOT_FOUND.message); return; }
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
      if (!order) { fail(ERRS.ORDER_NOT_FOUND.code, ERRS.ORDER_NOT_FOUND.message); return; }
      if (order.status === "paid") { fail(ERRS.ALREADY_PAID.code, ERRS.ALREADY_PAID.message); return; }
      if (order.status === "cancelled") { fail(ERRS.ORDER_CANNOT.code, ERRS.ORDER_CANNOT.message); return; }
      if (Number(params?.amount) !== Number(order.amount)) { fail(ERRS.WRONG_AMOUNT.code, ERRS.WRONG_AMOUNT.message); return; }
      ok({ allow: true });

    } else if (method === "CreateTransaction") {
      const orderId = parseInt(String(params?.account?.order_id));
      if (isNaN(orderId)) { fail(ERRS.ORDER_NOT_FOUND.code, ERRS.ORDER_NOT_FOUND.message); return; }
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
      if (!order) { fail(ERRS.ORDER_NOT_FOUND.code, ERRS.ORDER_NOT_FOUND.message); return; }
      if (order.status === "paid") { fail(ERRS.ALREADY_PAID.code, ERRS.ALREADY_PAID.message); return; }
      if (order.status === "cancelled") { fail(ERRS.ORDER_CANNOT.code, ERRS.ORDER_CANNOT.message); return; }
      if (Number(params?.amount) !== Number(order.amount)) { fail(ERRS.WRONG_AMOUNT.code, ERRS.WRONG_AMOUNT.message); return; }
      if (order.paymeTransactionId && order.paymeTransactionId !== params?.id) {
        fail(ERRS.ORDER_CANNOT.code, ERRS.ORDER_CANNOT.message); return;
      }
      if (!order.paymeTransactionId) {
        await db.update(ordersTable).set({ paymeTransactionId: params.id, paymeState: 1, status: "processing" })
          .where(eq(ordersTable.id, orderId));
      }
      ok({ create_time: order.createdAt.getTime(), transaction: String(order.id), state: 1 });

    } else if (method === "PerformTransaction") {
      const [order] = await db.select().from(ordersTable)
        .where(eq(ordersTable.paymeTransactionId, params?.id)).limit(1);
      if (!order) { fail(ERRS.ORDER_NOT_FOUND.code, ERRS.ORDER_NOT_FOUND.message); return; }
      if (order.status === "paid") {
        ok({ perform_time: order.paidAt!.getTime(), transaction: String(order.id), state: 2 }); return;
      }
      const now = new Date();
      await db.update(ordersTable).set({ status: "paid", paymeState: 2, paidAt: now })
        .where(eq(ordersTable.id, order.id));
      if (order.bookId) {
        await db.update(booksTable).set({ status: "reserved" }).where(eq(booksTable.id, order.bookId));
        // Deposit funds to bookstore escrow (pendingBalance)
        const [book] = await db.select().from(booksTable).where(eq(booksTable.id, order.bookId)).limit(1);
        if (book && book.userId) {
          const [store] = await db.select().from(storesTable).where(eq(storesTable.ownerId, book.userId)).limit(1);
          if (store) {
            const newPending = Number(store.pendingBalance || 0) + Number(order.amount);
            await db.update(storesTable).set({ pendingBalance: newPending }).where(eq(storesTable.id, store.id));
          }
        }
      }
      ok({ perform_time: now.getTime(), transaction: String(order.id), state: 2 });

    } else if (method === "CancelTransaction") {
      const [order] = await db.select().from(ordersTable)
        .where(eq(ordersTable.paymeTransactionId, params?.id)).limit(1);
      if (!order) { fail(ERRS.ORDER_NOT_FOUND.code, ERRS.ORDER_NOT_FOUND.message); return; }
      if (order.status === "paid") { fail(ERRS.ORDER_CANNOT.code, ERRS.ORDER_CANNOT.message); return; }
      const now = new Date();
      const newState = (order.paymeState ?? 0) === 2 ? -2 : -1;
      await db.update(ordersTable).set({
        status: "cancelled", paymeState: newState,
        cancelledAt: now, cancelReason: params?.reason ?? null,
      }).where(eq(ordersTable.id, order.id));
      ok({ cancel_time: now.getTime(), transaction: String(order.id), state: newState });

    } else if (method === "CheckTransaction") {
      const [order] = await db.select().from(ordersTable)
        .where(eq(ordersTable.paymeTransactionId, params?.id)).limit(1);
      if (!order) { fail(ERRS.ORDER_NOT_FOUND.code, ERRS.ORDER_NOT_FOUND.message); return; }
      ok({
        create_time: order.createdAt.getTime(),
        perform_time: order.paidAt?.getTime() ?? 0,
        cancel_time: order.cancelledAt?.getTime() ?? 0,
        transaction: String(order.id),
        state: order.paymeState ?? 0,
        reason: order.cancelReason ?? null,
      });

    } else if (method === "GetStatement") {
      const from = new Date(params?.from ?? 0);
      const to = new Date(params?.to ?? Date.now());
      const orders = await db.select().from(ordersTable)
        .where(and(gte(ordersTable.createdAt, from), lte(ordersTable.createdAt, to)));
      ok({
        transactions: orders.filter(o => o.paymeTransactionId).map(o => ({
          id: o.paymeTransactionId,
          time: o.createdAt.getTime(),
          amount: Number(o.amount),
          account: { order_id: o.id },
          create_time: o.createdAt.getTime(),
          perform_time: o.paidAt?.getTime() ?? 0,
          cancel_time: o.cancelledAt?.getTime() ?? 0,
          transaction: String(o.id),
          state: o.paymeState ?? 0,
          reason: o.cancelReason ?? null,
        })),
      });

    } else {
      fail(ERRS.METHOD_NOT_FOUND.code, ERRS.METHOD_NOT_FOUND.message);
    }
  } catch {
    fail(ERRS.INTERNAL.code, ERRS.INTERNAL.message);
  }
});

// Confirm Delivery & Release Escrow Funds
router.post("/orders/:orderId/confirm-delivery", requireAuth, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId));
  if (isNaN(orderId)) {
    res.status(400).json({ error: "orderId is invalid" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.buyerId !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden: You are not the buyer of this order" });
    return;
  }
  if (order.status !== "paid") {
    res.status(400).json({ error: "Order has not been paid yet" });
    return;
  }
  if (order.deliveryStatus === "confirmed") {
    res.status(400).json({ error: "Delivery has already been confirmed" });
    return;
  }

  // Update order deliveryStatus to confirmed
  await db.update(ordersTable).set({ deliveryStatus: "confirmed" }).where(eq(ordersTable.id, orderId));

  if (order.bookId) {
    // Release the book to reserved/sold
    await db.update(booksTable).set({ status: "reserved" }).where(eq(booksTable.id, order.bookId));
    
    // Find store wallet
    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, order.bookId)).limit(1);
    if (book && book.userId) {
      const [store] = await db.select().from(storesTable).where(eq(storesTable.ownerId, book.userId)).limit(1);
      if (store) {
        // Calculate Platform Commission Fee (5%)
        const commission = Math.round(Number(order.amount) * 0.05);
        const netAmount = Number(order.amount) - commission;

        const newPending = Math.max(0, Number(store.pendingBalance || 0) - Number(order.amount));
        const newWithdrawable = Number(store.withdrawableBalance || 0) + netAmount;

        await db.update(storesTable).set({
          pendingBalance: newPending,
          withdrawableBalance: newWithdrawable,
        }).where(eq(storesTable.id, store.id));
      }
    }
  }
  res.json({ success: true, message: "Delivery confirmed and funds released to seller's withdrawable wallet!" });
});

// Payout / Withdrawal Request Endpoint
router.post("/payouts", requireAuth, async (req, res) => {
  const { amount, cardMask } = req.body;
  if (!amount || !cardMask || isNaN(amount) || amount <= 0) {
    res.status(400).json({ error: "amount and cardMask are required" });
    return;
  }

  // Find store owner's store
  const [store] = await db.select().from(storesTable).where(eq(storesTable.ownerId, req.user!.userId)).limit(1);
  if (!store) {
    res.status(403).json({ error: "Only store owners can request payouts" });
    return;
  }

  const withdrawAmountTiyin = Math.round(amount * 100);
  if (Number(store.withdrawableBalance || 0) < withdrawAmountTiyin) {
    res.status(400).json({ error: "Mablag' yetarli emas (Balansingizda yetarli pul yo'q)" });
    return;
  }

  // Deduct from withdrawableBalance
  const newWithdrawable = Number(store.withdrawableBalance) - withdrawAmountTiyin;
  await db.update(storesTable).set({ withdrawableBalance: newWithdrawable }).where(eq(storesTable.id, store.id));

  // Insert payout request
  const [payout] = await db.insert(payoutsTable).values({
    storeId: store.id,
    amount: withdrawAmountTiyin,
    cardMask,
    status: "pending",
  }).returning();

  res.json({ success: true, message: "Payout request submitted successfully!", payout });
});

// Get My Bookstore Payout Requests
router.get("/payouts/my", requireAuth, async (req, res) => {
  const [store] = await db.select().from(storesTable).where(eq(storesTable.ownerId, req.user!.userId)).limit(1);
  if (!store) {
    res.json({ payouts: [] });
    return;
  }
  const payouts = await db.select().from(payoutsTable).where(eq(payoutsTable.storeId, store.id));
  res.json({ payouts });
});

export default router;

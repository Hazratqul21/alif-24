import { Router } from "express";
import { db, invoicesTable, invoiceItemsTable, storeBooksTable, storesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function safeInvoice(inv: typeof invoicesTable.$inferSelect, items: (typeof invoiceItemsTable.$inferSelect)[] = []) {
  return {
    ...inv,
    createdAt: inv.createdAt.toISOString(),
    items: items.map(it => ({
      ...it,
      unitPrice: it.unitPrice ? parseFloat(it.unitPrice) : 0,
    })),
  };
}

router.post("/", requireAuth, async (req, res) => {
  const { type, number, date, supplier, notes, items, storeId } = req.body;
  if (!type || !number || !date || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Validation error", message: "type, number, date, items are required" });
    return;
  }
  if (!storeId) {
    res.status(400).json({ error: "Validation error", message: "storeId is required" });
    return;
  }

  const [store] = await db.select().from(storesTable)
    .where(and(eq(storesTable.id, parseInt(storeId)), eq(storesTable.ownerId, String(req.user!.userId))))
    .limit(1);
  if (!store) { res.status(403).json({ error: "Forbidden", message: "Not the store owner" }); return; }

  const [invoice] = await db.insert(invoicesTable).values({
    storeId: parseInt(storeId),
    type,
    number,
    date,
    supplier: supplier || null,
    notes: notes || null,
    createdBy: String(req.user!.userId),
  }).returning();

  const insertedItems: (typeof invoiceItemsTable.$inferSelect)[] = [];
  for (const item of items) {
    const [it] = await db.insert(invoiceItemsTable).values({
      invoiceId: invoice.id,
      storeBookId: item.storeBookId ? parseInt(item.storeBookId) : null,
      title: item.title,
      author: item.author || null,
      isbn: item.isbn || null,
      quantity: parseInt(item.quantity) || 1,
      unitPrice: item.unitPrice ? String(item.unitPrice) : "0",
      reason: item.reason || null,
      inventoryNumbers: item.inventoryNumbers || null,
    }).returning();
    insertedItems.push(it);

    // For kirim: create new store books if no storeBookId given
    if (type === "kirim" && !item.storeBookId && item.title) {
      const qty = parseInt(item.quantity) || 1;
      for (let i = 0; i < qty; i++) {
        const invNum = item.inventoryNumbers
          ? item.inventoryNumbers.split(",")[i]?.trim() || null
          : null;
        await db.insert(storeBooksTable).values({
          storeId: parseInt(storeId),
          title: item.title,
          author: item.author || null,
          isbn: item.isbn || null,
          type: "rent",
          status: "available",
          stock: 1,
          condition: "active",
          inventoryNumber: invNum,
        });
      }
    }

    // For chiqim: update condition of referenced store book
    if (type === "chiqim" && item.storeBookId) {
      await db.update(storeBooksTable)
        .set({ condition: item.reason === "yo'qolgan" ? "lost" : "written_off", status: "rented" })
        .where(eq(storeBooksTable.id, parseInt(item.storeBookId)));
    }
  }

  res.status(201).json(safeInvoice(invoice, insertedItems));
});

router.get("/store/:storeId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const { type } = req.query as { type?: string };
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }

  let query = db.select().from(invoicesTable)
    .where(eq(invoicesTable.storeId, storeId))
    .orderBy(desc(invoicesTable.createdAt));

  const invs = await (type
    ? db.select().from(invoicesTable)
        .where(and(eq(invoicesTable.storeId, storeId), eq(invoicesTable.type, type)))
        .orderBy(desc(invoicesTable.createdAt))
    : query);

  const result = await Promise.all(invs.map(async inv => {
    const items = await db.select().from(invoiceItemsTable)
      .where(eq(invoiceItemsTable.invoiceId, inv.id));
    return safeInvoice(inv, items);
  }));

  res.json({ invoices: result });
});

router.get("/:invoiceId", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.invoiceId));
  if (isNaN(id)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
  if (!inv) { res.status(404).json({ error: "Not Found" }); return; }
  const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
  res.json(safeInvoice(inv, items));
});

router.delete("/:invoiceId", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.invoiceId));
  if (isNaN(id)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [inv] = await db.select().from(invoicesTable)
    .where(eq(invoicesTable.id, id)).limit(1);
  if (!inv) { res.status(404).json({ error: "Not Found" }); return; }
  await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
  res.status(204).send();
});

export default router;

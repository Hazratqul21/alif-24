import { Router } from "express";
import { db, booksCatalogTable, storeBooksTable, storesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const { search, limit = "50", offset = "0" } = req.query as Record<string, string>;

  let items = await db.select().from(booksCatalogTable).orderBy(booksCatalogTable.title);

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (b.author ?? "").toLowerCase().includes(q) ||
      (b.genre ?? "").toLowerCase().includes(q)
    );
  }

  const total = items.length;
  const paginated = items.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    items: paginated.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })),
    total,
  });
});

router.post("/", requireAuth, async (req, res) => {
  const { title, author, genre, description, isbn } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }

  const [item] = await db.insert(booksCatalogTable).values({ title, author, genre, description, isbn }).returning();
  res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
});

router.post("/stores/:storeId/from-catalog", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const { catalogIds, type = "rent", price = 0, stock = 1 } = req.body;

  if (!catalogIds || !Array.isArray(catalogIds) || catalogIds.length === 0) {
    res.status(400).json({ error: "catalogIds required" }); return;
  }

  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Store not found" }); return; }
  if (store.ownerId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const catalogItems = await db.select().from(booksCatalogTable);
  const selectedItems = catalogItems.filter(b => catalogIds.includes(b.id));

  if (selectedItems.length === 0) { res.status(400).json({ error: "No valid catalog items found" }); return; }

  const toInsert = selectedItems.map(b => ({
    storeId,
    title: b.title,
    author: b.author ?? undefined,
    description: b.description ?? undefined,
    isbn: b.isbn ?? undefined,
    type,
    price: Number(price),
    stock: Number(stock),
    status: "available",
    condition: "active",
  }));

  await db.insert(storeBooksTable).values(toInsert);

  res.status(201).json({ added: toInsert.length });
});

export default router;

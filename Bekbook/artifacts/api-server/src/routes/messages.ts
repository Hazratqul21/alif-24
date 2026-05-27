import { Router } from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = String(req.user!.userId);
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (other_id)
      other_id,
      u.name AS other_name,
      u.avatar AS other_avatar,
      m.body AS last_body,
      m.created_at AS last_at,
      (SELECT COUNT(*) FROM messages WHERE to_id = ${userId} AND from_id = other_id AND read_at IS NULL) AS unread_count
    FROM (
      SELECT CASE WHEN from_id = ${userId} THEN to_id ELSE from_id END AS other_id,
             body, created_at
      FROM messages
      WHERE from_id = ${userId} OR to_id = ${userId}
      ORDER BY created_at DESC
    ) m
    JOIN users u ON u.id = other_id
    ORDER BY other_id, m.created_at DESC
  `);
  res.json({ conversations: rows.rows });
});

router.get("/unread-count", requireAuth, async (req, res) => {
  const userId = String(req.user!.userId);
  const result = await db.execute(sql`SELECT COUNT(*) AS cnt FROM messages WHERE to_id = ${userId} AND read_at IS NULL`);
  const row = result.rows[0] as any;
  res.json({ count: Number(row?.cnt ?? 0) });
});

router.get("/:userId", requireAuth, async (req, res) => {
  const myId = String(req.user!.userId);
  const otherId = String(req.params.userId);
  await db.update(messagesTable)
    .set({ readAt: new Date() })
    .where(and(eq(messagesTable.toId, myId), eq(messagesTable.fromId, otherId)));
  const msgs = await db.select({
    id: messagesTable.id,
    fromId: messagesTable.fromId,
    toId: messagesTable.toId,
    bookId: messagesTable.bookId,
    body: messagesTable.body,
    readAt: messagesTable.readAt,
    createdAt: messagesTable.createdAt,
  }).from(messagesTable)
    .where(or(
      and(eq(messagesTable.fromId, myId), eq(messagesTable.toId, otherId)),
      and(eq(messagesTable.fromId, otherId), eq(messagesTable.toId, myId)),
    ))
    .orderBy(messagesTable.createdAt);
  res.json({ messages: msgs });
});

router.post("/", requireAuth, async (req, res) => {
  const fromId = String(req.user!.userId);
  const { toId, body, bookId } = req.body as { toId: string; body: string; bookId?: number };
  if (!toId || !body?.trim()) { res.status(400).json({ error: "toId va body kerak" }); return; }
  const [msg] = await db.insert(messagesTable).values({
    fromId, toId, body: body.trim(), bookId: bookId ?? null,
  }).returning();
  res.json({ message: msg });
});

export default router;

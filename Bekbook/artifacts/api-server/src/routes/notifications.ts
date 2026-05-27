import { Router } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = String(req.user!.userId);
  const notifs = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  const [unreadRow] = await db.select({ cnt: sql<number>`count(*)` })
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId));
  res.json({ notifications: notifs, unreadCount: notifs.filter(n => !n.readAt).length });
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(String(req.params.id));
  await db.update(notificationsTable)
    .set({ readAt: new Date() })
    .where(eq(notificationsTable.id, id));
  res.json({ ok: true });
});

router.patch("/read-all", requireAuth, async (req, res) => {
  const userId = String(req.user!.userId);
  await db.update(notificationsTable)
    .set({ readAt: new Date() })
    .where(eq(notificationsTable.userId, userId));
  res.json({ ok: true });
});

router.post("/bulk", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin" && req.user!.role !== "moderator") {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }
  const { title, body, link, userIds } = req.body as {
    title: string; body?: string; link?: string; userIds?: string[];
  };
  if (!title) { res.status(400).json({ error: "title kerak" }); return; }

  let targetIds: string[] = [];
  if (userIds && userIds.length > 0) {
    targetIds = userIds;
  } else {
    const users = await db.select({ id: usersTable.id }).from(usersTable);
    targetIds = users.map(u => u.id);
  }
  if (targetIds.length === 0) { res.json({ sent: 0 }); return; }

  const rows = targetIds.map(uid => ({ userId: uid, type: "bulk", title, body, link }));
  await db.insert(notificationsTable).values(rows);
  res.json({ sent: targetIds.length });
});

export async function sendNotification(userId: string, type: string, title: string, body?: string, link?: string) {
  await db.insert(notificationsTable).values({ userId, type, title, body, link });
}

export default router;

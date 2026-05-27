import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth.js";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { name, email, password, phone, lat, lng } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const id = String(Math.floor(10000000 + Math.random() * 90000000));
  const [user] = await db.insert(usersTable).values({
    id, name, email, passwordHash, phone: phone ?? null,
    lat: lat ?? null, lng: lng ?? null, readerId: id,
  }).returning();
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ token, user: { ...safeUser, createdAt: safeUser.createdAt.toISOString() } });
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  const { passwordHash: _, ...safeUser } = user;
  res.status(200).json({ token, user: { ...safeUser, createdAt: safeUser.createdAt.toISOString() } });
});

router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Not Found", message: "User not found" });
    return;
  }
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  const { passwordHash: _, ...safeUser } = user;
  res.json({ token, ...safeUser, createdAt: safeUser.createdAt.toISOString() });
});

router.post("/sso-verify", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: "Validation error", message: "token is required" });
    return;
  }
  try {
    const secret = process.env.JWT_SECRET || "alif24_jwt_secret_key";
    const decoded = jwt.verify(token, secret) as { userId: string; email?: string; role?: string };
    
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Not Found", message: "User not found in shared database" });
      return;
    }
    
    const localToken = signToken({ userId: user.id, email: user.email, role: user.role });
    const { passwordHash: _, ...safeUser } = user;
    res.status(200).json({ token: localToken, user: { ...safeUser, createdAt: safeUser.createdAt.toISOString() } });
  } catch (err) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid SSO token" });
  }
});

export default router;

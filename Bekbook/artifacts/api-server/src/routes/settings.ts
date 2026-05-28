import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsFilePath = path.join(__dirname, "../../../../settings.json");

const router = Router();

function getStoredPassword(): string {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && parsed.ownerPassword) {
        return parsed.ownerPassword;
      }
    }
  } catch (err) {
    console.error("Failed to read settings file:", err);
  }
  return "ozodbek123";
}

function savePassword(password: string) {
  try {
    const data = JSON.stringify({ ownerPassword: password }, null, 2);
    fs.writeFileSync(settingsFilePath, data, "utf-8");
  } catch (err) {
    console.error("Failed to write settings file:", err);
  }
}

router.get("/config", (req: Request, res: Response) => {
  res.json({ success: true, isConfigured: true });
});

router.post("/verify-password", (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: "Bad Request", message: "Parol kiritilishi shart" });
    return;
  }
  const current = getStoredPassword();
  if (password === current) {
    res.json({ success: true, token: "ozodbek_secret_session_token_2026" });
  } else {
    res.status(401).json({ success: false, error: "Unauthorized", message: "Noto'g'ri parol" });
  }
});

router.post("/change-password", (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Bad Request", message: "Barcha parollar kiritilishi shart" });
    return;
  }
  const current = getStoredPassword();
  if (currentPassword !== current) {
    res.status(401).json({ success: false, error: "Unauthorized", message: "Amaldagi parol noto'g'ri" });
    return;
  }
  savePassword(newPassword);
  res.json({ success: true, message: "Parol muvaffaqiyatli o'zgartirildi" });
});

export default router;

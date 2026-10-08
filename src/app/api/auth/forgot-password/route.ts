export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { json, jsonError } from "@/lib/auth";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";

export async function POST(req: Request) {
  setRequestId(generateRequestId());
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Valid email is required", 400);
    }

    const db = await getDb();
    const user = await (await db.prepare("SELECT id, name FROM users WHERE email = ?")).get(email) as { id: string; name: string } | undefined;
    if (!user) return json({ message: "If that email exists, a reset link has been sent" });

    // Rate-limit token issuance: max 3 per email per hour to prevent mailbox bombs.
    const perHour = await (await db.prepare(
      "SELECT COUNT(*) as c FROM reset_tokens WHERE email = ? AND created_at >= datetime('now', '-1 hour')"
    )).get(email) as { c: number } | undefined;
    if ((perHour?.c ?? 0) >= 3) {
      return jsonError("Too many reset requests. Try again later.", 429);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await (await db.prepare(`
      INSERT INTO reset_tokens (id, email, token, expires_at, used)
      VALUES (?, ?, ?, ?, 0)
    `)).run(genId("rtk"), email, token, expiresAt);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password/${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    logger.info("[Auth] Password reset token generated and emailed", { email });
    return json({ message: "If that email exists, a reset link has been sent" });
  } catch (error) {
    logger.error("auth/forgot-password failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to process request", 500);
  }
}

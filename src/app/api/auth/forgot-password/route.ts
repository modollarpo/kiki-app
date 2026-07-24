export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { json, jsonError } from "@/lib/auth";
import crypto from "crypto";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";

export async function POST(req: Request) {
  setRequestId(generateRequestId());
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Valid email is required", 400);
    }

    const db = await getDb();
    const user = await (await db.prepare("SELECT id FROM users WHERE email = ?")).get(email) as { id: string } | undefined;
    if (!user) return json({ message: "If that email exists, a reset link has been sent" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await (await db.prepare(`
      INSERT INTO reset_tokens (id, email, token, expires_at, used)
      VALUES (?, ?, ?, ?, 0)
    `)).run(genId("rtk"), email, token, expiresAt);

    logger.info("[Auth] Password reset token generated", { email });

    return json({ message: "If that email exists, a reset link has been sent" });
  } catch (error) {
    logger.error("auth/forgot-password failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to process request", 500);
  }
}

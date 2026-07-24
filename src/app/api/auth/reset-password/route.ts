export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { hashPassword, json, jsonError } from "@/lib/auth";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";

export async function POST(req: Request) {
  setRequestId(generateRequestId());
  try {
    const { token, password } = await req.json();
    if (!token || !password) return jsonError("Token and password are required", 400);
    if (password.length < 8) return jsonError("Password must be at least 8 characters", 400);

    const db = await getDb();
    const row = await (await db.prepare(`
      SELECT id, email, expires_at, used FROM reset_tokens WHERE token = ?
    `)).get(token) as { id: string; email: string; expires_at: string; used: number } | undefined;

    if (!row) return jsonError("Invalid or expired reset token", 404);
    if (row.used) return jsonError("Reset token has already been used", 400);
    if (new Date(row.expires_at) < new Date()) return jsonError("Reset token has expired", 400);

    const hashed = hashPassword(password);
    await (await db.prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")).run(hashed, row.email);
    await (await db.prepare("UPDATE reset_tokens SET used = 1 WHERE id = ?")).run(row.id);

    logger.info("[Auth] Password reset completed", { email: row.email });
    return json({ message: "Password has been reset successfully" });
  } catch (error) {
    logger.error("auth/reset-password failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to reset password", 500);
  }
}

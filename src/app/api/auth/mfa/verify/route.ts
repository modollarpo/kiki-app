export const dynamic = "force-dynamic";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { verifyTotp, generateBackupCodes, hashBackupCodes } from "@/lib/mfa";

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : typeof body.code === "string" ? body.code : "";
    if (!token) return jsonError("Verification code required", 400);

    const db = await getDb();
    const row = await db
      .prepare("SELECT mfa_secret FROM users WHERE id = ?")
      .get(user.id) as { mfa_secret?: string | null } | undefined;

    if (!row?.mfa_secret) return jsonError("MFA is not configured. Start setup first.", 400);
    if (!verifyTotp(token, row.mfa_secret)) return jsonError("Invalid verification code", 401);

    const backupCodes = generateBackupCodes();
    const hashed = hashBackupCodes(backupCodes);
    await db
      .prepare("UPDATE users SET mfa_enabled = 1, mfa_backup_codes = ? WHERE id = ?")
      .run(JSON.stringify(hashed), user.id);

    return json({ enabled: true, backupCodes });
  } catch {
    return jsonError("Failed to verify MFA", 500);
  }
}

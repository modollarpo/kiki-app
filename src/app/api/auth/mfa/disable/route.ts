export const dynamic = "force-dynamic";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { verifyTotp, verifyAndConsumeBackupCode } from "@/lib/mfa";

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return jsonError("Verification code required to disable MFA", 400);

    const db = await getDb();
    const row = await db
      .prepare("SELECT mfa_secret, mfa_backup_codes FROM users WHERE id = ?")
      .get(user.id) as { mfa_secret?: string | null; mfa_backup_codes?: string | null } | undefined;

    if (!row?.mfa_secret) return jsonError("MFA is not enabled", 400);

    const totpValid = verifyTotp(token, row.mfa_secret);
    const backup = totpValid ? { valid: false } : verifyAndConsumeBackupCode(token, row.mfa_backup_codes ?? null);
    if (!totpValid && !backup.valid) return jsonError("Invalid verification code", 401);

    await db
      .prepare("UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = ?")
      .run(user.id);

    return json({ enabled: false });
  } catch {
    return jsonError("Failed to disable MFA", 500);
  }
}

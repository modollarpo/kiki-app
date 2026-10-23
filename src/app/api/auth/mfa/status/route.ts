export const dynamic = "force-dynamic";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const row = await db
      .prepare("SELECT mfa_enabled, mfa_secret, mfa_backup_codes FROM users WHERE id = ?")
      .get(user.id) as { mfa_enabled?: number; mfa_secret?: string | null; mfa_backup_codes?: string | null } | undefined;

    let backupCodesRemaining = 0;
    if (row?.mfa_backup_codes) {
      try {
        const parsed = JSON.parse(row.mfa_backup_codes);
        if (Array.isArray(parsed)) backupCodesRemaining = parsed.length;
      } catch { /* ignore malformed */ }
    }

    return json({
      enabled: !!row?.mfa_enabled,
      configured: !!row?.mfa_secret,
      backupCodesRemaining,
    });
  } catch {
    return jsonError("Failed to load MFA status", 500);
  }
}

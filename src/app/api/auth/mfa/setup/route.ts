export const dynamic = "force-dynamic";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { generateSecret, buildOtpauthUri } from "@/lib/mfa";
import QRCode from "qrcode";

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const secret = generateSecret();
    const otpauth = buildOtpauthUri(user.email, secret);
    await db
      .prepare("UPDATE users SET mfa_secret = ?, mfa_enabled = 0, mfa_backup_codes = NULL WHERE id = ?")
      .run(secret, user.id);
    const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 240 });
    return json({ secret, otpauth, qrDataUrl, issuer: "KIKI", account: user.email });
  } catch {
    return jsonError("Failed to setup MFA", 500);
  }
}

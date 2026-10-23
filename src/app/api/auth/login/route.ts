export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, json, jsonError } from "@/lib/auth";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { checkRateLimitDistributed } from "@/lib/rate-limit-redis";
import { loginSchema } from "@/lib/validation";
import { verifyTotp, verifyAndConsumeBackupCode } from "@/lib/mfa";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";
import { ZodError } from "zod";

export async function POST(req: Request) {
  setRequestId(generateRequestId());
  try {
    const rl = await checkRateLimitDistributed(`login:${getClientIp(req)}`, { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = loginSchema.parse(body);

    const db = await getDb();
    const user = await (await db.prepare("SELECT * FROM users WHERE email = ?")).get(
      parsed.email
    ) as Record<string, unknown> | undefined;

    if (!user || !verifyPassword(parsed.password, String(user.password || ""))) {
      return jsonError("Invalid email or password", 401);
    }

    const mfaEnabled = !!(user.mfa_enabled as number | undefined);
    if (mfaEnabled) {
      const code = (parsed.mfaCode || "").trim();
      if (!code) {
        return json(
          { ok: false, error: "Enter your authenticator code to continue", code: "MFA_REQUIRED", mfaRequired: true },
          401
        );
      }

      let verified = false;
      if (user.mfa_secret) {
        verified = verifyTotp(code, String(user.mfa_secret));
      }

      if (!verified) {
        const backup = verifyAndConsumeBackupCode(
          code,
          user.mfa_backup_codes ? String(user.mfa_backup_codes) : null
        );
        if (backup.valid) {
          verified = true;
          await (await db.prepare("UPDATE users SET mfa_backup_codes = ? WHERE id = ?")).run(
            JSON.stringify(backup.remaining),
            String(user.id)
          );
        }
      }

      if (!verified) {
        return json(
          { ok: false, error: "Invalid authenticator code", code: "MFA_INVALID", mfaRequired: true },
          401
        );
      }
    }

    const token = createSession({
      id: String(user.id),
      email: String(user.email),
      name: String(user.name || ""),
      role: String(user.role || "advertiser"),
      tenantId: String(user.tenant_id),
      tenantName: String(user.tenant_name || ""),
      plan: String(user.plan || "growth"),
      avatarInitials: String(user.avatar_initials || ""),
    });

    await (await db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?")).run(String(user.id));

    return json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
        tenantName: user.tenant_name,
        plan: user.plan,
        avatarInitials: user.avatar_initials,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.errors[0]?.message || "Invalid input", 400);
    }
    logger.error("auth/login request failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonError("Invalid request body", 400);
  }
}

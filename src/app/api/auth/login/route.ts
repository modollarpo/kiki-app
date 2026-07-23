export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, json, jsonError } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";
import { ZodError } from "zod";

export async function POST(req: Request) {
  setRequestId(generateRequestId());
  try {
    const rl = checkRateLimit(`login:${getClientIp(req)}`, { maxRequests: 10, windowMs: 60_000 });
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

    await (await db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?")).run(user.id);

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

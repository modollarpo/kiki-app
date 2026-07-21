export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, json, jsonError, validateEmail, validateRequired } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // Brute-force protection: 10 login attempts per IP per minute.
    const rl = rateLimit(`login:${clientKey(req)}`, 10, 60_000);
    if (!rl.ok) {
      return jsonError("Too many login attempts. Please try again later.", 429);
    }

    const body = await req.json();
    const { email, password } = body;

    const missing = validateRequired({ email, password });
    if (missing) return jsonError(missing);

    if (typeof email !== "string" || typeof password !== "string") {
      return jsonError("Invalid request body");
    }

    if (!validateEmail(email)) return jsonError("Invalid email address");
    if (password.length < 6 || password.length > 128) return jsonError("Password must be 6-128 characters");

    const db = await getDb();
    const user = await (await db.prepare("SELECT * FROM users WHERE email = ?")).get(email.toLowerCase().trim()) as {
      id: string; email: string; name: string; password: string;
      role: string; tenant_id: string; tenant_name: string;
      plan: string; avatar_initials: string;
    } | undefined;

    if (!user || !verifyPassword(password, user.password)) {
      return jsonError("Invalid email or password", 401);
    }

    const token = createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
      plan: user.plan,
      avatarInitials: user.avatar_initials,
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
    logger.error("auth/login request failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Invalid request body", 400);
  }
}

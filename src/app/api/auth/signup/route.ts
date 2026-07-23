export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import {
  hashPassword,
  createSession,
  json,
  jsonError,
  validateEmail,
  validateRequired,
  sanitizeString,
} from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`signup:${clientKey(req)}`, 5, 60_000);
    if (!rl.ok) {
      return jsonError("Too many signup attempts. Please try again later.", 429);
    }

    const body = await req.json();
    const { email, password, name, companyName } = body;

    const missing = validateRequired({ email, password, name });
    if (missing) return jsonError(missing);

    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      return jsonError("Invalid request body");
    }

    if (!validateEmail(email)) return jsonError("Invalid email address");
    if (password.length < 8 || password.length > 128) return jsonError("Password must be 8-128 characters");
    if (name.length < 2 || name.length > 100) return jsonError("Name must be 2-100 characters");

    const db = await getDb();

    const existing = await (await db.prepare("SELECT id FROM users WHERE email = ?")).get(
      email.toLowerCase().trim()
    );
    if (existing) {
      return jsonError("An account with this email already exists", 409);
    }

    const userId = genId("usr");
    const tenantId = genId("tnt");
    const tenantName = sanitizeString(companyName || `${name}'s Organization`, 200);
    const hashedPassword = hashPassword(password);
    const initials = name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const trialEndsAt = new Date(Date.now() + 14 * 86400000).toISOString();
    await (
      await db.prepare(`
        INSERT INTO users (id, email, name, password, role, tenant_id, tenant_name, plan, avatar_initials, trial_ends_at)
        VALUES (?, ?, ?, ?, 'advertiser', ?, ?, 'growth', ?, ?)
      `)
    ).run(userId, email.toLowerCase().trim(), sanitizeString(name, 100), hashedPassword, tenantId, tenantName, initials, trialEndsAt);

    await (
      await db.prepare(`
        INSERT INTO wallets (id, tenant_id, balance, currency)
        VALUES (?, ?, 1000, 'USD')
      `)
    ).run(genId("wlt"), tenantId);

    const token = createSession({
      id: userId,
      email: email.toLowerCase().trim(),
      name: sanitizeString(name, 100),
      role: "advertiser",
      tenantId,
      tenantName,
      plan: "starter",
      avatarInitials: initials,
    });

    return json({
      token,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        name: sanitizeString(name, 100),
        role: "advertiser",
        tenantId,
        tenantName,
        plan: "growth",
        avatarInitials: initials,
      },
    }, 201);
  } catch (error) {
    logger.error("auth/signup request failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Signup failed. Please try again.", 500);
  }
}

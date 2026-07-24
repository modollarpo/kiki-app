export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { hashPassword, createSession, json, jsonError } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validation";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";
import { ZodError } from "zod";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  setRequestId(generateRequestId());
  try {
    const rl = checkRateLimit(`signup:${getClientIp(req)}`, { maxRequests: 5, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = signupSchema.parse(body);

    const db = await getDb();

    const existing = await (await db.prepare("SELECT id FROM users WHERE email = ?")).get(parsed.email);
    if (existing) {
      return jsonError("An account with this email already exists", 409);
    }

    const userId = genId("usr");
    const tenantId = genId("tnt");
    const tenantName = parsed.companyName || `${parsed.name.split(" ")[0]}'s Organization`;
    const hashedPassword = hashPassword(parsed.password);
    const initials = parsed.name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

    const trialEndsAt = new Date(Date.now() + 14 * 86400000).toISOString();
    await (
      await db.prepare(`
        INSERT INTO users (id, email, name, password, role, tenant_id, tenant_name, plan, avatar_initials, trial_ends_at)
        VALUES (?, ?, ?, ?, 'advertiser', ?, ?, 'growth', ?, ?)
      `)
    ).run(userId, parsed.email, parsed.name, hashedPassword, tenantId, tenantName, initials, trialEndsAt);

    await (
      await db.prepare(`
        INSERT INTO wallets (id, tenant_id, balance, currency)
        VALUES (?, ?, 1000, 'USD')
      `)
    ).run(genId("wlt"), tenantId);

    // Auto-seed sample campaigns and signals so dashboard isn't blank
    const insertCampaign = db.prepare(`
      INSERT INTO campaigns (id, tenant_id, name, platform, status, roas, spend, budget, impressions, clicks, conversions, cpa, ltv_predicted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of [
      [genId("cmp"), tenantId, "Getting Started Meta", "meta", "active", 0, 0, 500, 0, 0, 0, 0, 0],
      [genId("cmp"), tenantId, "Welcome Retargeting", "google", "draft", 0, 0, 300, 0, 0, 0, 0, 0],
    ]) await insertCampaign.run(...c);

    const insertSignal = db.prepare(`
      INSERT INTO signals (id, tenant_id, platform, event_type, value, ltv_predicted, ltv_confidence, enriched, delivered, raw_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);
    for (let i = 0; i < 3; i++) {
      await insertSignal.run(genId("sig"), tenantId, "meta", "page_view", 0, 25 + i * 10, 0.5, 0, 0, "{}", `-${(i + 1) * 10} minutes`);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    await sendWelcomeEmail(parsed.email, parsed.name, `${baseUrl}/dashboard`);

    const token = createSession({
      id: userId,
      email: parsed.email,
      name: parsed.name,
      role: "advertiser",
      tenantId,
      tenantName,
      plan: "growth",
      avatarInitials: initials,
    });

    return json({
      token,
      user: {
        id: userId,
        email: parsed.email,
        name: parsed.name,
        role: "advertiser",
        tenantId,
        tenantName,
        plan: "growth",
        avatarInitials: initials,
      },
    }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.errors[0]?.message || "Invalid input", 400);
    }
    logger.error("auth/signup request failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonError("Signup failed. Please try again.", 500);
  }
}

export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { checkRateLimitDistributed } from "@/lib/rate-limit-redis";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";
import { seedRouteEnabled, seedRouteShouldHide, seedWalletBalance } from "@/lib/env";

export async function POST(req: Request) {
  setRequestId(generateRequestId());

  // In production the endpoint is hidden (404) entirely unless demo seeding has
  // been explicitly enabled — the endpoint's existence is not disclosed.
  if (seedRouteShouldHide()) {
    return jsonError("Not found", 404);
  }

  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  // Only a superadmin may wipe and reseed a tenant's demo data, and only when
  // the explicit ALLOW_TENANT_SEED opt-in is present.
  if (!seedRouteEnabled(user.role)) {
    logger.warn("[Seed] Rejected — role not permitted or seeding not enabled", {
      tenantId: user.tenantId,
      userId: user.id,
      role: user.role,
    });
    return jsonError("Forbidden", 403);
  }

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  const rl = await checkRateLimitDistributed(`seed:${user.id}`, { maxRequests: 3, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);

  // Destructive: require an explicit confirmation flag so a stray request
  // cannot wipe a tenant's data.
  let body: { confirm?: unknown } = {};
  try {
    body = (await req.json()) as { confirm?: unknown };
  } catch {
    body = {};
  }
  if (body.confirm !== true) {
    return jsonError("Missing confirmation: send {\"confirm\": true} to seed demo data", 400);
  }

  try {
    const db = await getDb();
    const tid = user.tenantId;
    const ip = getClientIp(req);

    const existing = await (await db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = ?")).get(tid) as { c: number };
    if (existing.c > 0) {
      // NOTE: wallets are intentionally NOT deleted — the wallet holds real
      // balance and must survive a demo reseed.
      await (await db.prepare("DELETE FROM campaigns WHERE tenant_id = ?")).run(tid);
      await (await db.prepare("DELETE FROM signals WHERE tenant_id = ?")).run(tid);
      await (await db.prepare("DELETE FROM agents WHERE tenant_id = ?")).run(tid);
      await (await db.prepare("DELETE FROM notifications WHERE tenant_id = ?")).run(tid);
    }

    const insertCampaign = db.prepare(`
      INSERT INTO campaigns (id, tenant_id, name, platform, status, roas, spend, budget, impressions, clicks, conversions, cpa, ltv_predicted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const campaigns = [
      ["c_seed_1", tid, "Demo Meta Acquisition", "meta", "active", 3.85, 5200, 10000, 185000, 9800, 310, 16.77, 280],
      ["c_seed_2", tid, "Demo Google Retargeting", "google", "active", 5.42, 3800, 8000, 142000, 7600, 520, 7.31, 420],
    ];
    for (const c of campaigns) await insertCampaign.run(...c);

    const insertSignal = db.prepare(`
      INSERT INTO signals (id, tenant_id, campaign_id, platform, event_type, value, ltv_predicted, ltv_confidence, enriched, delivered, raw_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);
    for (let i = 0; i < 5; i++) {
      await insertSignal.run(
        genId("sig"), tid, "c_seed_1", "meta", "purchase",
        29.99 + i * 5, 150 + i * 30, 0.85, 1, 1, "{}", `-${i * 2} hours`
      );
    }

    const walletExists = await (await db.prepare("SELECT id FROM wallets WHERE tenant_id = ?")).get(tid);
    // Demo seeding must never fabricate money. Only create a wallet when the
    // policy allows it (dev/test), and then with a ZERO balance. Existing
    // wallet rows are never touched. In production no wallet is created.
    const seedBalance = seedWalletBalance();
    let walletCreated = false;
    if (seedBalance !== null) {
      const walletExists = await (await db.prepare("SELECT id FROM wallets WHERE tenant_id = ?")).get(tid);
      if (!walletExists) {
        await db.prepare("INSERT INTO wallets (id, tenant_id, balance, currency) VALUES (?, ?, ?, 'USD')")
          .run(genId("wlt"), tid, seedBalance);
        walletCreated = true;
      }
    }

    const insertNotif = db.prepare("INSERT INTO notifications (id, tenant_id, user_id, severity, title, body, read, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const notifBody = walletCreated
      ? "Demo campaigns and signals have been loaded. Your wallet balance was not changed."
      : "Demo campaigns and signals have been loaded.";
    await insertNotif.run(genId("ntf"), tid, user.id, "success", "Demo data loaded!", notifBody, 0, "/dashboard");

    // Audit trail: record the destructive seed action.
    await db.prepare(`
      INSERT INTO agent_actions (id, tenant_id, agent_id, agent_type, action_type, input, output, details, status, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      genId("act"), tid, user.id, "system", "seed_demo_data",
      JSON.stringify({ confirm: true }),
      JSON.stringify({ campaigns: campaigns.length, signals: 5 }),
      JSON.stringify({ userId: user.id, email: user.email, role: user.role, ip }),
      "success", 0
    );

    logger.info("[Seed] Demo data created/refreshed for tenant", { tenantId: tid, userId: user.id });
    return json({ message: "Demo data seeded successfully", campaigns: 2, signals: 5 });
  } catch (error) {
    logger.error("seed/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Seed failed", 500);
  }
}

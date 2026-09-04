export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";

export async function POST(req: Request) {
  setRequestId(generateRequestId());
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  const rl = checkRateLimit(`seed:${user.id}`, { maxRequests: 3, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const db = await getDb();
    const tid = user.tenantId;

    const existing = await (await db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = ?")).get(tid) as { c: number };
    if (existing.c > 0) {
      await (await db.prepare("DELETE FROM campaigns WHERE tenant_id = ?")).run(tid);
      await (await db.prepare("DELETE FROM signals WHERE tenant_id = ?")).run(tid);
      await (await db.prepare("DELETE FROM agents WHERE tenant_id = ?")).run(tid);
      await (await db.prepare("DELETE FROM wallets WHERE tenant_id = ?")).run(tid);
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
    if (!walletExists) {
      await db.prepare("INSERT INTO wallets (id, tenant_id, balance, currency) VALUES (?, ?, 5000, 'USD')")
        .run(genId("wlt"), tid);
    }

    const insertNotif = db.prepare("INSERT INTO notifications (id, tenant_id, user_id, severity, title, body, read, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    await insertNotif.run(genId("ntf"), tid, user.id, "success", "Demo data loaded!", "Campaigns, signals, and wallet have been updated.", 0, "/dashboard");

    logger.info("[Seed] Demo data created/refreshed for tenant", { tenantId: tid });
    return json({ message: "Demo data seeded successfully", campaigns: 2, signals: 5 });
  } catch (error) {
    logger.error("seed/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Seed failed", 500);
  }
}

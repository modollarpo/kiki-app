export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
  const tid = user.tenantId;

  // Get real data from SQLite
  const campaigns = await (await db.prepare("SELECT * FROM campaigns WHERE tenant_id = ?")).all(tid) as Array<{
    id: string; name: string; platform: string; status: string;
    roas: number; spend: number; budget: number; impressions: number;
    clicks: number; conversions: number; cpa: number; ltv_predicted: number;
  }>;

  const agents = await (await db.prepare("SELECT * FROM agents WHERE tenant_id = ?")).all(tid) as Array<{
    id: string; name: string; status: string; task: string;
    metric: string; color: string; type: string; action_count: number;
  }>;

  const wallet = await (await db.prepare("SELECT * FROM wallets WHERE tenant_id = ?")).get(tid) as {
    balance: number; id: string;
  } | undefined;

  const cards = wallet ? await (await db.prepare("SELECT * FROM wallet_cards WHERE wallet_id = ?")).all(wallet.id) : [];

  const notifications = await (await db.prepare("SELECT * FROM notifications WHERE tenant_id = ?")).all(tid) as Array<{
    id: string; read: number;
  }>;

  // Compute real KPIs
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const avgRoas = activeCampaigns.length > 0
    ? activeCampaigns.reduce((s, c) => s + (c.roas || 0), 0) / activeCampaigns.length
    : 0;

  // Real signal stats
  const signalCount = (await (await db.prepare("SELECT COUNT(*) as c FROM signals WHERE tenant_id = ?")).get(tid) as { c: number }).c;
  const todaySignals = (await (await db.prepare("SELECT COUNT(*) as c FROM signals WHERE tenant_id = ? AND created_at >= date('now')")).get(tid) as { c: number }).c;
  const avgLTV = (await (await db.prepare("SELECT AVG(ltv_predicted) as avg FROM signals WHERE tenant_id = ?")).get(tid) as { avg: number }).avg || 0;

  // LTV delta is derived from real data: avg LTV last 7 days vs the 7 days
  // before. Other KPI deltas are omitted (null) because campaign spend/roas
  // are a snapshot without a prior-period source — no fabricated numbers.
  const ltvWindow = await (await db.prepare(`
    SELECT AVG(CASE WHEN created_at >= datetime('now', '-7 days') THEN ltv_predicted END) as recent,
           AVG(CASE WHEN created_at < datetime('now', '-7 days') AND created_at >= datetime('now', '-14 days') THEN ltv_predicted END) as prior
    FROM signals WHERE tenant_id = ?
  `)).get(tid) as { recent: number | null; prior: number | null };
  const ltvDelta =
    ltvWindow.recent != null && ltvWindow.prior != null && ltvWindow.prior !== 0
      ? Math.round(((ltvWindow.recent - ltvWindow.prior) / ltvWindow.prior) * 1000) / 10
      : null;

  // Fraud stats
  const fraudBlocked = (await (await db.prepare("SELECT COUNT(*) as c FROM fraud_events WHERE tenant_id = ? AND blocked = 1 AND created_at >= date('now')")).get(tid) as { c: number }).c;

  const systemStatus =
    agents.filter(a => a.status === "running").length > 0 ? "nominal" : "idle";

  return json({
    kpis: {
      roas: { value: Math.round(avgRoas * 100) / 100, delta: null, label: "Platform ROAS" },
      spend: { value: totalSpend, delta: null, label: "Total Spend" },
      conversions: { value: totalConversions, delta: null, label: "Conversions" },
      ltv: { value: Math.round(avgLTV), delta: ltvDelta, label: "Avg LTV Signal" },
    },
    campaigns: campaigns.slice(0, 5).map(c => ({
      id: c.id, name: c.name, platform: c.platform, status: c.status,
      roas: c.roas, spend: c.spend, budget: c.budget,
    })),
    agents: agents.map(a => ({
      id: a.id, name: a.name, status: a.status, task: a.task,
      metric: a.metric, color: a.color,
    })),
    wallet: { balance: wallet?.balance || 0, cards: (cards as unknown[]).length },
    notifications: { unread: notifications.filter(n => !n.read).length, total: notifications.length },
    system: {
      status: systemStatus,
      agentsRunning: agents.filter(a => a.status === "running").length,
      eventsToday: todaySignals,
      signalsTotal: signalCount,
      fraudBlocked,
    },
    });
  } catch (error) {
    logger.error("dashboard/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load dashboard", 500);
  }
}

export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface CampaignRow {
  id: string;
  tenant_id: string;
  name: string;
  platform: string;
  status: string;
  roas: number;
  spend: number;
  budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  target_roas: number;
  revenue: number;
  createdAt: string;
}

interface UsageRow {
  type: string;
  qty: number;
  cost: number;
}

interface WalletRow {
  balance: number;
}

interface IntegrationRow {
  platform: string;
  status: string;
  connected_at: string;
  last_sync_at: string;
}

interface FraudCountRow {
  c: number;
  b: number;
}

interface AgentActionRow {
  agent_type: string;
  action_type: string;
  details: string;
  status: string;
  created_at: string;
}

interface CountRow {
  c: number;
}

interface SystemMetricRow {
  metric_name: string;
  avg: number;
  max: number;
}

interface FraudEventRow {
  event_type: string;
  severity: string;
  description: string;
  created_at: string;
}

interface AuditRow {
  src: string;
  action: string;
  details: string;
  time: string;
}

interface FeatureRow {
  feature_name: string;
  feature_value: string;
  sample_count: number;
  mean: number;
  stddev: number;
  updated_at: string;
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
  const tenantId = user.tenantId;

  // ── Campaign aggregates ──────────────────────────────
  const campaigns = await db.prepare(`SELECT * FROM campaigns WHERE tenant_id = ?`).all<CampaignRow>(tenantId);
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || (c.spend || 0) * (c.roas || 0)), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const avgRoas = campaigns.length > 0 ? campaigns.reduce((s, c) => s + (c.roas || 0), 0) / campaigns.length : 0;

  // ── Wallet ───────────────────────────────────────────
  const wallet = await db.prepare(`SELECT balance FROM wallets WHERE tenant_id = ?`).get<WalletRow>(tenantId);
  const walletBalance = wallet?.balance || 0;

  // ── Usage / billing ──────────────────────────────────
  const usage = await db.prepare(`SELECT type, SUM(quantity) as qty, SUM(total_cost) as cost FROM usage_records WHERE tenant_id = ? GROUP BY type`).all<UsageRow>(tenantId);
  const totalUsageCost = usage.reduce((s, u) => s + (u.cost || 0), 0);

  // ── Finance (all from real data) ──────────────────────
  const costs = totalSpend + totalUsageCost;
  const profit = totalRevenue - costs;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const revenueStreams = [
    { name: "Ad Spend Managed", amount: totalSpend, share: totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0, color: "blue" },
    { name: "Platform Fees (OaaS)", amount: totalUsageCost, share: totalRevenue > 0 ? (totalUsageCost / totalRevenue) * 100 : 0, color: "mint" },
  ].filter(s => s.amount > 0);

  const costCategories = [
    { name: "Ad Spend (Client)", amount: totalSpend, pct: costs > 0 ? (totalSpend / costs) * 100 : 0, color: "blue" },
    { name: "Platform Hosting", amount: totalUsageCost, pct: costs > 0 ? (totalUsageCost / costs) * 100 : 0, color: "teal" },
  ];

// Monthly P&L derived from real campaign data aggregated by month
  const monthlyRows = await db.prepare(`
    SELECT strftime('%m', created_at) as mon, strftime('%Y', created_at) as yr, SUM(spend) as spend, SUM(revenue) as revenue
    FROM campaigns WHERE tenant_id = ? AND created_at >= datetime('now', '-7 months')
    GROUP BY yr, mon ORDER BY yr, mon
  `).all(tenantId) as any[];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyPnl = monthlyRows.length > 0
    ? monthlyRows.map((r: any) => ({
        month: `${monthNames[parseInt(r.mon) - 1] || `M${r.mon}`} ${String(r.yr).slice(2)}`,
        revenue: Number(((r.revenue || 0) / 1000).toFixed(1)),
        costs: Number(((r.spend || 0) / 1000).toFixed(1)),
        profit: Number((((r.revenue || 0) - (r.spend || 0)) / 1000).toFixed(1)),
      }))
    : [];

  // ── OaaS Tasks (only tasks that actually exist — no fabrication) ──
  const storedTasks = await db.prepare(`
    SELECT id, campaign_name, title, agent, type, status, expected_impact, confidence, created_at, details
    FROM oaas_tasks WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10
  `).all<{
    id: string; campaign_name: string; title: string; agent: string; type: string; status: string;
    expected_impact: string | null; confidence: number | null; created_at: string; details: string;
  }>(tenantId);
  const oaasTasks = storedTasks.map(t => ({
    id: t.id,
    title: t.title,
    agent: t.agent,
    type: t.type,
    status: t.status,
    expectedImpact: t.expected_impact,
    confidence: t.confidence,
    createdAt: t.created_at,
    details: t.details,
  }));

  // ── Partners / Integrations ──────────────────────────
  const integrations = await db.prepare(`SELECT platform, status, connected_at, last_sync_at FROM tenant_integrations WHERE tenant_id = ?`).all<IntegrationRow>(tenantId);
  const partners = integrations.length > 0 ? integrations.map(it => ({
    name: it.platform,
    status: it.status,
    connectedAt: it.connected_at,
    lastSync: it.last_sync_at,
  })) : [];

// ── Savings ───────────────────────────────────────────
  // Reported honestly: fraud savings are estimated only when dollars are
  // implicated by a blocked event; otherwise null. No fixed per-event
  // dollar multipliers and no invented optimization savings.
  const fraudSavings = null;
  const optSavings = null;
  const savings = {
    total: null,
    fraud: fraudSavings,
    optimization: optSavings,
    breakdown: [],
    note: "Dollar savings require a monetary adjudication source; reported as null rather than estimated.",
  };

  // ── Workflow (agent actions) ─────────────────────────
  const agentActions = await db.prepare(`SELECT agent_type, action_type, details, status, created_at FROM agent_actions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20`).all<AgentActionRow>(tenantId);
  const workflow = agentActions.map(a => ({
    agent: a.agent_type,
    action: a.action_type,
    details: a.details,
    status: a.status,
    time: a.created_at,
  }));

  // ── Admin (system overview) ──────────────────────────
  const userCount = await db.prepare(`SELECT COUNT(*) as c FROM users WHERE tenant_id = ?`).get<CountRow>(tenantId);
  const agentCount = await db.prepare(`SELECT COUNT(*) as c FROM agents WHERE tenant_id = ?`).get<CountRow>(tenantId);
  const activeAgents = await db.prepare(`SELECT COUNT(*) as c FROM agents WHERE tenant_id = ? AND status = 'running'`).get<CountRow>(tenantId);
  const admin = {
    users: userCount?.c || 0,
    totalAgents: agentCount?.c || 0,
    runningAgents: activeAgents?.c || 0,
    campaigns: campaigns.length,
    totalSpend,
    walletBalance,
  };

// ── AIOps (system metrics) ───────────────────────────
  const sysMetrics = await db.prepare(`SELECT metric_name, AVG(metric_value) as avg, MAX(metric_value) as max FROM system_metrics WHERE tenant_id = ? GROUP BY metric_name`).all<SystemMetricRow>(tenantId);
  const aiops = {
    metrics: sysMetrics.length > 0 ? sysMetrics.map(m => ({ name: m.metric_name, avg: m.avg, max: m.max })) : [],
    uptime: null, // no uptime tracking source wired — not fabricated
    activeServices: agentCount?.c || 0,
  };

  // ── Anomaly (fraud + signal anomalies) ───────────────
  const anomalies = await db.prepare(`SELECT event_type, severity, description, created_at FROM fraud_events WHERE tenant_id = ? AND severity IN ('high','medium') ORDER BY created_at DESC LIMIT 15`).all<FraudEventRow>(tenantId);
  const anomaly = anomalies.map(a => ({
    type: a.event_type,
    severity: a.severity,
    description: a.description,
    time: a.created_at,
    status: "detected",
  }));

  // ── Audit (agent actions + notifications) ────────────
  const auditLog = await db.prepare(`
    SELECT 'agent' as src, action_type as action, details, created_at as time FROM agent_actions WHERE tenant_id = ?
    UNION ALL
    SELECT 'notification' as src, title as action, body as details, created_at as time FROM notifications WHERE tenant_id = ?
    ORDER BY time DESC LIMIT 25
  `).all<AuditRow>(tenantId, tenantId);
  const audit = auditLog.map(a => ({
    source: a.src,
    action: a.action,
    details: a.details,
    time: a.time,
  }));

  // ── Warehouse (feature store) ─────────────────────────
  const features = await db.prepare(`SELECT feature_name, feature_value, sample_count, mean, stddev, updated_at FROM feature_store WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 20`).all<FeatureRow>(tenantId);
  const warehouse = features.length > 0 ? features.map(f => ({
    name: f.feature_name,
    value: f.feature_value,
    samples: f.sample_count,
    mean: f.mean,
    stddev: f.stddev,
    updated: f.updated_at,
  })) : [];

  // ── Influencer (campaign-derived showcase) ───────────
  const influencer = {
    campaigns: campaigns.length,
    platforms: Array.from(new Set(campaigns.map(c => c.platform))),
    totalReach: campaigns.reduce((s, c) => s + (c.impressions || 0), 0),
    avgRoas: avgRoas,
  };

  return json({
    finance: {
      totals: { revenue: totalRevenue, costs, profit, margin },
      revenueStreams,
      costCategories,
      monthlyPnl,
    },
    oaas: { tasks: oaasTasks },
    partners,
    savings,
    workflow,
    admin,
    aiops,
    anomaly,
    audit,
    warehouse,
    influencer,
  });
  } catch (error) {
    logger.error("insights/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load insights", 500);
  }
}

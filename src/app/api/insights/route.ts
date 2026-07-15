import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();
  const tenantId = user.tenantId;

  // ── Campaign aggregates ──────────────────────────────
  const campaigns = await db.prepare(`SELECT * FROM campaigns WHERE tenant_id = ?`).all(tenantId) as any[];
  const totalSpend = campaigns.reduce((s: number, c: any) => s + (c.spend || 0), 0);
  const totalRevenue = campaigns.reduce((s: number, c: any) => s + (c.revenue || (c.spend || 0) * (c.roas || 0)), 0);
  const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.budget || 0), 0);
  const avgRoas = campaigns.length > 0 ? campaigns.reduce((s: number, c: any) => s + (c.roas || 0), 0) / campaigns.length : 0;

  // ── Wallet ───────────────────────────────────────────
  const wallet = await db.prepare(`SELECT balance FROM wallets WHERE tenant_id = ?`).get(tenantId) as any;
  const walletBalance = wallet?.balance || 0;

  // ── Usage / billing ──────────────────────────────────
  const usage = await db.prepare(`SELECT type, SUM(quantity) as qty, SUM(total_cost) as cost FROM usage_records WHERE tenant_id = ? GROUP BY type`).all(tenantId) as any[];
  const totalUsageCost = usage.reduce((s: number, u: any) => s + (u.cost || 0), 0);

  // ── Finance ──────────────────────────────────────────
  const revenue = totalRevenue || totalSpend * 1.3;
  const costs = totalSpend + totalUsageCost + 42000;
  const profit = revenue - costs;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const revenueStreams = [
    { name: "Ad Spend Managed", amount: totalSpend, share: revenue > 0 ? (totalSpend / revenue) * 100 : 0, color: "blue", trend: [28, 30, 29, 32, 34, 33, 36] },
    { name: "Platform Fees (OaaS)", amount: totalUsageCost, share: revenue > 0 ? (totalUsageCost / revenue) * 100 : 0, color: "mint", trend: [8, 9, 9, 10, 10, 10, 10] },
    { name: "AI Compute", amount: 67800, share: 12.7, color: "teal", trend: [5, 6, 6, 6, 7, 7, 7] },
    { name: "Data Licensing", amount: 34100, share: 6.4, color: "gold", trend: [3, 3, 3, 3, 3, 3, 4] },
    { name: "Consulting", amount: 22300, share: 4.2, color: "oaas", trend: [2, 2, 2, 2, 2, 2, 3] },
  ].filter(s => s.amount > 0);

  const costCategories = [
    { name: "Ad Spend (Client)", amount: totalSpend, pct: costs > 0 ? (totalSpend / costs) * 100 : 0, color: "blue" },
    { name: "Platform Hosting", amount: 84200, pct: 19.3, color: "teal" },
    { name: "AI Model Compute", amount: 62800, pct: 14.4, color: "oaas" },
    { name: "Third-Party APIs", amount: 41200, pct: 9.4, color: "gold" },
    { name: "Personnel", amount: 38400, pct: 8.8, color: "mint" },
    { name: "Compliance & Legal", amount: 14600, pct: 3.3, color: "warn" },
    { name: "Other OpEx", amount: 12300, pct: 2.8, color: "t3" },
  ];

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const monthlyPnl = months.map((m, i) => {
    const base = 380 + i * 22;
    const rev = base + (revenue / 7);
    const cost = base * 0.82 + (costs / 7);
    const prof = rev - cost;
    return { month: m, revenue: Number((rev / 1000).toFixed(1)), costs: Number((cost / 1000).toFixed(1)), profit: Number((prof / 1000).toFixed(1)) };
  });

  // ── OaaS Tasks (derived from underperforming campaigns) ──
  const underperformers = campaigns.filter((c: any) => (c.roas || 0) < (c.target_roas || 4) && (c.status === "active"));
  const oaasTasks = underperformers.slice(0, 6).map((c: any, i: number) => ({
    id: `task-${i + 1}`,
    title: `Reallocate budget from underperforming ${c.name}`,
    agent: "Bid Optimizer",
    type: i % 2 === 0 ? "budget" : "bidding",
    status: i < 2 ? "pending" : i < 4 ? "approved" : "completed",
    expectedImpact: `+${Math.round((c.target_roas - (c.roas || 0)) * 100)}% ROAS`,
    confidence: 75 + (i * 3) % 20,
    createdAt: `${i + 1} hr ago`,
    details: `${c.name} on ${c.platform} has ROAS ${(c.roas || 0).toFixed(1)}× vs target ${(c.target_roas || 4).toFixed(1)}×. Redirecting $${Math.round((c.budget || 1000) / 30)}/day to top performers.`,
  }));

  // ── Partners / Integrations ──────────────────────────
  const integrations = await db.prepare(`SELECT platform, status, connected_at, last_sync_at FROM tenant_integrations WHERE tenant_id = ?`).all(tenantId) as any[];
  const partners = integrations.length > 0 ? integrations.map((it: any) => ({
    name: it.platform,
    status: it.status,
    connectedAt: it.connected_at,
    lastSync: it.last_sync_at,
  })) : [];

  // ── Savings (fraud + optimization) ───────────────────
  const fraudEvents = await db.prepare(`SELECT COUNT(*) as c, SUM(CASE WHEN blocked=1 THEN 1 ELSE 0 END) as b FROM fraud_events WHERE tenant_id = ?`).get(tenantId) as any;
  const fraudSavings = (fraudEvents?.b || 0) * 33.4;
  const optSavings = underperformers.reduce((s: number, c: any) => s + (c.budget || 0) * 0.1, 0);
  const savings = {
    total: Math.round(fraudSavings + optSavings),
    fraud: Math.round(fraudSavings),
    optimization: Math.round(optSavings),
    breakdown: [
      { category: "Fraud Prevention", amount: Math.round(fraudSavings), pct: fraudSavings + optSavings > 0 ? (fraudSavings / (fraudSavings + optSavings)) * 100 : 0 },
      { category: "Bid Optimization", amount: Math.round(optSavings), pct: fraudSavings + optSavings > 0 ? (optSavings / (fraudSavings + optSavings)) * 100 : 0 },
    ],
  };

  // ── Workflow (agent actions) ─────────────────────────
  const agentActions = await db.prepare(`SELECT agent_type, action_type, details, status, created_at FROM agent_actions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20`).all(tenantId) as any[];
  const workflow = agentActions.map((a: any) => ({
    agent: a.agent_type,
    action: a.action_type,
    details: a.details,
    status: a.status,
    time: a.created_at,
  }));

  // ── Admin (system overview) ──────────────────────────
  const userCount = await db.prepare(`SELECT COUNT(*) as c FROM users WHERE tenant_id = ?`).get(tenantId) as any;
  const agentCount = await db.prepare(`SELECT COUNT(*) as c FROM agents WHERE tenant_id = ?`).get(tenantId) as any;
  const activeAgents = await db.prepare(`SELECT COUNT(*) as c FROM agents WHERE tenant_id = ? AND status = 'running'`).get(tenantId) as any;
  const admin = {
    users: userCount?.c || 0,
    totalAgents: agentCount?.c || 0,
    runningAgents: activeAgents?.c || 0,
    campaigns: campaigns.length,
    totalSpend,
    walletBalance,
  };

  // ── AIOps (system metrics) ───────────────────────────
  const sysMetrics = await db.prepare(`SELECT metric_name, AVG(metric_value) as avg, MAX(metric_value) as max FROM system_metrics WHERE tenant_id = ? GROUP BY metric_name`).all(tenantId) as any[];
  const aiops = {
    metrics: sysMetrics.length > 0 ? sysMetrics.map((m: any) => ({ name: m.metric_name, avg: m.avg, max: m.max })) : [],
    uptime: 99.7,
    activeServices: agentCount?.c || 0,
  };

  // ── Anomaly (fraud + signal anomalies) ───────────────
  const anomalies = await db.prepare(`SELECT event_type, severity, description, created_at FROM fraud_events WHERE tenant_id = ? AND severity IN ('high','medium') ORDER BY created_at DESC LIMIT 15`).all(tenantId) as any[];
  const anomaly = anomalies.map((a: any) => ({
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
  `).all(tenantId, tenantId) as any[];
  const audit = auditLog.map((a: any) => ({
    source: a.src,
    action: a.action,
    details: a.details,
    time: a.time,
  }));

  // ── Warehouse (feature store) ─────────────────────────
  const features = await db.prepare(`SELECT feature_name, feature_value, sample_count, mean, stddev, updated_at FROM feature_store WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 20`).all(tenantId) as any[];
  const warehouse = features.length > 0 ? features.map((f: any) => ({
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
    platforms: Array.from(new Set(campaigns.map((c: any) => c.platform))),
    totalReach: campaigns.reduce((s: number, c: any) => s + (c.impressions || 0), 0),
    avgRoas: avgRoas,
  };

  return json({
    finance: {
      totals: { revenue, costs, profit, margin },
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
}

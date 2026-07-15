import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();

  // Get real agent action count in last hour
  const actionsLastHour = await db.prepare(`
    SELECT COUNT(*) as count FROM agent_actions
    WHERE tenant_id = ? AND created_at >= datetime('now', '-1 hour')
  `).get(user.tenantId) as any;

  // Get total tokens used today (from system_metrics)
  const tokensToday = await db.prepare(`
    SELECT COALESCE(SUM(value), 0) as total FROM system_metrics
    WHERE tenant_id = ? AND metric_name LIKE '%token%' AND recorded_at >= datetime('now', 'start of day')
  `).get(user.tenantId) as any;

  // Get total managed spend
  const totalSpend = await db.prepare(`
    SELECT COALESCE(SUM(spend), 0) as total FROM campaigns WHERE tenant_id = ?
  `).get(user.tenantId) as any;

  // Get wallet balance
  const wallet = await db.prepare(`
    SELECT COALESCE(balance, 0) as balance FROM wallets WHERE tenant_id = ?
  `).get(user.tenantId) as any;

  // Get active campaign count
  const activeCampaigns = await db.prepare(`
    SELECT COUNT(*) as count FROM campaigns WHERE tenant_id = ? AND status = 'active'
  `).get(user.tenantId) as any;

  // Get recent agent actions for routing decisions
  const recentActions = await db.prepare(`
    SELECT action_type, details, created_at FROM agent_actions
    WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(user.tenantId) as any[];

  // Model routing breakdown (from agent type distribution)
  const agentTypes = await db.prepare(`
    SELECT type, COUNT(*) as count FROM agents WHERE tenant_id = ? GROUP BY type
  `).all(user.tenantId) as any[];

  return json({
    routingPerMin: actionsLastHour?.count || 0,
    totalTokens: tokensToday?.total || 0,
    totalSpend: totalSpend?.total || 0,
    walletBalance: wallet?.balance || 0,
    activeCampaigns: activeCampaigns?.count || 0,
    recentActions: recentActions.map((a: any) => ({
      type: a.action_type,
      details: a.details,
      time: a.created_at,
    })),
    agentTypes: agentTypes.map((a: any) => ({
      type: a.type,
      count: a.count,
    })),
  });
}

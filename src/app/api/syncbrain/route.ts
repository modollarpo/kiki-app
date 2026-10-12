export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { checkEnforcement } from "@/lib/tenant";

interface CountRow {
  count: number;
}

interface TotalRow {
  total: number;
}

interface BalanceRow {
  balance: number;
}

interface AgentActionListRow {
  action_type: string;
  details: string;
  created_at: string;
}

interface AgentTypeRow {
  type: string;
  count: number;
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enforcement = await checkEnforcement(user.tenantId, "syncbrain");
  if (!enforcement.allowed) return jsonError(enforcement.reason!, 403);

  try {
    const db = await getDb();

  // Get real agent action count in last hour
  const actionsLastHour = await db.prepare(`
    SELECT COUNT(*) as count FROM agent_actions
    WHERE tenant_id = ? AND created_at >= datetime('now', '-1 hour')
  `).get<CountRow>(user.tenantId);

  // Get total tokens used today (from system_metrics)
  const tokensToday = await db.prepare(`
    SELECT COALESCE(SUM(metric_value), 0) as total FROM system_metrics
    WHERE tenant_id = ? AND metric_name LIKE '%token%' AND created_at >= datetime('now', 'start of day')
  `).get<TotalRow>(user.tenantId);

  // Get total managed spend
  const totalSpend = await db.prepare(`
    SELECT COALESCE(SUM(spend), 0) as total FROM campaigns WHERE tenant_id = ?
  `).get<TotalRow>(user.tenantId);

  // Get wallet balance
  const wallet = await db.prepare(`
    SELECT COALESCE(balance, 0) as balance FROM wallets WHERE tenant_id = ?
  `).get<BalanceRow>(user.tenantId);

  // Get active campaign count
  const activeCampaigns = await db.prepare(`
    SELECT COUNT(*) as count FROM campaigns WHERE tenant_id = ? AND status = 'active'
  `).get<CountRow>(user.tenantId);

  // Get recent agent actions for routing decisions
  const recentActions = await db.prepare(`
    SELECT action_type, details, created_at FROM agent_actions
    WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10
  `).all<AgentActionListRow>(user.tenantId);

  // Model routing breakdown (from agent type distribution)
  const agentTypes = await db.prepare(`
    SELECT type, COUNT(*) as count FROM agents WHERE tenant_id = ? GROUP BY type
  `).all<AgentTypeRow>(user.tenantId);

  return json({
    routingPerMin: actionsLastHour?.count || 0,
    totalTokens: tokensToday?.total || 0,
    totalSpend: totalSpend?.total || 0,
    walletBalance: wallet?.balance || 0,
    activeCampaigns: activeCampaigns?.count || 0,
    recentActions: recentActions.map((a) => ({
      type: a.action_type,
      details: a.details,
      time: a.created_at,
    })),
    agentTypes: agentTypes.map((a) => ({
      type: a.type,
      count: a.count,
    })),
  });
  } catch (error) {
    logger.error("syncbrain/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load syncbrain data", 500);
  }
}

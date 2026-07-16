import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface ActionSummary {
  action_type: string; count: number; avg_duration: number;
}
interface CampaignStats {
  total: number; active: number; total_spend: number;
  total_revenue: number; avg_roas: number;
}
interface UsageSummary {
  type: string; total_quantity: number; total_cost: number;
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const tid = user.tenantId;

    const [actionSummary, campaignStats, usageSummary] = await Promise.all([
      db.prepare(`
        SELECT action_type, COUNT(*) as count, AVG(duration_ms) as avg_duration
        FROM agent_actions WHERE tenant_id = ?
        GROUP BY action_type ORDER BY count DESC
      `).all(tid),
      db.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COALESCE(SUM(spend), 0) as total_spend,
          COALESCE(SUM(revenue), 0) as total_revenue,
          COALESCE(AVG(roas), 0) as avg_roas
        FROM campaigns WHERE tenant_id = ?
      `).get(tid),
      db.prepare(`
        SELECT type, SUM(quantity) as total_quantity, SUM(total_cost) as total_cost
        FROM usage_records WHERE tenant_id = ?
        GROUP BY type ORDER BY total_cost DESC
      `).all(tid),
    ]);

    const actions = actionSummary as ActionSummary[];
    const cs = campaignStats as CampaignStats;
    const usage = usageSummary as UsageSummary[];

    const totalActions = actions.reduce((s, a) => s + a.count, 0);
    const totalUsageCost = usage.reduce((s, u) => s + u.total_cost, 0);

    return json({
      success: true,
      data: {
        agentActions: {
          total: totalActions,
          byType: actions.map((a) => ({
            actionType: a.action_type,
            count: a.count,
            avgDurationMs: Math.round(a.avg_duration),
          })),
        },
        campaigns: {
          total: cs.total,
          active: cs.active,
          totalSpend: cs.total_spend,
          totalRevenue: cs.total_revenue,
          avgRoas: Math.round(cs.avg_roas * 100) / 100,
        },
        usage: {
          totalCost: totalUsageCost,
          byType: usage.map((u) => ({
            type: u.type,
            totalQuantity: u.total_quantity,
            totalCost: u.total_cost,
          })),
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("reports/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load report data", 500);
  }
}

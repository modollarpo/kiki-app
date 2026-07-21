export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface UsageRow {
  type: string; count: number; total_quantity: number; total_cost: number;
}
interface MetricRow {
  metric_name: string; metric_value: number; tags: string; created_at: string;
}
interface ActionRow {
  id: string; agent_type: string; action_type: string;
  status: string; duration_ms: number; created_at: string;
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const tid = user.tenantId;

    const [usageRecords, systemMetrics, recentActions] = await Promise.all([
      db.prepare(`
        SELECT type, COUNT(*) as count, SUM(quantity) as total_quantity,
               SUM(total_cost) as total_cost
        FROM usage_records
        WHERE tenant_id = ?
        GROUP BY type
        ORDER BY total_cost DESC
      `).all(tid),
      db.prepare(`
        SELECT metric_name, metric_value, tags, created_at
        FROM system_metrics
        WHERE (tenant_id = ? OR tenant_id IS NULL)
        ORDER BY created_at DESC LIMIT 30
      `).all(tid),
      db.prepare(`
        SELECT id, agent_type, action_type, status, duration_ms, created_at
        FROM agent_actions
        WHERE tenant_id = ?
        ORDER BY created_at DESC LIMIT 50
      `).all(tid),
    ]);

    const usage = usageRecords as UsageRow[];
    const metrics = systemMetrics as MetricRow[];
    const actions = recentActions as ActionRow[];

    const totalApiCalls = usage.reduce((s, r) => s + r.count, 0);
    const totalCost = usage.reduce((s, r) => s + r.total_cost, 0);

    return json({
      success: true,
      data: {
        usage: {
          byType: usage.map((r) => ({
            type: r.type,
            count: r.count,
            totalQuantity: r.total_quantity,
            totalCost: r.total_cost,
          })),
          totalApiCalls,
          totalCost,
        },
        systemMetrics: metrics.map((m) => ({
          name: m.metric_name,
          value: m.metric_value,
          tags: m.tags,
          createdAt: m.created_at,
        })),
        recentActions: actions.map((a) => ({
          id: a.id,
          agentType: a.agent_type,
          actionType: a.action_type,
          status: a.status,
          durationMs: a.duration_ms,
          createdAt: a.created_at,
        })),
      },
    });
  } catch (error) {
    logger.error("developer/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load developer stats", 500);
  }
}

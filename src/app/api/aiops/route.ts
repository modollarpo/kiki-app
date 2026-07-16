import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface AgentRow {
  id: string; name: string; type: string; status: string; task: string;
  metric: string; last_action: string; action_count: number; created_at: string;
}
interface MetricRow {
  metric_name: string; metric_value: number; tags: string; created_at: string;
}
interface ActionRow {
  id: string; agent_id: string | null; agent_type: string | null;
  action_type: string; output: string; status: string;
  duration_ms: number; created_at: string;
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const tid = user.tenantId;

    const [agentStatuses, systemMetrics, recentActions] = await Promise.all([
      db.prepare(`
        SELECT id, name, type, status, task, metric, last_action, action_count, created_at
        FROM agents WHERE tenant_id = ? ORDER BY created_at DESC
      `).all(tid),
      db.prepare(`
        SELECT metric_name, metric_value, tags, created_at
        FROM system_metrics
        WHERE (tenant_id = ? OR tenant_id IS NULL)
        ORDER BY created_at DESC LIMIT 25
      `).all(tid),
      db.prepare(`
        SELECT id, agent_id, agent_type, action_type, output, status, duration_ms, created_at
        FROM agent_actions WHERE tenant_id = ?
        ORDER BY created_at DESC LIMIT 30
      `).all(tid),
    ]);

    const agents = agentStatuses as AgentRow[];
    const metrics = systemMetrics as MetricRow[];
    const actions = recentActions as ActionRow[];

    const statusCounts = agents.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    return json({
      success: true,
      data: {
        agents: agents.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          status: a.status,
          task: a.task,
          metric: a.metric,
          lastAction: a.last_action,
          actionCount: a.action_count,
          createdAt: a.created_at,
        })),
        agentSummary: {
          total: agents.length,
          running: statusCounts["running"] || 0,
          paused: statusCounts["paused"] || 0,
          error: statusCounts["error"] || 0,
          byStatus: statusCounts,
        },
        systemMetrics: metrics.map((m) => ({
          name: m.metric_name,
          value: m.metric_value,
          tags: m.tags,
          createdAt: m.created_at,
        })),
        recentActions: actions.map((a) => ({
          id: a.id,
          agentId: a.agent_id,
          agentType: a.agent_type,
          actionType: a.action_type,
          output: a.output,
          status: a.status,
          durationMs: a.duration_ms,
          createdAt: a.created_at,
        })),
      },
    });
  } catch (error) {
    logger.error("aiops/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load AI ops data", 500);
  }
}

import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { runAgent } from "@/lib/agents";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();
  const agents = await (await db.prepare("SELECT * FROM agents WHERE tenant_id = ?")).all(user.tenantId) as Array<{
    id: string; tenant_id: string; name: string; type: string; status: string;
    task: string; metric: string; color: string; last_action: string;
    action_count: number; config: string;
  }>;

  // Get latest action for each agent
  const agentsWithActions = agents.map(async a => {
    const lastAction = await (await db.prepare(
      "SELECT action_type, output, duration_ms, created_at FROM agent_actions WHERE agent_id = ? ORDER BY created_at DESC LIMIT 1"
    )).get(a.id) as { action_type: string; output: string; duration_ms: number; created_at: string } | undefined;

    return {
      id: a.id, tenantId: a.tenant_id, name: a.name, type: a.type,
      status: a.status, task: a.task, metric: a.metric, color: a.color,
      lastAction: a.last_action, actionCount: a.action_count,
      config: JSON.parse(a.config || "{}"),
      latestAction: lastAction || null,
    };
  });

  const running = agents.filter(a => a.status === "running").length;
  const paused = agents.filter(a => a.status === "paused").length;
  const totalActions = agents.reduce((s, a) => s + a.action_count, 0);

  return json({
    agents: agentsWithActions,
    summary: { total: agents.length, running, paused, totalActions },
  });
}

export async function PATCH(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const { id, status, action } = body;

    if (!id || typeof id !== "string") return jsonError("Agent id required");
    if (status && !["running", "paused", "error"].includes(status)) return jsonError("Invalid status");

    const db = await getDb();
    const agent = await (await db.prepare("SELECT * FROM agents WHERE id = ? AND tenant_id = ?")).get(id, user.tenantId) as { id: string } | undefined;
    if (!agent) return jsonError("Agent not found", 404);

    if (status) {
      await (await db.prepare("UPDATE agents SET status = ? WHERE id = ?")).run(status, id);
    }

    // Manual trigger
    if (action === "run") {
      const result = await runAgent(id);
      return json({ ok: true, result });
    }

    const updated = await (await db.prepare("SELECT * FROM agents WHERE id = ?")).get(id);
    return json(updated);
  } catch {
    return jsonError("Invalid request body", 400);
  }
}

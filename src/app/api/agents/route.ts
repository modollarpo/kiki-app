import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { runAgent } from "@/lib/agents";
import { logger, handleApiError } from "@/lib/logger";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const rl = checkRateLimit(`agents:GET:${getClientIp(req)}`, { maxRequests: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const db = await getDb();
  const agents = await (await db.prepare("SELECT * FROM agents WHERE tenant_id = ?")).all(user.tenantId) as Array<{
    id: string; tenant_id: string; name: string; type: string; status: string;
    task: string; metric: string; color: string; last_action: string;
    action_count: number; config: string;
  }>;

  const agentsWithActions = await Promise.all(agents.map(async a => {
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
  }));

  const running = agents.filter(a => a.status === "running").length;
  const paused = agents.filter(a => a.status === "paused").length;
  const totalActions = agents.reduce((s, a) => s + a.action_count, 0);

  // Compute guardrails from agent configs
  const guardrails = [
    {
      label: "Max daily spend",
      value: agents.length > 0
        ? `$${Math.max(...agents.map(a => { const c = JSON.parse(a.config || "{}"); return c.maxDailySpend || 0; }), 5000).toLocaleString()}`
        : "$5,000",
      status: "Active",
    },
    {
      label: "ROAS floor",
      value: (() => { const vals = agents.map(a => { const c = JSON.parse(a.config || "{}"); return c.roasFloor; }).filter((v): v is number => typeof v === "number"); return vals.length > 0 ? `${Math.min(...vals)}×` : "2.0×"; })(),
      status: "Active",
    },
    {
      label: "CPA ceiling",
      value: (() => { const vals = agents.map(a => { const c = JSON.parse(a.config || "{}"); return c.cpaCeiling; }).filter((v): v is number => typeof v === "number"); return vals.length > 0 ? `$${Math.min(...vals)}` : "$35"; })(),
      status: "Active",
    },
    {
      label: "Brand safety",
      value: (() => { const vals = agents.map(a => { const c = JSON.parse(a.config || "{}"); return c.brandSafety; }).filter((v): v is string => typeof v === "string"); return vals.length > 0 ? vals[0] : "Strict"; })(),
      status: "Active",
    },
  ];

    return json({
      agents: agentsWithActions,
      summary: { total: agents.length, running, paused, totalActions },
      guardrails,
    });
  } catch (error) {
    logger.error("agents/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load agents", 500);
  }
}

export async function PATCH(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = checkRateLimit(`agents:PATCH:${getClientIp(req)}`, { maxRequests: 20 });
  if (!rl.allowed) return rateLimitResponse(rl);

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

    if (action === "run") {
      const result = await runAgent(id);
      return json({ ok: true, result });
    }

    const updated = await (await db.prepare("SELECT * FROM agents WHERE id = ?")).get(id);
    return json(updated);
  } catch (e) {
    return handleApiError(e, "agents/handler");
  }
}

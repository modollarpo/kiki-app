export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface ActionRow {
  id: string; agent_id: string | null; agent_type: string | null;
  action_type: string; input: string; output: string;
  status: string; duration_ms: number; created_at: string;
}
interface CountRow { count: number }

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);
    const tid = user.tenantId;

    const [rows, totalRow] = await Promise.all([
      db.prepare(`
        SELECT id, agent_id, agent_type, action_type, input, output,
               status, duration_ms, created_at
        FROM agent_actions WHERE tenant_id = ?
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).all(tid, limit, offset),
      db.prepare("SELECT COUNT(*) as count FROM agent_actions WHERE tenant_id = ?").get(tid),
    ]);

    const events = rows as ActionRow[];
    const total = (totalRow as CountRow).count;

    return json({
      success: true,
      data: {
        events: events.map((r) => ({
          id: r.id,
          agentId: r.agent_id,
          agentType: r.agent_type,
          actionType: r.action_type,
          input: r.input,
          output: r.output,
          status: r.status,
          durationMs: r.duration_ms,
          createdAt: r.created_at,
        })),
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error("workflow/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load workflow events", 500);
  }
}

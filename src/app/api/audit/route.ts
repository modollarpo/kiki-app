export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface AuditEntry {
  id: string; source: string; tenant_id: string; agent_type: string | null;
  title: string; body: string; severity: string; created_at: string;
}
interface CountRow { count: number }

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100", 10), 1), 500);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);
    const tid = user.tenantId;

    const [rows, totalRow] = await Promise.all([
      db.prepare(`
        SELECT * FROM (
          SELECT
            aa.id,
            'agent_action' as source,
            aa.tenant_id,
            aa.agent_type,
            aa.action_type as title,
            aa.output as body,
            aa.status as severity,
            aa.created_at
          FROM agent_actions aa
          WHERE aa.tenant_id = ?
          UNION ALL
          SELECT
            n.id,
            'notification' as source,
            n.tenant_id,
            NULL as agent_type,
            n.title,
            n.body,
            n.severity,
            n.created_at
          FROM notifications n
          WHERE n.tenant_id = ?
        ) combined
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(tid, tid, limit, offset),
      db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT id FROM agent_actions WHERE tenant_id = ?
          UNION ALL
          SELECT id FROM notifications WHERE tenant_id = ?
        ) combined
      `).get(tid, tid),
    ]);

    const entries = rows as AuditEntry[];
    const total = (totalRow as CountRow).count;

    return json({
      success: true,
      data: {
        entries: entries.map((r) => ({
          id: r.id,
          source: r.source,
          tenantId: r.tenant_id,
          agentType: r.agent_type,
          title: r.title,
          body: r.body,
          severity: r.severity,
          createdAt: r.created_at,
        })),
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error("audit/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load audit log", 500);
  }
}

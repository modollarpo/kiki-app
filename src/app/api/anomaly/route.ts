export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface FraudRow {
  id: string; tenant_id: string; signal_id: string | null;
  event_type: string; severity: string; description: string;
  blocked: number; status: string; created_at: string;
}
interface CountRow { count: number }
interface SeverityCount { severity: string; count: number }

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);
    const tid = user.tenantId;

    const [rows, totalRow, severityCounts] = await Promise.all([
      db.prepare(`
        SELECT id, tenant_id, signal_id, event_type, severity, description, blocked, status, created_at
        FROM fraud_events
        WHERE tenant_id = ? AND severity IN ('high', 'medium')
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).all<FraudRow>(tid, limit, offset),
      db.prepare(`
        SELECT COUNT(*) as count FROM fraud_events
        WHERE tenant_id = ? AND severity IN ('high', 'medium')
      `).get<CountRow>(tid),
      db.prepare(`
        SELECT severity, COUNT(*) as count FROM fraud_events
        WHERE tenant_id = ? AND severity IN ('high', 'medium')
        GROUP BY severity
      `).all<SeverityCount>(tid),
    ]);

    const anomalies = rows;
    const total = (totalRow as CountRow).count;
    const sevCounts = severityCounts;

    return json({
      data: {
        anomalies: anomalies.map((r) => ({
          id: r.id,
          tenantId: r.tenant_id,
          signalId: r.signal_id,
          eventType: r.event_type,
          severity: r.severity,
          description: r.description,
          blocked: r.blocked === 1,
          status: r.status || (r.blocked ? "blocked" : "open"),
          createdAt: r.created_at,
        })),
        summary: {
          total,
          high: sevCounts.find((s) => s.severity === "high")?.count ?? 0,
          medium: sevCounts.find((s) => s.severity === "medium")?.count ?? 0,
        },
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error("anomaly/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load anomalies", 500);
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action;
  if (!id) return jsonError("id required", 400);
  if (action !== "acknowledge" && action !== "resolve" && action !== "reopen") {
    return jsonError("action must be acknowledge, resolve, or reopen", 400);
  }

  try {
    const db = await getDb();
    const existing = await db.prepare(
      "SELECT id FROM fraud_events WHERE id = ? AND tenant_id = ?"
    ).get<{ id: string }>(id, user.tenantId);
    if (!existing) return jsonError("Anomaly not found", 404);

    if (action === "acknowledge") {
      await db.prepare(`
        UPDATE fraud_events SET status = 'acknowledged', acknowledged_by = ? WHERE id = ? AND tenant_id = ?
      `).run(user.id, id, user.tenantId);
      return json({ id, status: "acknowledged" });
    }

    if (action === "resolve") {
      await db.prepare(`
        UPDATE fraud_events SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).run(user.id, id, user.tenantId);
      return json({ id, status: "resolved" });
    }

    await db.prepare(`
      UPDATE fraud_events SET status = 'open', resolved_by = NULL, resolved_at = NULL WHERE id = ? AND tenant_id = ?
    `).run(id, user.tenantId);
    return json({ id, status: "open" });
  } catch (error) {
    logger.error("anomaly/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to update anomaly", 500);
  }
}

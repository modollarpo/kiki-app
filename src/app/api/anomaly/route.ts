export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface FraudRow {
  id: string; tenant_id: string; signal_id: string | null;
  event_type: string; severity: string; description: string;
  blocked: number; created_at: string;
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
        SELECT id, tenant_id, signal_id, event_type, severity, description, blocked, created_at
        FROM fraud_events
        WHERE tenant_id = ? AND severity IN ('high', 'medium')
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).all(tid, limit, offset),
      db.prepare(`
        SELECT COUNT(*) as count FROM fraud_events
        WHERE tenant_id = ? AND severity IN ('high', 'medium')
      `).get(tid),
      db.prepare(`
        SELECT severity, COUNT(*) as count FROM fraud_events
        WHERE tenant_id = ? AND severity IN ('high', 'medium')
        GROUP BY severity
      `).all(tid),
    ]);

    const anomalies = rows as FraudRow[];
    const total = (totalRow as CountRow).count;
    const sevCounts = severityCounts as SeverityCount[];

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

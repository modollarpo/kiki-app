export const dynamic = "force-dynamic";
import { randomBytes } from "crypto";
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
interface ExportRow {
  id: string; name: string; report_type: string; format: string;
  status: string; row_count: number; created_at: string; content?: string;
}

type ReportType =
  | "executive"
  | "campaign_performance"
  | "financial"
  | "agent_activity"
  | "competitive"
  | "compliance"
  | "usage_summary"
  | "custom";

const REPORT_TYPES: ReportType[] = [
  "executive",
  "campaign_performance",
  "financial",
  "agent_activity",
  "competitive",
  "compliance",
  "usage_summary",
  "custom",
];

const REPORT_NAMES: Record<ReportType, string> = {
  executive: "Executive Dashboard",
  campaign_performance: "Campaign Performance",
  financial: "Financial P&L",
  agent_activity: "Agent Activity Log",
  competitive: "Competitive Analysis",
  compliance: "Compliance Audit",
  usage_summary: "Usage Summary",
  custom: "Custom Report",
};

type Row = Record<string, string | number | null>;

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map(h => csvEscape(row[h])).join(","));
  return lines.join("\n");
}

async function buildRows(tenantId: string, reportType: ReportType): Promise<Row[]> {
  const db = await getDb();

  switch (reportType) {
    case "executive": {
      const campaigns = await db.prepare(`
        SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
               COALESCE(SUM(spend), 0) AS spend, COALESCE(SUM(revenue), 0) AS revenue,
               COALESCE(AVG(roas), 0) AS roas
        FROM campaigns WHERE tenant_id = ?
      `).get<{ total: number; active: number; spend: number; revenue: number; roas: number }>(tenantId);
      const actions = await db.prepare(
        "SELECT COUNT(*) AS c FROM agent_actions WHERE tenant_id = ?"
      ).get<{ c: number }>(tenantId);
      const usage = await db.prepare(
        "SELECT COALESCE(SUM(total_cost), 0) AS c FROM usage_records WHERE tenant_id = ?"
      ).get<{ c: number }>(tenantId);
      return [{
        campaigns_total: campaigns?.total || 0,
        campaigns_active: campaigns?.active || 0,
        total_spend: Number((campaigns?.spend || 0).toFixed(2)),
        total_revenue: Number((campaigns?.revenue || 0).toFixed(2)),
        avg_roas: Number((campaigns?.roas || 0).toFixed(2)),
        agent_actions: actions?.c || 0,
        usage_cost: Number((usage?.c || 0).toFixed(2)),
      }];
    }

    case "campaign_performance": {
      const rows = await db.prepare(`
        SELECT name, platform, status, spend, revenue, roas, budget, impressions, clicks, conversions, cpa
        FROM campaigns WHERE tenant_id = ? ORDER BY spend DESC
      `).all<Record<string, string | number>>(tenantId);
      return rows as Row[];
    }

    case "financial": {
      const rows = await db.prepare(`
        SELECT name, spend, revenue, (revenue - spend) AS gross_profit,
               CASE WHEN revenue > 0 THEN ROUND((revenue - spend) * 100.0 / revenue, 2) ELSE 0 END AS margin_pct
        FROM campaigns WHERE tenant_id = ? ORDER BY revenue DESC
      `).all<Record<string, string | number>>(tenantId);
      return rows as Row[];
    }

    case "agent_activity": {
      const rows = await db.prepare(`
        SELECT id, agent_type AS agent, action_type AS action, status, duration_ms, created_at
        FROM agent_actions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1000
      `).all<Record<string, string | number>>(tenantId);
      return rows as Row[];
    }

    case "competitive": {
      try {
        const rows = await db.prepare(`
          SELECT c.competitor_name AS competitor, c.platform, s.impressions, s.estimated_spend,
                 s.share_of_voice, s.captured_at
          FROM competitor_snapshots s
          JOIN competitor_configs c ON c.id = s.competitor_id
          WHERE c.tenant_id = ?
          ORDER BY s.captured_at DESC LIMIT 1000
        `).all<Record<string, string | number>>(tenantId);
        return rows as Row[];
      } catch {
        return [];
      }
    }

    case "compliance": {
      const rows = await db.prepare(`
        SELECT name AS entity, entity_type AS type, jurisdiction, verification_status AS status,
               documents_uploaded, documents_required, compliance_score
        FROM kyc_entities WHERE tenant_id = ? ORDER BY compliance_score DESC
      `).all<Record<string, string | number>>(tenantId);
      return rows as Row[];
    }

    case "usage_summary": {
      const rows = await db.prepare(`
        SELECT type, COUNT(*) AS records, SUM(quantity) AS total_quantity, SUM(total_cost) AS total_cost
        FROM usage_records WHERE tenant_id = ? GROUP BY type ORDER BY total_cost DESC
      `).all<Record<string, string | number>>(tenantId);
      return rows as Row[];
    }

    case "custom": {
      const rows = await db.prepare(`
        SELECT name, platform, status, spend, revenue, roas
        FROM campaigns WHERE tenant_id = ? ORDER BY created_at DESC
      `).all<Record<string, string | number>>(tenantId);
      return rows as Row[];
    }

    default:
      return [];
  }
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const downloadId = url.searchParams.get("download");

  try {
    const db = await getDb();
    const tid = user.tenantId;

    if (downloadId) {
      const row = await db.prepare(`
        SELECT id, name, report_type, format, status, row_count, created_at, content
        FROM report_exports WHERE id = ? AND tenant_id = ?
      `).get<ExportRow>(downloadId, tid);
      if (!row || !row.content) return jsonError("Export not found", 404);

      const isJson = row.format === "json";
      const filename = `${row.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${row.id}.${isJson ? "json" : "csv"}`;
      return new Response(row.content, {
        status: 200,
        headers: {
          "Content-Type": isJson ? "application/json" : "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const [actionSummary, campaignStats, usageSummary, exports] = await Promise.all([
      db.prepare(`
        SELECT action_type, COUNT(*) as count, AVG(duration_ms) as avg_duration
        FROM agent_actions WHERE tenant_id = ?
        GROUP BY action_type ORDER BY count DESC
      `).all<ActionSummary>(tid),
      db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          COALESCE(SUM(spend), 0) as total_spend,
          COALESCE(SUM(revenue), 0) as total_revenue,
          COALESCE(AVG(roas), 0) as avg_roas
        FROM campaigns WHERE tenant_id = ?
      `).get<CampaignStats>(tid),
      db.prepare(`
        SELECT type, SUM(quantity) as total_quantity, SUM(total_cost) as total_cost
        FROM usage_records WHERE tenant_id = ?
        GROUP BY type ORDER BY total_cost DESC
      `).all<UsageSummary>(tid),
      db.prepare(`
        SELECT id, name, report_type, format, status, row_count, created_at
        FROM report_exports WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50
      `).all<ExportRow>(tid),
    ]);

    const actions = actionSummary;
    const cs = campaignStats as CampaignStats;
    const usage = usageSummary;

    const totalActions = actions.reduce((s, a) => s + a.count, 0);
    const totalUsageCost = usage.reduce((s, u) => s + u.total_cost, 0);

    const payload = {
      agentActions: {
        total: totalActions,
        byType: actions.map((a) => ({
          actionType: a.action_type,
          count: a.count,
          avgDurationMs: Math.round(a.avg_duration || 0),
        })),
      },
      campaigns: {
        total: cs.total,
        active: cs.active,
        totalSpend: cs.total_spend,
        totalRevenue: cs.total_revenue,
        avgRoas: Math.round((cs.avg_roas || 0) * 100) / 100,
      },
      usage: {
        totalCost: totalUsageCost,
        byType: usage.map((u) => ({
          type: u.type,
          totalQuantity: u.total_quantity,
          totalCost: u.total_cost,
        })),
      },
      exports: exports.map(e => ({
        id: e.id,
        name: e.name,
        type: e.report_type,
        format: e.format,
        status: e.status,
        rowCount: e.row_count,
        createdAt: e.created_at,
      })),
      generatedAt: new Date().toISOString(),
    };
    return json({ ok: true, data: payload, ...payload });
  } catch (error) {
    logger.error("reports/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load report data", 500);
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);
  if (!["admin", "superadmin", "finance", "analyst", "advertiser"].includes(user.role)) {
    return jsonError("Forbidden", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (body.action !== undefined && body.action !== "generate") {
    return jsonError("Unknown action", 400);
  }

  const reportType = typeof body.type === "string" && REPORT_TYPES.includes(body.type as ReportType)
    ? body.type as ReportType
    : "custom";
  const format = body.format === "json" ? "json" : "csv";
  const requestedName = typeof body.name === "string" ? body.name.trim() : "";
  const name = requestedName || REPORT_NAMES[reportType];

  if (name.length > 120) return jsonError("Report name too long", 400);

  try {
    const rows = await buildRows(user.tenantId, reportType);
    const content = format === "json"
      ? JSON.stringify({ report: name, type: reportType, generatedAt: new Date().toISOString(), rows }, null, 2)
      : toCsv(rows);

    const db = await getDb();
    const id = `rpt_${randomBytes(8).toString("hex")}`;

    await db.prepare(`
      INSERT INTO report_exports (id, tenant_id, name, report_type, format, status, row_count, content, created_by)
      VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?)
    `).run(id, user.tenantId, name, reportType, format, rows.length, content, user.id);

    return json({
      id,
      name,
      type: reportType,
      format,
      status: "completed",
      rowCount: rows.length,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("reports/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to generate report", 500);
  }
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("id required", 400);

  const db = await getDb();
  const res = await db.prepare(
    "DELETE FROM report_exports WHERE id = ? AND tenant_id = ?"
  ).run(id, user.tenantId);
  if (!res.changes) return jsonError("Export not found", 404);
  return json({ deleted: true });
}

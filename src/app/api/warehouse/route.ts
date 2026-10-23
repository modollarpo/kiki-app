export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface FeatureRow {
  id: number; tenant_id: string; feature_name: string; feature_value: number;
  sample_count: number; mean: number | null; stddev: number | null;
  min_val: number | null; max_val: number | null; updated_at: string;
}
interface CountRow { count: number }

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const url = new URL(req.url);

    const exportFormat = url.searchParams.get("export");
    if (exportFormat) {
      if (exportFormat !== "csv" && exportFormat !== "json") {
        return jsonError("export must be csv or json", 400);
      }

      const rows = await db.prepare(`
        SELECT feature_name, feature_value, sample_count, mean, stddev, min_val, max_val, updated_at
        FROM feature_store WHERE tenant_id = ? ORDER BY updated_at DESC
      `).all<FeatureRow>(user.tenantId);

      if (exportFormat === "json") {
        return new Response(JSON.stringify({ tenantId: user.tenantId, exportedAt: new Date().toISOString(), features: rows }, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="feature-store-${new Date().toISOString().slice(0, 10)}.json"`,
            "Cache-Control": "no-store",
          },
        });
      }

      const headers = ["feature_name", "feature_value", "sample_count", "mean", "stddev", "min_val", "max_val", "updated_at"];
      const lines = [headers.join(",")];
      for (const r of rows) {
        lines.push([
          r.feature_name, r.feature_value, r.sample_count, r.mean, r.stddev, r.min_val, r.max_val, r.updated_at,
        ].map(csvEscape).join(","));
      }

      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="feature-store-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100", 10), 1), 500);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);
    const tid = user.tenantId;

    const [rows, totalRow] = await Promise.all([
      db.prepare(`
        SELECT id, tenant_id, feature_name, feature_value, sample_count,
               mean, stddev, min_val, max_val, updated_at
        FROM feature_store WHERE tenant_id = ?
        ORDER BY updated_at DESC LIMIT ? OFFSET ?
      `).all<FeatureRow>(tid, limit, offset),
      db.prepare("SELECT COUNT(*) as count FROM feature_store WHERE tenant_id = ?").get<CountRow>(tid),
    ]);

    const features = rows;
    const total = (totalRow as CountRow).count;

    return json({
      data: {
        features: features.map((r) => ({
          id: r.id,
          tenantId: r.tenant_id,
          featureName: r.feature_name,
          featureValue: r.feature_value,
          sampleCount: r.sample_count,
          mean: r.mean,
          stddev: r.stddev,
          minVal: r.min_val,
          maxVal: r.max_val,
          updatedAt: r.updated_at,
        })),
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error("warehouse/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load feature store data", 500);
  }
}

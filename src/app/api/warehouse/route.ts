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
        SELECT id, tenant_id, feature_name, feature_value, sample_count,
               mean, stddev, min_val, max_val, updated_at
        FROM feature_store WHERE tenant_id = ?
        ORDER BY updated_at DESC LIMIT ? OFFSET ?
      `).all(tid, limit, offset),
      db.prepare("SELECT COUNT(*) as count FROM feature_store WHERE tenant_id = ?").get(tid),
    ]);

    const features = rows as FeatureRow[];
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

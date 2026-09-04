export const dynamic = "force-dynamic";
import { json, jsonError, getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { getDb } from "@/lib/db";
import { predictLTV, predictLTVBatch, type SignalData } from "@/lib/ltv-engine";
import { handleApiError, logger } from "@/lib/logger";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return jsonError("Authentication required", 401);

    const db = await getDb();
    const tid = user.tenantId;

    const recentPredictions = await (await db.prepare(
      "SELECT * FROM ltv_predictions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20"
    )).all(tid) as any[];

    const models = await (await db.prepare(
      "SELECT * FROM ltv_models WHERE tenant_id = ? ORDER BY trained_at DESC LIMIT 5"
    )).all(tid) as any[];

    const trainingStatus = await (await db.prepare(
      "SELECT status, COUNT(*) as count FROM ltv_models WHERE tenant_id = ? GROUP BY status"
    )).all(tid) as any[];

    return json({
      predictions: recentPredictions.map(p => ({
        id: p.id,
        predictedLtv: p.predicted_ltv,
        confidence: p.confidence,
        horizonDays: p.horizon_days,
        createdAt: p.created_at,
      })),
      models: models.map(m => ({
        id: m.id,
        version: m.version,
        status: m.status,
        rmse: m.rmse,
        r2: m.r2,
        trainedAt: m.trained_at,
      })),
      trainingStatus: Object.fromEntries(trainingStatus.map(s => [s.status, s.count])),
    });
  } catch (e) {
    return handleApiError(e, "ltv/GET");
  }
}

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return jsonError("Authentication required", 401);

    const enf = await checkEnforcement(user.tenantId);
    if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

    const body = await req.json();

    if (Array.isArray(body.signals)) {
      try {
        const mlRes = await fetch(`${ML_SERVICE_URL}/ltv/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: user.tenantId, features: body.signals }),
          signal: AbortSignal.timeout(10000),
        });
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          return json({ engine: "xgboost", predictions: mlData.predictions });
        }
      } catch {
        logger.info("ltv/predict", { message: "ML service unavailable, using heuristic" });
      }
      const results = await predictLTVBatch(body.signals as SignalData[]);
      return json({ engine: "heuristic", predictions: results });
    }

    const result = await predictLTV(body as SignalData);
    return json({ engine: "heuristic", ...result });
  } catch (e) {
    return handleApiError(e, "ltv/handler");
  }
}

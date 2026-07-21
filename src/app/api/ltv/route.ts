export const dynamic = "force-dynamic";
import { json, jsonError, getUserFromRequest } from "@/lib/auth";
import { predictLTV, predictLTVBatch, type SignalData } from "@/lib/ltv-engine";
import { handleApiError, logger } from "@/lib/logger";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return jsonError("Authentication required", 401);

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

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { trainModel, getActiveModel, getModelHistory, getFeedbackSummary } from "@/lib/ltv-training";
import { collectWalletFeedback } from "@/lib/ltv-feedback";
import { logger } from "@/lib/logger";
import { getDb } from "@/lib/db";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const model = await getActiveModel(user.tenantId);
    const history = await getModelHistory(user.tenantId, 10);
    const feedback = await getFeedbackSummary(user.tenantId);

    return NextResponse.json({ model, history, feedback });
  } catch (e) {
    logger.error("ltv/train/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const enf = await checkEnforcement(user.tenantId);
    if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

    // Collect fresh feedback first
    const feedbackResult = await collectWalletFeedback(user.tenantId);

    // ── Try Python XGBoost ML service first ──────────────────
    try {
      const db = await getDb();

      // Pull training data from the prediction_feedback table
      const rows = await db.prepare(`
        SELECT predicted_ltv, actual_ltv, platform, device_type, event_type, engagement_score
        FROM prediction_feedback
        WHERE tenant_id = ? AND actual_ltv IS NOT NULL
        LIMIT 10000
      `).all(user.tenantId) as any[];

      if (rows.length >= 50) {
        const features = rows.map(r => ({
          predicted_ltv:   r.predicted_ltv || 0,
          platform_meta:   r.platform === "meta"   ? 1 : 0,
          platform_google: r.platform === "google" ? 1 : 0,
          platform_tiktok: r.platform === "tiktok" ? 1 : 0,
          device_mobile:   r.device_type === "mobile"   ? 1 : 0,
          event_purchase:  r.event_type  === "purchase" ? 1 : 0,
          engagement_score: r.engagement_score || 0,
        }));
        const targets = rows.map(r => r.actual_ltv);

        const mlRes = await fetch(`${ML_SERVICE_URL}/ltv/train`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: user.tenantId, features, targets }),
          signal: AbortSignal.timeout(30000),
        });

        if (mlRes.ok) {
          const mlData = await mlRes.json();
          logger.info("ltv/train", { message: "XGBoost training succeeded", metrics: mlData.metrics });
          return NextResponse.json({
            engine: "xgboost",
            feedbackCollected: feedbackResult.newFeedbackCount,
            sampleCount: rows.length,
            ...mlData.metrics,
          });
        }
      }
    } catch (mlErr) {
      logger.warn("ltv/train", { message: `ML service unavailable, falling back to heuristic: ${mlErr}` });
    }

    // ── Fallback: heuristic calibration ──────────────────────
    const result = await trainModel(user.tenantId);
    return NextResponse.json({ engine: "heuristic", ...result, feedbackCollected: feedbackResult.newFeedbackCount });
  } catch (e) {
    logger.error("ltv/train/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

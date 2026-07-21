export const dynamic = "force-dynamic";
// ============================================================
// KIKI Agent Platform — LTV Accuracy Panel API
// GET /api/commerce/ltv-accuracy
// Predicted vs realized LTV accuracy grouped by segment,
// plus recent feedback summary.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getFeedbackStats } from "@/lib/ltv-feedback";
import { getUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/logger";

interface SegmentAccuracy {
  segment: string;
  count: number;
  avgPredicted: number;
  avgActual: number;
  avgErrorPct: number;
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    const segmentRows = await db.prepare(`
      SELECT
        COALESCE(segment, 'unknown') as segment,
        COUNT(*) as count,
        AVG(predicted_ltv) as avg_predicted,
        AVG(actual_ltv) as avg_actual,
        AVG(ABS(predicted_ltv - actual_ltv) / NULLIF(actual_ltv, 0) * 100) as avg_error
      FROM ltv_predictions
      WHERE tenant_id = ? AND actual_ltv IS NOT NULL
      GROUP BY segment
      ORDER BY count DESC
    `).all(user.tenantId) as Array<{
      segment: string;
      count: number;
      avg_predicted: number | null;
      avg_actual: number | null;
      avg_error: number | null;
    }>;

    const bySegment: SegmentAccuracy[] = segmentRows.map((r) => ({
      segment: r.segment,
      count: Number(r.count),
      avgPredicted: Math.round((Number(r.avg_predicted) || 0) * 100) / 100,
      avgActual: Math.round((Number(r.avg_actual) || 0) * 100) / 100,
      avgErrorPct: Math.round((Number(r.avg_error) || 0) * 100) / 100,
    }));

    const totals = await db.prepare(`
      SELECT
        COUNT(*) as total,
        AVG(ABS(predicted_ltv - actual_ltv) / NULLIF(actual_ltv, 0) * 100) as avg_error,
        SUM(CASE WHEN actual_ltv IS NOT NULL THEN 1 ELSE 0 END) as realized
      FROM ltv_predictions
      WHERE tenant_id = ?
    `).get(user.tenantId) as {
      total: number;
      avg_error: number | null;
      realized: number;
    };

    const totalPredictions = Number(totals.total) || 0;
    const realized = Number(totals.realized) || 0;
    const coverage = totalPredictions > 0 ? realized / totalPredictions : 0;
    const avgError = Math.round((Number(totals.avg_error) || 0) * 100) / 100;

    const feedback = await getFeedbackStats(user.tenantId);

    return NextResponse.json({
      success: true,
      data: {
        bySegment,
        avgError,
        coverage,
        totalFeedback: feedback.totalFeedback,
        feedback,
      },
    });
  } catch (error) {
    return handleApiError(error, "commerce/ltv-accuracy/GET");
  }
}

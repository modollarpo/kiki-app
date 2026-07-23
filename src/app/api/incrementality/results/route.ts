export const dynamic = "force-dynamic";
// ============================================================
// Incrementality Results — Get experiment results and incremental ROAS
// GET /api/incrementality/results?campaignId=xxx — Get results
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/logger";
import { getExperimentResults } from "@/lib/incrementality-arbiter";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId") || undefined;

    const results = await getExperimentResults(user.tenantId, campaignId);
    return Response.json({ ok: true, data: results });
  } catch (e) {
    return handleApiError(e, "incrementality/results/GET");
  }
}

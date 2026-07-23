export const dynamic = "force-dynamic";
// ============================================================
// Incrementality Experiment — Create ghost bidding holdout experiment
// POST /api/incrementality/experiment — Create new experiment
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";
import { createExperiment } from "@/lib/incrementality-arbiter";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { campaignId, name, holdoutPercentage } = body;

    if (!campaignId || !name) {
      return NextResponse.json({ error: "campaignId and name required" }, { status: 400 });
    }

    if (holdoutPercentage !== undefined && (holdoutPercentage < 0.01 || holdoutPercentage > 0.50)) {
      return NextResponse.json({ error: "holdoutPercentage must be between 0.01 and 0.50" }, { status: 400 });
    }

    const experimentId = await createExperiment(
      user.tenantId,
      campaignId,
      name,
      holdoutPercentage ?? 0.10
    );

    logger.info("Incrementality experiment created", {
      tenantId: user.tenantId,
      experimentId,
      campaignId,
      holdoutPercentage: holdoutPercentage ?? 0.10,
    });

    return NextResponse.json({
      ok: true,
      data: { experimentId, campaignId, name, holdoutPercentage: holdoutPercentage ?? 0.10 },
    }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "incrementality/experiment/POST");
  }
}

// ============================================================
// KIKI Agent Platform — Bidding Orchestrator API Route
// GET /api/bidding — Bidding stats
// POST /api/bidding/run — Trigger bidding cycle
// GET /api/bidding/daypart — Day-parting weights
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { runBiddingCycle, getBiddingStats, getDayPartingWeights, initBiddingEventWiring } from "@/lib/bidding";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";
import { checkEnforcement } from "@/lib/tenant";

// Register event wiring once per server process
initBiddingEventWiring();

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "daypart") {
      const weights = await getDayPartingWeights();
      return NextResponse.json({ success: true, data: weights });
    }

    const stats = await getBiddingStats(user.tenantId);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    logger.error("bidding/handler", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "run_cycle") {
      const enforcement = await checkEnforcement(user.tenantId, "all_agents");
      if (!enforcement.allowed) {
        return NextResponse.json(
          { success: false, error: enforcement.reason, upgradeRequired: true, requiredPlan: "growth" },
          { status: 403 }
        );
      }
      const decisions = await runBiddingCycle(user.tenantId);
      return NextResponse.json({
        success: true,
        data: {
          cycleCompleted: true,
          decisions: decisions.length,
          stopLosses: decisions.filter(d => d.stopLossTriggered).length,
          details: decisions,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    logger.error("bidding/handler", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

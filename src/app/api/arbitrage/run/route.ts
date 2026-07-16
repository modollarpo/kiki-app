// ============================================================
// Arbitrage Run — Trigger cross-platform budget reallocation
// POST /api/arbitrage/run — Run arbitrage cycle now
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";
import { runArbitrageCycle } from "@/lib/platform-arbitrage";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decisions = await runArbitrageCycle();

    logger.info("Arbitrage cycle triggered manually", {
      tenantId: user.tenantId,
      decisions: decisions.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        decisions: decisions.length,
        details: decisions,
      },
    });
  } catch (e) {
    return handleApiError(e, "arbitrage/run/POST");
  }
}

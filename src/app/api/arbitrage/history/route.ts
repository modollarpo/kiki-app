// ============================================================
// Arbitrage History — Get past arbitrage decisions
// GET /api/arbitrage/history?limit=20 — Get history
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/logger";
import { getArbitrageHistory } from "@/lib/platform-arbitrage";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const history = await getArbitrageHistory(user.tenantId, limit);
    return NextResponse.json({ success: true, data: history });
  } catch (e) {
    return handleApiError(e, "arbitrage/history/GET");
  }
}

export const dynamic = "force-dynamic";
// ============================================================
// Catalog Stats — Get ASC Override catalog statistics
// GET /api/catalog/stats — Returns suppression stats and LTV metrics
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/logger";
import { getCatalogStats } from "@/lib/asc-override";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stats = await getCatalogStats(user.tenantId);
    return NextResponse.json({ success: true, data: stats });
  } catch (e) {
    return handleApiError(e, "catalog/stats/GET");
  }
}

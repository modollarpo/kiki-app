export const dynamic = "force-dynamic";
// ============================================================
// ASC Override — Evaluate catalog for Advantage+ suppression
// POST /api/catalog/evaluate — Run suppression rules on product catalog
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { logger, handleApiError } from "@/lib/logger";
import { evaluateCatalog, type ProductSuppressionRule } from "@/lib/asc-override";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const enf = await checkEnforcement(user.tenantId);
    if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

    const body = await req.json();
    const { rules } = body as { rules?: ProductSuppressionRule[] };

    const result = await evaluateCatalog(user.tenantId, rules);

    logger.info("Catalog evaluation completed", {
      tenantId: user.tenantId,
      suppressed: result.suppressed,
      kept: result.keptProducts,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return handleApiError(e, "catalog/evaluate/POST");
  }
}

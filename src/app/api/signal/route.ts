export const dynamic = "force-dynamic";
// ============================================================
// Signal Intelligence Layer — Enrich and route conversion signals
// POST /api/signal — Send a conversion signal for LTV enrichment + CAPI routing
// GET  /api/signal — Get signal enrichment stats and ledger
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";
import { enrichConversionEvent, getEnrichmentStats } from "@/lib/capi";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stats = await getEnrichmentStats(user.tenantId);
    return NextResponse.json({ success: true, data: stats });
  } catch (e) {
    return handleApiError(e, "signal/GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { platform, eventName, eventTime, userData, customData, consent } = body;

    if (!platform || !eventName || !userData) {
      return NextResponse.json({ error: "platform, eventName, and userData required" }, { status: 400 });
    }

    const result = await enrichConversionEvent(user.tenantId, {
      platform,
      eventName,
      eventTime: eventTime || Date.now(),
      userData,
      customData: customData || { currency: "USD", value: 0 },
      consent: consent || { gdpr: true, ccpa: true },
    });

    logger.info("Signal enriched and routed", {
      tenantId: user.tenantId,
      eventName,
      ltvSegment: result.enriched.ltvSegment,
      predictedLtv: result.enriched.predictedLtv90d,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "signal/POST");
  }
}

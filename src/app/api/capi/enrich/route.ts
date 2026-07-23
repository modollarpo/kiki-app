export const dynamic = "force-dynamic";
// ============================================================
// KIKI Agent Platform — CAPI Enrichment API Route
// POST /api/capi/enrich — Enrich and deliver conversion events
// GET /api/capi/stats — Enrichment statistics
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { enrichConversionEvent, enrichConversionBatch, getEnrichmentStats, type ConversionEvent } from "@/lib/capi";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { events, event } = body;

    // Single event enrichment
    if (event) {
      const result = await enrichConversionEvent(user.tenantId, event as ConversionEvent);
      return NextResponse.json({
        ok: true,
        data: result,
        latencyMs: result.latencyMs,
      });
    }

    // Batch enrichment
    if (events && Array.isArray(events)) {
      if (events.length > 100) {
        return NextResponse.json(
          { ok: false, error: "Batch size limit: 100 events" },
          { status: 400 }
        );
      }
      const results = await enrichConversionBatch(user.tenantId, events);
      return NextResponse.json({
        ok: true,
        data: {
          processed: results.length,
          enriched: results.filter(r => !r.fraudBlocked && r.consentValid).length,
          fraudBlocked: results.filter(r => r.fraudBlocked).length,
          consentBlocked: results.filter(r => !r.consentValid).length,
          results,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: "Provide either 'event' or 'events' in request body" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("capi/enrich/handler", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getEnrichmentStats(user.tenantId);
    return NextResponse.json({ ok: true, data: stats });
  } catch (error) {
    logger.error("capi/enrich/handler", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

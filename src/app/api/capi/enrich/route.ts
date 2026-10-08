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
import { checkEnforcement } from "@/lib/tenant";
import { logger, handleApiError } from "@/lib/logger";

// ── Public demo mode ───────────────────────────────────────
// The marketing /demo page may POST a sample event without a JWT.
// The real enrichment pipeline runs against the isolated "demo"
// tenant (no ad-account integrations => no live platform delivery).
// Rate-limited per IP; payload strictly sanitized.

const DEMO_TENANT_ID = "demo";
const DEMO_PLATFORMS = new Set(["meta", "google", "tiktok", "snap", "pinterest", "linkedin"]);
const demoRate = new Map<string, { count: number; resetAt: number }>();

function demoRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = demoRate.get(key);
  if (!entry || now > entry.resetAt) {
    demoRate.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  if (demoRate.size > 1000) demoRate.clear();
  return entry.count > 12;
}

function sanitizeDemoEvent(raw: unknown): ConversionEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const platform = String(e.platform || "");
  if (!DEMO_PLATFORMS.has(platform)) return null;

  const customData = (e.customData || {}) as Record<string, unknown>;
  const value = Number(customData.value);
  if (!Number.isFinite(value) || value <= 0 || value > 50000) return null;

  const userData = (e.userData || {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : undefined);

  return {
    platform: platform as ConversionEvent["platform"],
    eventName: str(e.eventName, 64) || "Purchase",
    eventTime: Number.isFinite(Number(e.eventTime)) ? Math.floor(Number(e.eventTime)) : Math.floor(Date.now() / 1000),
    userData: {
      email: str(userData.email, 120),
      externalId: str(userData.externalId, 64),
      ipAddress: str(userData.ipAddress, 45),
      userAgent: str(userData.userAgent, 256),
    },
    customData: {
      currency: str(customData.currency, 8) || "USD",
      value,
      orderId: str(customData.orderId, 64),
      productCategory: str(customData.productCategory, 64),
      contentName: str(customData.contentName, 120),
    },
    consent: { gdpr: true, ccpa: true },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const user = getUserFromRequest(req);

    if (!user) {
      if (body?.demo === true) {
        const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local").split(",")[0].trim();
        if (demoRateLimited(ip)) {
          return NextResponse.json({ ok: false, error: "Demo rate limit exceeded — try again in a minute." }, { status: 429 });
        }
        const event = sanitizeDemoEvent(body.event);
        if (!event) {
          return NextResponse.json({ ok: false, error: "Invalid demo event" }, { status: 400 });
        }
        const result = await enrichConversionEvent(DEMO_TENANT_ID, event);
        return NextResponse.json({ ok: true, demo: true, data: result, latencyMs: result.latencyMs });
      }
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const enf = await checkEnforcement(user.tenantId);
    if (!enf.allowed) {
      return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });
    }

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

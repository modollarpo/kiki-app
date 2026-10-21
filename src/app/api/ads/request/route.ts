export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  serveAd,
  verifyAdServiceRequest,
  adCorsHeaders,
  AD_CORS_METHODS,
  AD_CORS_ALLOW_HEADERS,
  parseAdFormat,
  type AdFormat,
} from "@/lib/ad-server";

interface AdRequestBody {
  property?: string;
  placementId?: string;
  slot?: string;
  format?: string;
  width?: number;
  height?: number;
  minDuration?: number;
  maxDuration?: number;
  skip?: boolean;
  contentId?: string;
  user?: { id?: string; consent?: string; geo?: string; device?: string };
  cap?: { impressions?: number; windowHours?: number };
  cb?: string;
}

function baseUrl(req: NextRequest): string {
  return (process.env.AD_SERVER_BASE_URL || new URL(req.url).origin).replace(/\/+$/, "");
}

function optionalInt(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...adCorsHeaders(origin),
      "Access-Control-Allow-Methods": AD_CORS_METHODS,
      "Access-Control-Allow-Headers": AD_CORS_ALLOW_HEADERS,
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdServiceRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: AdRequestBody;
  try {
    body = (await req.json()) as AdRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const cap =
    body.cap && optionalInt(body.cap.impressions) && optionalInt(body.cap.windowHours)
      ? { impressions: optionalInt(body.cap.impressions)!, windowHours: optionalInt(body.cap.windowHours)! }
      : undefined;

  try {
    const db = await getDb();
    const result = await serveAd(db, {
      property: body.property || undefined,
      placementId: body.placementId || undefined,
      slot: body.slot || undefined,
      format: parseAdFormat(body.format),
      width: optionalInt(body.width),
      height: optionalInt(body.height),
      minDuration: optionalInt(body.minDuration),
      maxDuration: optionalInt(body.maxDuration),
      skip: typeof body.skip === "boolean" ? body.skip : undefined,
      contentId: body.contentId || undefined,
      userHash: body.user?.id || undefined,
      requestId: body.cb || undefined,
      cap,
      baseUrl: baseUrl(req),
    });

    if (!result) {
      return NextResponse.json({ ok: true, impressionId: null, creative: null });
    }

    const creative = result.creative;
    return NextResponse.json({
      ok: true,
      impressionId: result.impressionId,
      adId: creative.id,
      price: { cpm: result.priceCpm, currency: "USD" },
      creative: {
        type: creative.format as AdFormat,
        mediaUrl: creative.mediaUrl,
        imageUrl: creative.imageUrl,
        voiceoverUrl: creative.voiceoverUrl,
        clickThroughUrl: result.urls.click,
        duration: creative.durationSeconds,
        skipAfterSeconds: creative.skipAfterSeconds,
        width: creative.width,
        height: creative.height,
      },
      tracking: {
        impression: result.urls.impression,
        complete: result.urls.tracking.complete,
        skip: result.urls.tracking.skip,
        error: result.urls.error,
        firstQuartile: result.urls.tracking.q1,
        midpoint: result.urls.tracking.mid,
        thirdQuartile: result.urls.tracking.q3,
      },
      vastUrl: `${baseUrl(req)}/api/ads/vast?placementId=${encodeURIComponent(result.slot.id)}&format=${creative.format}&pid=${encodeURIComponent(result.impressionId)}`,
    });
  } catch (e) {
    logger.warn("[AdServer] request failed:", { error: (e as Error).message });
    return NextResponse.json({ ok: false, error: "Ad request failed" }, { status: 500 });
  }
}

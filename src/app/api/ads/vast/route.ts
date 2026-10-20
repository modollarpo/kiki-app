export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  serveAd,
  adCorsHeaders,
  AD_CORS_METHODS,
  AD_CORS_ALLOW_HEADERS,
  parseAdFormat,
  type AdEventType,
} from "@/lib/ad-server";
import { buildVastXml, buildEmptyVast, type VastEvent } from "@/lib/vast";

function baseUrl(req: NextRequest): string {
  return (process.env.AD_SERVER_BASE_URL || new URL(req.url).origin).replace(/\/+$/, "");
}

function toInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function vastResponse(req: NextRequest, xml: string): NextResponse {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      ...adCorsHeaders(origin),
    },
  });
}

// Map the network's internal beacon codes onto VAST tracking event names.
const VAST_EVENT_MAP: Partial<Record<AdEventType, VastEvent>> = {
  start: "start",
  q1: "firstQuartile",
  mid: "midpoint",
  q3: "thirdQuartile",
  complete: "complete",
  skip: "skip",
  mute: "mute",
  unmute: "unmute",
  pause: "pause",
  resume: "resume",
  fullscreen: "fullscreen",
};

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

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  try {
    const db = await getDb();
    const result = await serveAd(db, {
      property: params.get("property") || undefined,
      placementId: params.get("placementId") || params.get("pid") || undefined,
      slot: params.get("slot") || undefined,
      format: parseAdFormat(params.get("format")),
      width: toInt(params.get("w") ?? params.get("width")),
      height: toInt(params.get("h") ?? params.get("height")),
      minDuration: toInt(params.get("minDuration")),
      maxDuration: toInt(params.get("maxDuration")),
      skip: params.get("skip") === "0" ? false : undefined,
      contentId: params.get("cid") || undefined,
      userHash: params.get("uh") || undefined,
      requestId: params.get("cb") || params.get("rid") || undefined,
      baseUrl: baseUrl(req),
    });

    if (!result) return vastResponse(req, buildEmptyVast());

    const creative = result.creative;
    const trackingUrls: Partial<Record<VastEvent, string>> = {};
    for (const [code, url] of Object.entries(result.urls.tracking) as [AdEventType, string | undefined][]) {
      const vastEvent = VAST_EVENT_MAP[code];
      if (vastEvent && url) trackingUrls[vastEvent] = url;
    }

    const mimeType =
      creative.format === "audio" ? "audio/mpeg" : creative.format === "image" ? "image/png" : "video/mp4";

    const xml = buildVastXml({
      adId: result.impressionId,
      title: creative.name || "KIKI Ad",
      duration: creative.durationSeconds,
      skipAfterSeconds: creative.skipAfterSeconds,
      mediaFiles: [
        {
          url: creative.mediaUrl || creative.imageUrl || "",
          mimeType,
          width: creative.width,
          height: creative.height,
        },
      ],
      impressionUrl: result.urls.impression,
      clickThroughUrl: result.urls.click,
      clickTrackingUrls: [result.urls.click],
      trackingUrls,
      errorUrl: result.urls.error,
    });
    return vastResponse(req, xml);
  } catch (e) {
    logger.warn("[AdServer] vast request failed:", { error: (e as Error).message });
    return vastResponse(req, buildEmptyVast());
  }
}

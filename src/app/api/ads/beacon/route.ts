export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { recordAdEvent, verifyAdToken, isAdEventType, adCorsHeaders, type AdEventType } from "@/lib/ad-server";

// 1x1 transparent GIF.
const TRANSPARENT_GIF = new Uint8Array(
  Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")
);

function pixel(req: NextRequest): NextResponse {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      ...adCorsHeaders(origin),
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...adCorsHeaders(origin),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const eventType = params.get("e") || "imp";
  const impressionId = params.get("id") || "";
  const token = params.get("t") || "";

  // A malformed beacon still returns a pixel — tracking must never surface an
  // error to the player — but nothing is recorded.
  if (!impressionId || !token || !isAdEventType(eventType)) return pixel(req);

  const payload = verifyAdToken(token);
  if (!payload || payload.i !== impressionId) return pixel(req);

  try {
    const db = await getDb();
    await recordAdEvent(db, {
      tenantId: payload.t,
      impressionId,
      eventType: eventType as AdEventType,
    });
  } catch (e) {
    logger.warn("[AdServer] beacon failed:", { error: (e as Error).message });
  }

  return pixel(req);
}

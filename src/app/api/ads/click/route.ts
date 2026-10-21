export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  recordAdEvent,
  resolveClickTarget,
  verifyAdToken,
  adCorsHeaders,
} from "@/lib/ad-server";
import { sanitizeClickUrl, defaultClickUrl } from "@/lib/click-url";

function redirectTo(req: NextRequest, destination: string): NextResponse {
  const origin = req.headers.get("origin") || "";
  return NextResponse.redirect(destination, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      ...adCorsHeaders(origin),
    },
  });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const impressionId = params.get("id") || "";
  const token = params.get("t") || "";

  if (!impressionId || !token) return redirectTo(req, defaultClickUrl());

  const payload = verifyAdToken(token);
  if (!payload || payload.i !== impressionId) return redirectTo(req, defaultClickUrl());

  try {
    const db = await getDb();
    await recordAdEvent(db, { tenantId: payload.t, impressionId, eventType: "click" });
    const target = await resolveClickTarget(db, impressionId);
    // The stored creative click_url is tenant-supplied and untrusted: a
    // javascript:/data: value or an arbitrary host must never reach Location.
    const safe = sanitizeClickUrl(target.url);
    return redirectTo(req, safe || defaultClickUrl());
  } catch (e) {
    logger.warn("[AdServer] click failed:", { error: (e as Error).message });
    return redirectTo(req, defaultClickUrl());
  }
}

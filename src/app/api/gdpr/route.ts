import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { exportUserData, deleteUserData, recordConsent, getConsentStatus } from "@/lib/gdpr";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "consent";

    switch (action) {
      case "export": {
        const data = await exportUserData(user.tenantId, user.id);
        return NextResponse.json(data);
      }
      case "consent": {
        const consents = await getConsentStatus(user.tenantId, user.id);
        return NextResponse.json({ consents });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    logger.error("gdpr/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "consent": {
        const consentType = body.consentType as "analytics" | "marketing" | "third_party" | "data_processing";
        const granted = body.granted as boolean;
        if (!consentType || granted === undefined) {
          return NextResponse.json({ error: "consentType and granted required" }, { status: 400 });
        }
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
        const userAgent = req.headers.get("user-agent") || undefined;
        await recordConsent({
          tenantId: user.tenantId,
          userId: user.id,
          consentType,
          granted,
          timestamp: new Date().toISOString(),
          ipAddress: ipAddress || undefined,
          userAgent: userAgent || undefined,
        });
        return NextResponse.json({ success: true });
      }
      case "delete": {
        const { anonymizeOnly, ...options } = body;
        const result = await deleteUserData(user.tenantId, user.id, { anonymizeOnly, ...options });
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    logger.error("gdpr/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

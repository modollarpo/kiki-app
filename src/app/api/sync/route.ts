export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { syncPlatformCampaigns, syncAllPlatforms, getSyncStatus } from "@/lib/platform-sync";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const status = await getSyncStatus(user.tenantId);
    return NextResponse.json({ integrations: status });
  } catch (e) {
    logger.error("sync/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const enf = await checkEnforcement(user.tenantId, "capi");
    if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

    const body = await req.json();
    const { platform, syncAll } = body;

    if (syncAll) {
      const results = await syncAllPlatforms(user.tenantId);
      return NextResponse.json({ synced: results });
    }

    if (!platform) {
      return NextResponse.json({ ok: false, error: "platform is required" }, { status: 400 });
    }

    const result = await syncPlatformCampaigns(user.tenantId, platform);
    return NextResponse.json(result);
  } catch (e) {
    logger.error("sync/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

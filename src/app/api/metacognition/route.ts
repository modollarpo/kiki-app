export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMetacognitionDashboard, analyzeConfidenceCalibration, analyzeFactorAttribution, runSelfReflection, adaptStrategy } from "@/lib/metacognition";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const view = url.searchParams.get("view") || "dashboard";

    switch (view) {
      case "dashboard": {
        const dashboard = await getMetacognitionDashboard(user.tenantId);
        return NextResponse.json(dashboard);
      }
      case "calibration": {
        const calibration = await analyzeConfidenceCalibration(user.tenantId);
        return NextResponse.json({ calibration });
      }
      case "attribution": {
        const attributions = await analyzeFactorAttribution(user.tenantId);
        return NextResponse.json({ attributions });
      }
      case "reflection": {
        const reflection = await runSelfReflection(user.tenantId);
        return NextResponse.json(reflection);
      }
      default: {
        const dashboard = await getMetacognitionDashboard(user.tenantId);
        return NextResponse.json(dashboard);
      }
    }
  } catch (e) {
    logger.error("metacognition/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const strategy = await adaptStrategy(user.tenantId);
    return NextResponse.json({ strategy, applied: !!strategy });
  } catch (e) {
    logger.error("metacognition/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

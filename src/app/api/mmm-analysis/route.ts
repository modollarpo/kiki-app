export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { proxyToService } from "@/lib/service-proxy";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  return proxyToService(req, {
    path: "/api/runs",
    method: "POST",
    body: { ...body, tenantId: user.tenantId },
    serviceName: "Media Mix Modelling",
    envVar: "MMM_URL",
    fallback: { status: "ok", message: "MMM analysis queued (demo mode)", runId: "demo_" + Date.now() },
  });
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return proxyToService(req, {
    path: "/api/recommendations",
    method: "GET",
    query: `tenantId=${user.tenantId}`,
    serviceName: "Media Mix Modelling",
    envVar: "MMM_URL",
    fallback: {
      recommendations: [
        { channel: "Meta", currentSpend: 8500, recommendedSpend: 12000, roi: 4.2, change: "+41%" },
        { channel: "Google", currentSpend: 4200, recommendedSpend: 8000, roi: 3.8, change: "+90%" },
        { channel: "TikTok", currentSpend: 6500, recommendedSpend: 5000, roi: 2.9, change: "-23%" },
        { channel: "YouTube", currentSpend: 12000, recommendedSpend: 8000, roi: 2.1, change: "-33%" },
      ],
      totalBudget: 50000,
      projectedRoas: 3.6,
      confidence: 0.87,
    },
  });
}

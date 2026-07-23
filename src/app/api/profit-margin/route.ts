export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { proxyToService } from "@/lib/service-proxy";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  return proxyToService(req, {
    path: "/api/margins",
    method: "POST",
    body: { ...body, tenantId: user.tenantId },
    serviceName: "Profit Margin",
    envVar: "PROFIT_MARGIN_URL",
    fallback: { status: "ok", marginId: "demo_" + Date.now() },
  });
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return proxyToService(req, {
    path: "/api/margins/portfolio",
    method: "GET",
    query: `tenantId=${user.tenantId}`,
    serviceName: "Profit Margin",
    envVar: "PROFIT_MARGIN_URL",
    fallback: {
      portfolioMargin: 0.42,
      totalRevenue: 185000,
      totalCosts: 107300,
      grossProfit: 77700,
      breakdown: [
        { campaign: "Q4 Fitness Acquisition", revenue: 62500, costs: 35800, margin: 0.43 },
        { campaign: "Retargeting - Cart Abandon", revenue: 48300, costs: 21400, margin: 0.56 },
        { campaign: "Brand Awareness YouTube", revenue: 42000, costs: 28500, margin: 0.32 },
        { campaign: "TikTok Gen-Z Acquisition", revenue: 32200, costs: 22400, margin: 0.30 },
      ],
    },
  });
}

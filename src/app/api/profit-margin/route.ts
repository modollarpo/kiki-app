export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { proxyToService } from "@/lib/service-proxy";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

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
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  return proxyToService(req, {
    path: "/api/margins/portfolio",
    method: "GET",
    query: `tenantId=${user.tenantId}`,
    serviceName: "Profit Margin",
    envVar: "PROFIT_MARGIN_URL",
    fallback: {
      data: {
        summary: {
          total_skus: 0,
          avg_margin: null,
          total_cogs: 0,
          total_revenue: 0,
          low_margin_count: 0,
          mid_margin_count: 0,
          high_margin_count: 0,
        },
        distribution: [],
      },
    },
  });
}

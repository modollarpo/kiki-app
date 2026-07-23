export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { proxyToService } from "@/lib/service-proxy";

const attributionFallback = {
  breakdown: [
    { channel: "Meta", conversions: 420, revenue: 62500, roas: 4.2, share: 0.34 },
    { channel: "Google", conversions: 680, revenue: 48300, roas: 6.8, share: 0.26 },
    { channel: "TikTok", conversions: 340, revenue: 32200, roas: 3.4, share: 0.17 },
    { channel: "YouTube", conversions: 120, revenue: 42000, roas: 2.1, share: 0.23 },
  ],
  totalConversions: 1560,
  totalRevenue: 185000,
  averageRoas: 3.8,
};

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "/api/attributions/breakdown";
  if (path.includes("://") || path.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  searchParams.delete("path");
  const qs = searchParams.toString();
  return proxyToService(req, {
    path,
    method: "GET",
    query: qs ? `${qs}&tenantId=${user.tenantId}` : `tenantId=${user.tenantId}`,
    serviceName: "Creative Attribution",
    envVar: "CREATIVE_ATTRIBUTION_URL",
    fallback: attributionFallback,
  });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  return proxyToService(req, {
    path: "/api/attributions",
    method: "POST",
    body: { ...body, tenantId: user.tenantId },
    serviceName: "Creative Attribution",
    envVar: "CREATIVE_ATTRIBUTION_URL",
    fallback: { status: "ok", attributionId: "demo_" + Date.now() },
  });
}

export async function PUT(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  return proxyToService(req, {
    path: "/api/attributions/settings",
    method: "PUT",
    body: { ...body, tenantId: user.tenantId },
    serviceName: "Creative Attribution",
    envVar: "CREATIVE_ATTRIBUTION_URL",
    fallback: { status: "ok", message: "Attribution settings updated (demo mode)" },
  });
}

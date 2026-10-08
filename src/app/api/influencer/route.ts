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
    path: "/api/creators",
    method: "POST",
    body: { ...body, tenantId: user.tenantId },
    serviceName: "Influencer",
    envVar: "INFLUENCER_URL",
    fallback: { status: "ok", creatorId: "demo_" + Date.now() },
  });
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  return proxyToService(req, {
    path: "/api/creators",
    method: "GET",
    query: `tenantId=${user.tenantId}`,
    serviceName: "Influencer",
    envVar: "INFLUENCER_URL",
    fallback: {
      creators: [
        { id: "c1", name: "Alex Rivera", platform: "tiktok", followers: 245000, engagement: 4.8, status: "active" },
        { id: "c2", name: "Maya Chen", platform: "instagram", followers: 189000, engagement: 3.2, status: "active" },
        { id: "c3", name: "Jordan Smith", platform: "youtube", followers: 520000, engagement: 5.1, status: "inactive" },
        { id: "c4", name: "Sam Wilson", platform: "tiktok", followers: 89000, engagement: 6.2, status: "active" },
      ],
    },
  });
}

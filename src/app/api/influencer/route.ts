import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { proxyToService } from "@/lib/service-proxy";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  return proxyToService(req, {
    path: "/api/creators",
    method: "POST",
    body: { ...body, tenantId: user.tenantId },
    serviceName: "Influencer",
    envVar: "INFLUENCER_URL",
  });
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return proxyToService(req, {
    path: "/api/creators",
    method: "GET",
    query: `tenantId=${user.tenantId}`,
    serviceName: "Influencer",
    envVar: "INFLUENCER_URL",
  });
}

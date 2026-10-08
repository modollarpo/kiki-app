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
    path: "/api/query",
    method: "POST",
    body: { ...body, tenantId: user.tenantId },
    serviceName: "NL Analytics",
    envVar: "NL_ANALYTICS_URL",
  });
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  return proxyToService(req, {
    path: "/api/suggestions",
    method: "GET",
    query: `tenantId=${user.tenantId}`,
    serviceName: "NL Analytics",
    envVar: "NL_ANALYTICS_URL",
  });
}

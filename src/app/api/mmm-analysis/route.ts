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
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  return proxyToService(req, {
    path: "/api/recommendations",
    method: "GET",
    query: `tenantId=${user.tenantId}`,
    serviceName: "Media Mix Modelling",
    envVar: "MMM_URL",
    fallback: {
      channels: [],
      recommendations: [],
      modelFit: null,
    },
  });
}

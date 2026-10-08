export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { proxyToService } from "@/lib/service-proxy";

const attributionFallback = {
  data: [],
};

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "/api/attributions/breakdown";
  if (path.includes("://") || path.includes("..")) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
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
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

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
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

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

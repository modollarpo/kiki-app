import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

const SERVICE_URL = process.env.CREATIVE_ATTRIBUTION_URL || "http://localhost:3021";

async function proxy(path: string, req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!path.startsWith("/")) path = `/${path}`;
  const url = new URL(path, SERVICE_URL);
  if (url.origin !== new URL(SERVICE_URL).origin) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const body = req.method !== "GET" ? await req.text() : undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url.toString(), {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "/api/attributions/breakdown";
  if (path.includes("://") || path.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  searchParams.delete("path");
  const qs = searchParams.toString();
  return proxy(`${path}${qs ? `?${qs}` : ""}`, req);
}

export async function POST(req: NextRequest) {
  return proxy("/api/attributions", req);
}

export async function PUT(req: NextRequest) {
  return proxy("/api/attributions/settings", req);
}

// ============================================================
// KIKI Agent Platform — Microservice proxy helper
// Routes that depend on the 6 standalone microservices
// (creative-attribution, mmm, competitive-intel, profit-margin,
// nl-analytics, influencer) proxy to them via env-configured URLs.
//
// When the URL is unset (defaults to localhost), the service is not
// deployed. Instead of attempting a localhost connection that always
// fails (and wastes the request timeout), we short-circuit with a
// structured 503 so the UI can show "connect your X service".
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const LOCALHOST_DEFAULT = /^https?:\/\/localhost(:\d+)?\/?$/;

export interface ServiceProxyOptions {
  /** Path appended to the service base URL, e.g. "/api/runs". */
  path: string;
  method?: string;
  body?: unknown;
  /** Query string (without leading ?) for GET requests. */
  query?: string;
  /** Human-readable service name for the not-configured message. */
  serviceName: string;
  /** Env var that configures this service, for the error payload. */
  envVar: string;
  /** Timeout in ms (default 10000). */
  timeoutMs?: number;
  /** Fallback data to return when service is not configured (instead of 503). */
  fallback?: unknown;
}

/**
 * Proxies a request to a microservice. Returns a structured 503 with
 * `code: "SERVICE_NOT_CONFIGURED"` when the service URL is the localhost
 * default (i.e. not deployed), otherwise forwards to the real service.
 */
export async function proxyToService(req: NextRequest, opts: ServiceProxyOptions): Promise<NextResponse> {
  const serviceUrl = process.env[opts.envVar] || defaultUrlFor(opts.envVar);

  if (LOCALHOST_DEFAULT.test(serviceUrl)) {
    if (opts.fallback !== undefined) {
      return NextResponse.json({ ok: true, ...opts.fallback as Record<string, unknown> });
    }
    return NextResponse.json(
      {
        success: false,
        code: "SERVICE_NOT_CONFIGURED",
        error: `${opts.serviceName} service is not configured`,
        detail: `Set ${opts.envVar} to the service URL to enable this feature.`,
      },
      { status: 503 }
    );
  }

  const method = opts.method ?? req.method;
  const url = new URL(opts.path + (opts.query ? `?${opts.query}` : ""), serviceUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10000);

  try {
    const res = await fetch(url.toString(), {
      method,
      headers: { "Content-Type": "application/json" },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : method !== "GET" ? await req.text() : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    clearTimeout(timer);
    return NextResponse.json(
      { success: false, code: "SERVICE_UNREACHABLE", error: `${opts.serviceName} service is unreachable` },
      { status: 503 }
    );
  }
}

// Mirror the defaults declared in each route so detection is accurate
// without re-importing every route's constant.
function defaultUrlFor(envVar: string): string {
  switch (envVar) {
    case "CREATIVE_ATTRIBUTION_URL": return "http://localhost:3021";
    case "MMM_URL": return "http://localhost:3022";
    case "COMPETITIVE_INTEL_URL": return "http://localhost:3023";
    case "PROFIT_MARGIN_URL": return "http://localhost:3024";
    case "NL_ANALYTICS_URL": return "http://localhost:3025";
    case "INFLUENCER_URL": return "http://localhost:3026";
    default: return "http://localhost:3021";
  }
}

import { NextRequest, NextResponse } from "next/server";

// Public paths that don't require authentication. These MUST be exact,
// real routes — NEVER use a broad substring like `pathname.includes(".")`,
// which would let an attacker craft `/api/admin.evil` to bypass auth.
const PUBLIC_PATHS = [
  "/",
  "/privacy",
  "/terms",
  "/nda",
  "/auth/login",
  "/auth/signup",
  "/auth/register",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  // Webhook endpoints (authenticated via platform signatures, not JWT)
  "/api/webhooks/",
  "/api/status",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

async function verifyJwt(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, body, sig] = parts;
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${header}.${body}`)
    );

    const sigArray = new Uint8Array(sigBytes);
    let raw = "";
    for (let i = 0; i < sigArray.length; i++) raw += String.fromCharCode(sigArray[i]);
    const expected = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    if (sig.length !== expected.length) return false;
    let mismatch = 0;
    for (let i = 0; i < sig.length; i++) mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (mismatch !== 0) return false;

    const bodyStr = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(bodyStr);
    if (!payload.exp || payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Note: static assets (_next/static, _next/image, favicon.ico, images/)
  // are excluded by the matcher config below, so they never reach here.
  // We deliberately do NOT add a `pathname.includes(".")` bypass — it would
  // let any dotted path (e.g. `/api/secret.leak`) skip authentication.

  // Check for auth token in cookies or Authorization header
  const token =
    request.cookies.get("kiki_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    // API routes return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // Page routes redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate JWT signature and expiry
  if (!(await verifyJwt(token))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // CSRF protection for state-changing API requests
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/")) {
    const method = request.method;
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");

      // Origin host must EXACTLY match the request host. A substring check
      // (e.g. `origin.includes(host)`) is bypassable via attacker-controlled
      // hosts such as `notkiki.ai` or `kiki.ai.evil.com`.
      if (origin && host) {
        let originHost: string | null = null;
        try {
          originHost = new URL(origin).host;
        } catch {
          originHost = null;
        }
        if (!originHost || originHost !== host) {
          return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - images/ (static images)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};

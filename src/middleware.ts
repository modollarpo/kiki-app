import { NextRequest, NextResponse } from "next/server";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/privacy",
  "/terms",
  "/nda",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  // Webhook endpoints (authenticated via platform signatures, not JWT)
  "/api/webhooks/",
  // Health check
  "/api/health",
  "/api/status",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for auth token in cookies or Authorization header
  const token = request.cookies.get("kiki_token")?.value
    || request.headers.get("authorization")?.replace("Bearer ", "");

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

  // Validate JWT format (basic check — full validation happens in API routes)
  const parts = token.split(".");
  if (parts.length !== 3) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 401 });
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
      const contentType = request.headers.get("content-type") || "";
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");

      // Check for CSRF: Origin must match Host, or request must be form-data with valid token
      if (origin && host && !origin.includes(host)) {
        return NextResponse.json(
          { error: "CSRF validation failed" },
          { status: 403 }
        );
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

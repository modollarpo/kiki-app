// Mobile API CORS and Rate Limiting Middleware
import { NextRequest, NextResponse } from 'next/server';

const MOBILE_API_PREFIX = '/api/mobile/v1';

// Browser origins permitted to call the mobile API. Origins are matched
// EXACTLY (scheme + host + port) after normalization — never by prefix, so
// `https://keekii.net.evil.com` is not treated as `https://keekii.net`.
// Additional origins can be supplied via MOBILE_ALLOWED_ORIGINS (comma-separated).
const STATIC_ALLOWED_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://keekii.net',
  'https://www.keekii.net',
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

function allowedOrigins(): string[] {
  const fromEnv = (process.env.MOBILE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return [...STATIC_ALLOWED_ORIGINS, ...fromEnv].map(normalizeOrigin);
}

export function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  return allowedOrigins().includes(normalized);
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

export function mobileApiMiddleware(request: NextRequest): NextResponse | null {
  // Only apply to mobile API routes
  if (!request.nextUrl.pathname.startsWith(MOBILE_API_PREFIX)) {
    return null;
  }

  const origin = request.headers.get('origin') || '';
  const allowed = isAllowedOrigin(origin);

  // Handle preflight requests. A disallowed origin receives 204 without an
  // Access-Control-Allow-Origin header, so the browser blocks the request
  // instead of being handed a wildcard grant.
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Client-Version, X-Platform');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Vary', 'Origin');
    if (allowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
  }

  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitKey = `mobile:${clientIp}:${request.nextUrl.pathname}`;
  const { allowed: withinLimit, remaining, resetAt } = checkRateLimit(rateLimitKey, 100, 60 * 1000); // 100 req/min

  if (!withinLimit) {
    const response = NextResponse.json(
      { ok: false, error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
      { status: 429 }
    );
    response.headers.set('Retry-After', Math.ceil((resetAt - Date.now()) / 1000).toString());
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());
    return response;
  }

  // Add CORS headers to response
  const response = NextResponse.next();
  response.headers.set('Vary', 'Origin');
  if (allowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());

  return response;
}

export function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get('origin') || '';
  response.headers.set('Vary', 'Origin');
  if (isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}

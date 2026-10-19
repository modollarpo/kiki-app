// ============================================================
// KIKI Agent™ — Service security helpers
// Pure, dependency-light primitives shared by every microservice:
// JWT verification, authentication middleware, tenant resolution,
// CORS allow-listing and safe integer parsing.
//
// Kept free of Express imports so it can be unit-tested directly.
// ============================================================

import crypto from "crypto";

export interface ServiceTokenPayload {
  sub?: string;
  email?: string;
  tenantId?: string;
  iss?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export interface AuthRequestLike {
  path?: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  auth?: ServiceTokenPayload;
}

export interface AuthResponseLike {
  status(code: number): AuthResponseLike;
  json(body: unknown): unknown;
}

type NextFunctionLike = (err?: unknown) => void;

// ── JWT (HS256) ────────────────────────────────────────────

function b64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function signServiceToken(
  payload: ServiceTokenPayload,
  secret: string,
  ttlSeconds = 60
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const body = b64urlJson({ iat: now, exp: now + ttlSeconds, ...payload });
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyServiceToken(token: string, secret: string): ServiceTokenPayload | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;

  let header: { alg?: string };
  try {
    header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as { alg?: string };
  } catch {
    return null;
  }
  if (header.alg !== "HS256") return null;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  let payload: ServiceTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ServiceTokenPayload;
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) return null;
  return payload;
}

// ── Config helpers ─────────────────────────────────────────

export function serviceJwtSecret(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  const secret = env.SERVICE_JWT_SECRET || env.JWT_SECRET;
  return secret && secret.length > 0 ? secret : undefined;
}

export function serviceDatabaseUrl(
  env: Record<string, string | undefined> = process.env
): string {
  const url = env.DATABASE_URL;
  if (url && url.trim().length > 0) return url;
  throw new Error(
    "DATABASE_URL is required for this service. No credential fallback is provided."
  );
}

export function corsAllowedOrigins(
  env: Record<string, string | undefined> = process.env
): string[] {
  const raw = (env.CORS_ALLOWED_ORIGINS ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ── Authentication middleware ──────────────────────────────

export interface ServiceAuthOptions {
  healthPath?: string;
  env?: Record<string, string | undefined>;
}

// Every endpoint except the health probe requires a valid HS256 bearer
// token whose `tenantId` claim scopes the request. In production a missing
// JWT_SECRET is a hard configuration error (503) — services never fall back
// to an unauthenticated mode. In non-production, an unconfigured service
// allows requests through so local Docker development keeps working.
export function createServiceAuthMiddleware(options: ServiceAuthOptions = {}) {
  const env = options.env ?? process.env;
  const healthPath = options.healthPath ?? "/health";
  const secret = serviceJwtSecret(env);
  const isProduction = env.NODE_ENV === "production";

  return function serviceAuth(
    req: AuthRequestLike,
    res: AuthResponseLike,
    next: NextFunctionLike
  ): void {
    const path = req.path ?? req.url ?? req.originalUrl ?? "";
    if (path === healthPath) {
      next();
      return;
    }

    if (!secret) {
      if (isProduction) {
        res.status(503).json({ error: "Service authentication is not configured" });
        return;
      }
      next();
      return;
    }

    const headerValue = req.headers["authorization"];
    const header = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const token = header && header.startsWith("Bearer ") ? header.slice(7) : "";
    const payload = verifyServiceToken(token, secret);
    if (!payload || typeof payload.tenantId !== "string" || payload.tenantId.length === 0) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.auth = payload;
    next();
  };
}

// Resolve the tenant from the verified token, falling back to a
// client-supplied value only when the token did not carry one (dev mode).
export function tenantOf(
  req: { auth?: ServiceTokenPayload },
  fallback?: unknown
): string | undefined {
  const fromAuth = req.auth?.tenantId;
  if (typeof fromAuth === "string" && fromAuth.length > 0) return fromAuth;
  if (typeof fallback === "string" && fallback.length > 0) return fallback;
  return undefined;
}

// ── Safe parsing ───────────────────────────────────────────

export function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  const n =
    typeof value === "number" ? value : typeof value === "string" ? parseInt(value, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

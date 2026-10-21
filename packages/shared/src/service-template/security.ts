// ============================================================
// KIKI Agent™ — Service security helpers
// Pure, dependency-light primitives shared by every microservice:
// JWT verification, authentication middleware, tenant resolution,
// CORS allow-listing and safe integer parsing.
//
// Kept free of Express imports so it can be unit-tested directly.
// ============================================================

import { SignJWT, jwtVerify } from "jose";

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
// Signing and verification both go through `jose`, so the header/claims
// encoding is standard and cannot drift from the app's minter.

export const SERVICE_TOKEN_ISSUER = "kiki-app";

export async function signServiceToken(
  payload: ServiceTokenPayload,
  secret: string,
  ttlSeconds = 60
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(payload.iss ?? SERVICE_TOKEN_ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(key);
}

export async function verifyServiceToken(
  token: string,
  secret: string,
  options: { issuer?: string } = {}
): Promise<ServiceTokenPayload | null> {
  if (!token || !secret) return null;
  try {
    const key = new TextEncoder().encode(secret);
    // Pin the algorithm so a `none`-alg or asymmetric token cannot pass, and
    // verify issuer + expiry (jose enforces `exp` automatically).
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: options.issuer ?? SERVICE_TOKEN_ISSUER,
    });
    if (typeof payload.tenantId !== "string" || payload.tenantId.length === 0) {
      return null;
    }
    return payload as ServiceTokenPayload;
  } catch {
    return null;
  }
}

// ── Config helpers ─────────────────────────────────────────

export function serviceJwtSecret(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  const dedicated = env.SERVICE_JWT_SECRET;
  if (dedicated && dedicated.length >= 32) return dedicated;

  // Development/test only: fall back to the session secret for convenience.
  // In production a missing/weak SERVICE_JWT_SECRET is a hard error — the
  // session secret must never double as the service secret.
  if (env.NODE_ENV !== "production") {
    const fallback = env.JWT_SECRET;
    if (fallback && fallback.length >= 32) return fallback;
  }
  return undefined;
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

  return async function serviceAuth(
    req: AuthRequestLike,
    res: AuthResponseLike,
    next: NextFunctionLike
  ): Promise<void> {
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
    const payload = await verifyServiceToken(token, secret);
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

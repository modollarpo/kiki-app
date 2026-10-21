import { SignJWT } from "jose";

// ── Service token minting ──────────────────────────────────
// The internal microservices require an authenticated HS256 bearer token whose
// `tenantId` claim scopes every query. The app mints a short-lived token for
// each outbound call so tenant isolation holds end-to-end.
//
// Signing uses `jose` (the same library the verifier in
// packages/shared/src/service-template/security.ts uses) rather than hand-
// rolled HMAC, so the header/claims encoding is guaranteed to match.
//
// The service secret is SEPARATE from the session secret: leaking JWT_SECRET
// must not let an attacker mint microservice tokens. SERVICE_JWT_SECRET is
// required in production; the JWT_SECRET fallback is development/test only.

export const SERVICE_TOKEN_ISSUER = "kiki-app";
export const SERVICE_TOKEN_TTL_SECONDS = 60;
const MIN_SECRET_LENGTH = 32;

// Known default/example secrets that must never be accepted.
const FORBIDDEN_SECRETS = new Set([
  "kiki-dev-secret-DO-NOT-USE-IN-PRODUCTION",
  "kiki-dev-ad-secret-DO-NOT-USE-IN-PRODUCTION",
  "changeme",
  "secret",
]);

function isUsableSecret(secret: string | undefined): secret is string {
  if (!secret) return false;
  if (secret.length < MIN_SECRET_LENGTH) return false;
  if (FORBIDDEN_SECRETS.has(secret)) return false;
  return true;
}

export function serviceTokenSecret(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  const dedicated = env.SERVICE_JWT_SECRET;
  if (isUsableSecret(dedicated)) return dedicated;

  // Outside production, allow the session secret as a convenience fallback so
  // local development without SERVICE_JWT_SECRET keeps working. In production
  // there is no fallback: a missing/weak SERVICE_JWT_SECRET is a hard error.
  if (env.NODE_ENV !== "production") {
    const fallback = env.JWT_SECRET;
    if (isUsableSecret(fallback)) return fallback;
  }
  return undefined;
}

export async function mintServiceToken(
  tenantId: string,
  ttlSeconds = SERVICE_TOKEN_TTL_SECONDS
): Promise<string | null> {
  const secret = serviceTokenSecret();
  if (!secret || !tenantId) return null;
  const key = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ tenantId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SERVICE_TOKEN_ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(key);
}

// Returns the Authorization header for an internal service call, or an
// empty object when no secret is configured (local dev without a service
// secret, where the services allow unauthenticated requests).
export async function serviceAuthHeaders(tenantId: string): Promise<Record<string, string>> {
  const token = await mintServiceToken(tenantId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

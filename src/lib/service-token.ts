import crypto from "crypto";

// ── Service token minting ──────────────────────────────────
// The internal microservices now require an authenticated HS256 bearer
// token whose `tenantId` claim scopes every query. The app mints a
// short-lived token for each outbound call so tenant isolation holds
// end-to-end. The signature scheme mirrors the verifier in
// packages/shared/src/service-template/security.ts.

export function serviceTokenSecret(): string | undefined {
  const secret = process.env.SERVICE_JWT_SECRET || process.env.JWT_SECRET;
  return secret && secret.length > 0 ? secret : undefined;
}

export function mintServiceToken(tenantId: string, ttlSeconds = 60): string | null {
  const secret = serviceTokenSecret();
  if (!secret || !tenantId) return null;
  const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ iss: "kiki-app", tenantId, iat: now, exp: now + ttlSeconds });
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

// Returns the Authorization header for an internal service call, or an
// empty object when no secret is configured (local dev without JWT_SECRET,
// where the services allow unauthenticated requests).
export function serviceAuthHeaders(tenantId: string): Record<string, string> {
  const token = mintServiceToken(tenantId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

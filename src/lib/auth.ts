import crypto from "crypto";
import { getDb } from "./db";
import type { AuthUser, SessionPayload } from "@/types";

// ── Configuration ──────────────────────────────────────────
// In production JWT_SECRET MUST be set and sufficiently strong. We validate
// lazily (at first use) rather than at module load so that `next build`
// (which sets NODE_ENV=production) doesn't crash, but the check runs on EVERY
// call — it must never silently fall back to the dev secret in production.
const DEV_SECRET = "kiki-dev-secret-DO-NOT-USE-IN-PRODUCTION";
const MIN_SECRET_LENGTH = 32;

export function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret) {
      throw new Error(
        "JWT_SECRET environment variable is required in production. " +
        "Generate one with: openssl rand -hex 32"
      );
    }
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters in production.`
      );
    }
    return secret;
  }
  return secret || DEV_SECRET;
}
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const ALGORITHM = "HS256";
const TOKEN_TYPE = "JWT";

// ── JWT Helpers ────────────────────────────────────────────
function base64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function sign(payload: SessionPayload): string {
  const secret = getSecret();
  const header = base64url(JSON.stringify({ alg: ALGORITHM, typ: TOKEN_TYPE }));
  const body = base64url(JSON.stringify(payload));
  const sig = base64url(
    crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;

    // Reject any token whose header algorithm/type we did not issue. This
    // prevents "alg:none" and algorithm-confusion attacks.
    const decodedHeader = JSON.parse(
      Buffer.from(header, "base64url").toString()
    ) as { alg?: string; typ?: string };
    if (decodedHeader.alg !== ALGORITHM || decodedHeader.typ !== TOKEN_TYPE) {
      return null;
    }

    // Verify signature (timing-safe, length-checked).
    const secret = getSecret();
    const expected = base64url(
      crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest()
    );
    const sigBuf = Buffer.from(sig, "base64url");
    const expectedBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    // Decode and verify expiry.
    const payload: SessionPayload = JSON.parse(
      Buffer.from(body, "base64url").toString()
    );
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      return null;
    }

    // Validate required fields
    if (!payload.sub || !payload.email || !payload.tenantId) return null;

    return payload;
  } catch {
    return null;
  }
}

export function createSession(user: AuthUser): string {
  const now = Date.now();
  return sign({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenantName,
    plan: user.plan,
    avatarInitials: user.avatarInitials,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + EXPIRY_MS) / 1000),
  });
}

// ── Password Hashing ───────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
}

// ── Request Helpers ────────────────────────────────────────
export function getUserFromRequest(req: Request): AuthUser | null {
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    // EventSource cannot set Authorization headers, so the token may be
    // passed as a query param (used by /api/events). Logs may retain it.
    const url = new URL(req.url);
    token = url.searchParams.get("token");
  }

  if (!token) return null;
  if (token.length > 2048) return null; // Reject obviously invalid tokens

  const payload = verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    tenantId: payload.tenantId,
    tenantName: payload.tenantName,
    plan: payload.plan,
    avatarInitials: payload.avatarInitials,
  };
}

export function requireAuth(req: Request): AuthUser {
  const user = getUserFromRequest(req);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

// ── Response Helpers ───────────────────────────────────────
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data && typeof data === "object" && !Array.isArray(data) && !("ok" in (data as Record<string, unknown>)) ? { ok: true, ...data as Record<string, unknown> } : data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function jsonError(message: string, status = 400): Response {
  return json({ error: message, ok: false }, status);
}

// ── Input Validation ───────────────────────────────────────
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRequired(
  fields: Record<string, unknown>
): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") {
      return `${key} is required`;
    }
  }
  return null;
}

export function sanitizeString(input: string, maxLength = 1000): string {
  return input.trim().slice(0, maxLength);
}

import crypto from "crypto";

// ── Google SSO security helpers ────────────────────────────
// Pure helpers shared by the Google OAuth start route and its callback.
// Kept free of framework imports so they can be unit-tested directly.

export const GOOGLE_SSO_STATE_COOKIE = "kiki_g_state";
export const GOOGLE_SSO_VERIFIER_COOKIE = "kiki_g_verifier";
export const GOOGLE_SSO_COOKIE_MAX_AGE = 600; // 10 minutes

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export function createPkcePair(): PkcePair {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function buildGoogleAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

// Constant-time string comparison for OAuth state values.
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// A Google profile is only trusted when the email is present and Google
// has explicitly reported it as verified.
export function isVerifiedGoogleEmail(
  profile: unknown
): profile is { email: string; name?: string } {
  if (!profile || typeof profile !== "object") return false;
  const p = profile as { email?: unknown; verified_email?: unknown };
  return typeof p.email === "string" && p.email.length > 0 && p.verified_email === true;
}

export function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

// Serialize a Set-Cookie value. Used instead of NextResponse.cookies.set so the
// HttpOnly/SameSite/Max-Age attributes are guaranteed across Next versions.
export function serializeSetCookie(
  name: string,
  value: string,
  opts: { maxAge?: number; secure?: boolean } = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (typeof opts.maxAge === "number") parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSetCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

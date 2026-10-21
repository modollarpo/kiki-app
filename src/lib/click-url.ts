// ============================================================
// Click-through URL safety.
//
// Creatives may be supplied by a tenant and the signed ad token only proves
// the impression was real, not that its click target is safe. An unvalidated
// redirect turns /api/ads/click into an open redirect (and, via `javascript:`
// or `data:`, a stored-XSS vector). Everything that reaches a redirect — and
// every write of a click_url — must go through sanitizeClickUrl.
//
// Kept dependency-free so both the DB layer and the ad server can import it
// without a cycle.
// ============================================================

export const MAX_CLICK_URL_LENGTH = 2048;

const DENIED_CLICK_PROTOCOLS = new Set(["javascript:", "data:", "file:", "vbscript:", "blob:"]);

function clickAllowedHosts(env: Record<string, string | undefined> = process.env): string[] {
  return (env.AD_CLICK_ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/^\.+/, ""))
    .filter((h) => h.length > 0);
}

/**
 * Parse and validate a click-through URL. Returns the original string on
 * success or null when it must not be used. `http:` is rejected in production.
 * Credentials (`user:pass@`) are always rejected. When AD_CLICK_ALLOWED_HOSTS
 * is configured, the host must equal an entry or be a subdomain of one.
 */
export function sanitizeClickUrl(
  url: unknown,
  env: Record<string, string | undefined> = process.env
): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > MAX_CLICK_URL_LENGTH) return null;

  let parsed: URL;
  try {
    // Reject scheme-relative ("//evil.com") and other ambiguous input: URL
    // parsing needs an explicit scheme to be unambiguous.
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (DENIED_CLICK_PROTOCOLS.has(protocol)) return null;
  if (protocol === "https:") {
    // ok
  } else if (protocol === "http:") {
    if (env.NODE_ENV === "production") return null;
  } else {
    return null;
  }

  // No embedded credentials — they leak into the Location header and look
  // like a phishing URL to the user.
  if (parsed.username || parsed.password) return null;
  if (!parsed.hostname) return null;

  const allowedHosts = clickAllowedHosts(env);
  if (allowedHosts.length > 0) {
    const host = parsed.hostname.toLowerCase();
    const ok = allowedHosts.some((entry) => host === entry || host.endsWith(`.${entry}`));
    if (!ok) return null;
  }

  return trimmed;
}

/**
 * Fallback click target. The env value is itself validated so a misconfigured
 * AD_DEFAULT_CLICK_URL cannot reintroduce the open redirect.
 */
export function defaultClickUrl(env: Record<string, string | undefined> = process.env): string {
  const configured = env.AD_DEFAULT_CLICK_URL;
  if (configured) {
    const safe = sanitizeClickUrl(configured, env);
    if (safe) return safe;
  }
  return "https://keekii.net";
}

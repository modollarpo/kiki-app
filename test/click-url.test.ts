import { describe, it, expect, vi, afterEach } from "vitest";
import { sanitizeClickUrl, defaultClickUrl, MAX_CLICK_URL_LENGTH } from "@/lib/click-url";

// ============================================================
// Open-redirect hardening for ad click-through URLs.
// ============================================================

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sanitizeClickUrl — rejected schemes", () => {
  it("rejects javascript: and data: URLs", () => {
    expect(sanitizeClickUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeClickUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(sanitizeClickUrl("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeClickUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects scheme-relative URLs", () => {
    expect(sanitizeClickUrl("//evil.com")).toBeNull();
    expect(sanitizeClickUrl("/relative/path")).toBeNull();
  });

  it("rejects URLs with embedded credentials", () => {
    expect(sanitizeClickUrl("https://user:pass@keekii.net")).toBeNull();
    expect(sanitizeClickUrl("https://user@keekii.net")).toBeNull();
  });

  it("rejects unparseable and over-long URLs", () => {
    expect(sanitizeClickUrl("not a url")).toBeNull();
    expect(sanitizeClickUrl("")).toBeNull();
    expect(sanitizeClickUrl("   ")).toBeNull();
    expect(sanitizeClickUrl(null)).toBeNull();
    expect(sanitizeClickUrl(123)).toBeNull();
    const long = "https://keekii.net/" + "a".repeat(MAX_CLICK_URL_LENGTH);
    expect(sanitizeClickUrl(long)).toBeNull();
  });
});

describe("sanitizeClickUrl — http in production", () => {
  it("rejects http: when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sanitizeClickUrl("http://keekii.net")).toBeNull();
    expect(sanitizeClickUrl("https://keekii.net")).toBe("https://keekii.net");
  });

  it("allows http: outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(sanitizeClickUrl("http://localhost:3000/x")).toBe("http://localhost:3000/x");
  });
});

describe("sanitizeClickUrl — valid https", () => {
  it("accepts a valid https URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sanitizeClickUrl("https://shop.example.com/offer?x=1")).toBe(
      "https://shop.example.com/offer?x=1"
    );
  });
});

describe("sanitizeClickUrl — per-tenant host allowlist", () => {
  it("requires a host match or subdomain when AD_CLICK_ALLOWED_HOSTS is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AD_CLICK_ALLOWED_HOSTS", "keekii.net,shop.example.com");
    expect(sanitizeClickUrl("https://keekii.net/path")).toBe("https://keekii.net/path");
    expect(sanitizeClickUrl("https://ads.keekii.net/path")).toBe("https://ads.keekii.net/path");
    expect(sanitizeClickUrl("https://shop.example.com/x")).toBe("https://shop.example.com/x");
    expect(sanitizeClickUrl("https://evil.com")).toBeNull();
    expect(sanitizeClickUrl("https://keekii.net.evil.com")).toBeNull();
  });
});

describe("defaultClickUrl", () => {
  it("returns the configured value when valid", () => {
    vi.stubEnv("AD_DEFAULT_CLICK_URL", "https://fallback.example.com");
    expect(defaultClickUrl()).toBe("https://fallback.example.com");
  });

  it("falls back to https://keekii.net when the env value is invalid", () => {
    vi.stubEnv("AD_DEFAULT_CLICK_URL", "javascript:alert(1)");
    expect(defaultClickUrl()).toBe("https://keekii.net");
  });

  it("falls back to https://keekii.net when unset", () => {
    vi.stubEnv("AD_DEFAULT_CLICK_URL", "");
    expect(defaultClickUrl()).toBe("https://keekii.net");
  });
});

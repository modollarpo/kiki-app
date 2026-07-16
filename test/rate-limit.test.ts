import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getClientIp, rateLimitResponse, rateLimit, clientKey } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const r = checkRateLimit("test-allow-1");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBeGreaterThan(0);
  });

  it("decrements remaining count", () => {
    const r1 = checkRateLimit("test-decrement", { maxRequests: 5 });
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit("test-decrement", { maxRequests: 5 });
    expect(r2.remaining).toBe(3);
  });

  it("blocks when limit exceeded", () => {
    const key = "test-block";
    const config = { maxRequests: 2, windowMs: 60000 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const r = checkRateLimit(key, config);

    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("resets after window expires", async () => {
    const key = "test-reset";
    const config = { maxRequests: 1, windowMs: 50 };

    checkRateLimit(key, config);
    const blocked = checkRateLimit(key, config);
    expect(blocked.allowed).toBe(false);

    // Wait for window to expire
    await new Promise(r => setTimeout(r, 60));

    const after = checkRateLimit(key, config);
    expect(after.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.8.7.6" },
    });
    expect(getClientIp(req)).toBe("9.8.7.6");
  });

  it("returns 'unknown' when no headers present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with correct headers", () => {
    const result = { allowed: false, remaining: 0, resetAt: Date.now() + 60000 };
    const res = rateLimitResponse(result);

    expect(res.status).toBe(429);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  it("returns JSON error body", async () => {
    const result = { allowed: false, remaining: 0, resetAt: Date.now() + 60000 };
    const res = rateLimitResponse(result);
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(body.error).toContain("Rate limit");
  });
});

describe("rateLimit (backwards-compatible)", () => {
  it("returns { ok: true } when allowed", () => {
    const r = rateLimit("test-bw-allow", 10, 60000);
    expect(r.ok).toBe(true);
  });

  it("returns { ok: false } when exceeded", () => {
    const key = "test-bw-block";
    rateLimit(key, 1, 60000);
    const r = rateLimit(key, 1, 60000);
    expect(r.ok).toBe(false);
  });
});

describe("clientKey", () => {
  it("returns same as getClientIp", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(clientKey(req)).toBe(getClientIp(req));
  });
});

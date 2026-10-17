import { describe, it, expect, afterEach } from "vitest";
import { refreshSecret, signRefreshToken, verifyRefreshToken } from "@/lib/mobile/auth";

const ENV_KEYS = ["MOBILE_REFRESH_SECRET", "REFRESH_SECRET", "JWT_SECRET", "MOBILE_JWT_SECRET"] as const;
const saved: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) saved[k] = process.env[k];

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("mobile auth — refresh secret resolution", () => {
  it("resolves a concrete secret instead of returning undefined", () => {
    const s = refreshSecret();
    expect(s).toBeInstanceOf(Uint8Array);
    expect(s.length).toBeGreaterThan(0);
  });

  it("falls back to JWT_SECRET so login and refresh share one key", () => {
    delete process.env.MOBILE_REFRESH_SECRET;
    delete process.env.REFRESH_SECRET;
    process.env.JWT_SECRET = "shared-test-secret-value";
    const a = refreshSecret();
    const b = refreshSecret();
    expect(Buffer.from(a).toString()).toBe("shared-test-secret-value");
    expect(Buffer.from(b).toString()).toBe(Buffer.from(a).toString());
  });

  it("prefers the dedicated refresh secret when provided", () => {
    process.env.MOBILE_REFRESH_SECRET = "dedicated-refresh-secret";
    expect(Buffer.from(refreshSecret()).toString()).toBe("dedicated-refresh-secret");
  });

  it("fails loud in production when no secret is configured (no hardcoded default)", () => {
    delete process.env.MOBILE_REFRESH_SECRET;
    delete process.env.REFRESH_SECRET;
    delete process.env.JWT_SECRET;
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(() => refreshSecret()).toThrow(/MOBILE_REFRESH_SECRET/);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("round-trips a refresh token signed and verified with the same resolution", async () => {
    process.env.MOBILE_REFRESH_SECRET = "roundtrip-secret";
    const token = await signRefreshToken({ sub: "u1", email: "a@b.com", tenantId: "t1", role: "advertiser" });
    const payload = await verifyRefreshToken(token);
    expect(payload?.sub).toBe("u1");
    expect(payload?.tenantId).toBe("t1");
  });
});

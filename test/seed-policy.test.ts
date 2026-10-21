import { describe, it, expect, vi, afterEach } from "vitest";
import {
  shouldSeedDemoData,
  demoSeedPassword,
  validateEnvironment,
  seedRouteEnabled,
  seedRouteShouldHide,
} from "@/lib/env";

// ============================================================
// Demo-seed safety policy + production startup guard.
// ============================================================

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("shouldSeedDemoData", () => {
  it("does not seed when SEED_DEMO_DATA is unset", () => {
    expect(shouldSeedDemoData({})).toBe(false);
  });

  it("seeds in development when explicitly enabled", () => {
    expect(
      shouldSeedDemoData({ SEED_DEMO_DATA: "true", NODE_ENV: "development" })
    ).toBe(true);
  });

  it("never seeds in production, even when enabled", () => {
    expect(
      shouldSeedDemoData({ SEED_DEMO_DATA: "true", NODE_ENV: "production" })
    ).toBe(false);
  });
});

describe("demoSeedPassword", () => {
  it("uses the configured password when it is long enough", () => {
    expect(
      demoSeedPassword("user", { DEMO_USER_PASSWORD: "supersecret1" })
    ).toBe("supersecret1");
  });

  it("generates a fresh random password when unset", () => {
    const a = demoSeedPassword("admin", {});
    const b = demoSeedPassword("admin", {});
    expect(a.length).toBeGreaterThanOrEqual(16);
    expect(a).not.toBe(b);
  });
});

describe("production environment validation", () => {
  it("fails startup when JWT_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "");
    vi.stubEnv("JWT_SECRET", "");
    expect(() => validateEnvironment()).toThrow(/JWT_SECRET/);
  });
});

describe("seedRouteEnabled", () => {
  it("denies non-superadmin roles", () => {
    expect(seedRouteEnabled("advertiser", { ALLOW_TENANT_SEED: "true" })).toBe(false);
    expect(seedRouteEnabled("admin", { ALLOW_TENANT_SEED: "true" })).toBe(false);
    expect(seedRouteEnabled(undefined, { ALLOW_TENANT_SEED: "true" })).toBe(false);
  });

  it("denies superadmin without the explicit opt-in", () => {
    expect(seedRouteEnabled("superadmin", {})).toBe(false);
    expect(seedRouteEnabled("superadmin", { ALLOW_TENANT_SEED: "false" })).toBe(false);
  });

  it("allows superadmin with ALLOW_TENANT_SEED=true", () => {
    expect(seedRouteEnabled("superadmin", { ALLOW_TENANT_SEED: "true" })).toBe(true);
  });
});

describe("seedRouteShouldHide", () => {
  it("hides the endpoint in production unless explicitly enabled", () => {
    expect(seedRouteShouldHide({ NODE_ENV: "production" })).toBe(true);
    expect(seedRouteShouldHide({ NODE_ENV: "production", ALLOW_TENANT_SEED: "true" })).toBe(false);
  });

  it("never hides the endpoint outside production", () => {
    expect(seedRouteShouldHide({ NODE_ENV: "development" })).toBe(false);
    expect(seedRouteShouldHide({ NODE_ENV: "test" })).toBe(false);
  });
});

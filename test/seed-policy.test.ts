import { describe, it, expect, vi, afterEach } from "vitest";
import { shouldSeedDemoData, demoSeedPassword, validateEnvironment } from "@/lib/env";

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

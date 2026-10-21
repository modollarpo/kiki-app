import { describe, it, expect, vi, afterEach, beforeAll, afterAll, beforeEach } from "vitest";
import {
  shouldSeedDemoData,
  demoSeedPassword,
  validateEnvironment,
  seedRouteEnabled,
  seedRouteShouldHide,
  seedWalletBalance,
} from "@/lib/env";
import { getDb } from "@/lib/db";
import { isDbAvailable } from "./db-env";

// ============================================================
// Demo-seed safety policy + production startup guard.
// ============================================================

const dbAvailable = await isDbAvailable();

let adminToken = "";
let adminTenant = "";

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

describe("seedWalletBalance — demo seeding never fabricates money", () => {
  it("never creates a wallet in production", () => {
    expect(seedWalletBalance({ NODE_ENV: "production" })).toBeNull();
    expect(
      seedWalletBalance({ NODE_ENV: "production", ALLOW_TENANT_SEED: "true" })
    ).toBeNull();
  });

  it("creates a zero-balance wallet outside production", () => {
    expect(seedWalletBalance({ NODE_ENV: "development" })).toBe(0);
    expect(seedWalletBalance({ NODE_ENV: "test" })).toBe(0);
  });

  it("never returns a non-zero balance", () => {
    for (const env of [
      { NODE_ENV: "development" },
      { NODE_ENV: "test" },
      { NODE_ENV: "production" },
      {},
    ]) {
      const balance = seedWalletBalance(env);
      if (balance !== null) expect(balance).toBe(0);
    }
  });
});

// ============================================================
// End-to-end: POST /api/seed must not create or mutate money.
// ============================================================

function req(url: string, method: string, body: unknown, token: string): Request {
  return {
    url: `http://localhost:3000${url}`,
    method,
    headers: new Headers({
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    }),
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

describe.skipIf(!dbAvailable)("POST /api/seed — no fabricated wallet balance", () => {
  beforeAll(async () => {
    vi.stubEnv("ALLOW_TENANT_SEED", "true");
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      req("/api/auth/login", "POST", { email: "admin@keekii.net", password: "admin123" }, "")
    );
    const data = await res.json();
    adminToken = data.token ?? "";
    adminTenant = data.user?.tenantId ?? "";
    expect(adminToken.length).toBeGreaterThan(0);
    expect(adminTenant.length).toBeGreaterThan(0);
  });

  // The file-level afterEach clears stubs after every test, so re-arm the
  // opt-in before each case in this block.
  beforeEach(() => {
    vi.stubEnv("ALLOW_TENANT_SEED", "true");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("never writes a $5000 wallet and leaves a real balance untouched", async () => {
    const db = await getDb();
    const walletId = `w_seedtest_${Date.now()}`;
    const knownBalance = 1234;

    await db.prepare("DELETE FROM wallets WHERE tenant_id = ?").run(adminTenant);
    await db
      .prepare("INSERT INTO wallets (id, tenant_id, balance, currency) VALUES (?, ?, ?, 'USD')")
      .run(walletId, adminTenant, knownBalance);

    const { POST } = await import("@/app/api/seed/route");
    const res = await POST(req("/api/seed", "POST", { confirm: true }, adminToken));
    expect(res.status).toBe(200);

    const wallet = (await (
      await db.prepare("SELECT id, balance FROM wallets WHERE tenant_id = ?")
    ).get(adminTenant)) as { id: string; balance: number } | undefined;

    expect(wallet).toBeDefined();
    expect(wallet!.id).toBe(walletId);
    expect(wallet!.balance).toBe(knownBalance);

    // No wallet anywhere may hold the old fabricated demo balance.
    const fabricated = await (
      await db.prepare("SELECT COUNT(*) as c FROM wallets WHERE balance = 5000")
    ).get() as { c: number };
    expect(fabricated.c).toBe(0);
  });

  it("creates a zero-balance (never $5000) wallet when none exists", async () => {
    const db = await getDb();
    await db.prepare("DELETE FROM wallets WHERE tenant_id = ?").run(adminTenant);

    const { POST } = await import("@/app/api/seed/route");
    const res = await POST(req("/api/seed", "POST", { confirm: true }, adminToken));
    expect(res.status).toBe(200);

    const wallet = (await (
      await db.prepare("SELECT id, balance FROM wallets WHERE tenant_id = ?")
    ).get(adminTenant)) as { id: string; balance: number } | undefined;

    expect(wallet).toBeDefined();
    expect(wallet!.balance).toBe(0);
  });
});

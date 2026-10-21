import { describe, it, expect } from "vitest";
import {
  signServiceToken,
  verifyServiceToken,
  serviceJwtSecret,
  serviceDatabaseUrl,
  corsAllowedOrigins,
  createServiceAuthMiddleware,
  tenantOf,
  parsePositiveInt,
  type AuthRequestLike,
} from "../packages/shared/src/service-template/security";

const SECRET = "test-service-secret-at-least-32-characters!!";

// ── Token round-trip ───────────────────────────────────────
describe("service JWT", () => {
  it("round-trips a signed token and preserves claims", async () => {
    const token = await signServiceToken({ tenantId: "t1", sub: "u1" }, SECRET, 60);
    const payload = await verifyServiceToken(token, SECRET);
    expect(payload?.tenantId).toBe("t1");
    expect(payload?.sub).toBe("u1");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signServiceToken({ tenantId: "t1" }, SECRET, 60);
    expect(await verifyServiceToken(token, "other-secret-at-least-32-characters-long")).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = await signServiceToken({ tenantId: "t1" }, SECRET, 60);
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ tenantId: "t2", exp: 9999999999 })).toString("base64url");
    expect(await verifyServiceToken(`${h}.${forged}.${s}`, SECRET)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signServiceToken({ tenantId: "t1" }, SECRET, -10);
    expect(await verifyServiceToken(token, SECRET)).toBeNull();
  });

  it("rejects an unsigned (alg=none) token", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ tenantId: "t1" })).toString("base64url");
    expect(await verifyServiceToken(`${header}.${body}.`, SECRET)).toBeNull();
  });

  it("rejects a token with the wrong issuer", async () => {
    const token = await signServiceToken({ tenantId: "t1", iss: "someone-else" }, SECRET, 60);
    expect(await verifyServiceToken(token, SECRET)).toBeNull();
  });

  it("rejects a token missing the tenantId claim", async () => {
    const token = await signServiceToken({ sub: "u1" }, SECRET, 60);
    expect(await verifyServiceToken(token, SECRET)).toBeNull();
  });
});

// ── Config helpers ─────────────────────────────────────────
describe("config helpers", () => {
  it("requires a dedicated SERVICE_JWT_SECRET in production", () => {
    const strong = "a".repeat(32);
    expect(serviceJwtSecret({ NODE_ENV: "production", SERVICE_JWT_SECRET: strong })).toBe(strong);
    // No JWT_SECRET fallback in production.
    expect(serviceJwtSecret({ NODE_ENV: "production", JWT_SECRET: strong })).toBeUndefined();
    // Too-short secrets are rejected.
    expect(serviceJwtSecret({ NODE_ENV: "production", SERVICE_JWT_SECRET: "short" })).toBeUndefined();
  });

  it("falls back to JWT_SECRET outside production", () => {
    const strong = "b".repeat(32);
    expect(serviceJwtSecret({ NODE_ENV: "development", SERVICE_JWT_SECRET: strong, JWT_SECRET: "c".repeat(32) })).toBe(strong);
    expect(serviceJwtSecret({ NODE_ENV: "development", JWT_SECRET: strong })).toBe(strong);
    expect(serviceJwtSecret({ NODE_ENV: "development" })).toBeUndefined();
  });

  it("requires DATABASE_URL and never falls back to hardcoded credentials", () => {
    expect(() => serviceDatabaseUrl({})).toThrow(/DATABASE_URL is required/);
    expect(serviceDatabaseUrl({ DATABASE_URL: "postgres://x/y" })).toBe("postgres://x/y");
  });

  it("parses a CORS allow-list and defaults to none", () => {
    expect(corsAllowedOrigins({})).toEqual([]);
    expect(corsAllowedOrigins({ CORS_ALLOWED_ORIGINS: "https://a.com, https://b.com" })).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });
});

// ── Authentication middleware ──────────────────────────────
describe("service auth middleware", () => {
  function makeRes() {
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };
    return res;
  }

  it("always allows the health probe", async () => {
    const mw = createServiceAuthMiddleware({ env: { NODE_ENV: "production" } });
    const res = makeRes();
    let called = false;
    await mw({ path: "/health", headers: {} }, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it("returns 503 in production when no secret is configured", async () => {
    const mw = createServiceAuthMiddleware({ env: { NODE_ENV: "production" } });
    const res = makeRes();
    await mw({ path: "/api/x", headers: {} }, res, () => {});
    expect(res.statusCode).toBe(503);
  });

  it("allows unauthenticated access in non-production when unconfigured", async () => {
    const mw = createServiceAuthMiddleware({ env: { NODE_ENV: "development" } });
    const res = makeRes();
    let called = false;
    await mw({ path: "/api/x", headers: {} }, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it("rejects missing or invalid tokens once a secret is set", async () => {
    const mw = createServiceAuthMiddleware({
      env: { NODE_ENV: "production", SERVICE_JWT_SECRET: SECRET },
    });
    const missing = makeRes();
    await mw({ path: "/api/x", headers: {} }, missing, () => {});
    expect(missing.statusCode).toBe(401);

    const bad = makeRes();
    await mw({ path: "/api/x", headers: { authorization: "Bearer not-a-token" } }, bad, () => {});
    expect(bad.statusCode).toBe(401);
  });

  it("accepts a valid token and attaches claims to req.auth", async () => {
    const mw = createServiceAuthMiddleware({
      env: { NODE_ENV: "production", SERVICE_JWT_SECRET: SECRET },
    });
    const token = await signServiceToken({ tenantId: "tenant-42" }, SECRET, 60);
    const res = makeRes();
    const req: AuthRequestLike = {
      path: "/api/x",
      headers: { authorization: `Bearer ${token}` },
    };
    let called = false;
    await mw(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.auth?.tenantId).toBe("tenant-42");
  });
});

// ── Tenant + parsing ───────────────────────────────────────
describe("tenant resolution and parsing", () => {
  it("prefers the token tenant over a client fallback", () => {
    expect(tenantOf({ auth: { tenantId: "token" } }, "client")).toBe("token");
    expect(tenantOf({}, "client")).toBe("client");
    expect(tenantOf({})).toBeUndefined();
  });

  it("clamps parsed integers and rejects injection payloads", () => {
    expect(parsePositiveInt("30", 52, 520)).toBe(30);
    expect(parsePositiveInt(9999, 52, 520)).toBe(520);
    expect(parsePositiveInt("10; DROP TABLE x", 52, 520)).toBe(10);
    expect(parsePositiveInt(undefined, 52, 520)).toBe(52);
    expect(parsePositiveInt(-5, 52, 520)).toBe(52);
    expect(parsePositiveInt("abc", 52, 520)).toBe(52);
  });
});

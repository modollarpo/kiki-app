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

// ── Token round-trip ───────────────────────────────────────
describe("service JWT", () => {
  const secret = "test-service-secret";

  it("round-trips a signed token and preserves claims", () => {
    const token = signServiceToken({ tenantId: "t1", sub: "u1" }, secret, 60);
    const payload = verifyServiceToken(token, secret);
    expect(payload?.tenantId).toBe("t1");
    expect(payload?.sub).toBe("u1");
  });

  it("rejects a token signed with a different secret", () => {
    const token = signServiceToken({ tenantId: "t1" }, secret, 60);
    expect(verifyServiceToken(token, "other-secret")).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = signServiceToken({ tenantId: "t1" }, secret, 60);
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ tenantId: "t2", exp: 9999999999 })).toString("base64url");
    expect(verifyServiceToken(`${h}.${forged}.${s}`, secret)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signServiceToken({ tenantId: "t1" }, secret, -10);
    expect(verifyServiceToken(token, secret)).toBeNull();
  });

  it("rejects an unsigned (alg=none) token", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ tenantId: "t1" })).toString("base64url");
    expect(verifyServiceToken(`${header}.${body}.`, secret)).toBeNull();
  });
});

// ── Config helpers ─────────────────────────────────────────
describe("config helpers", () => {
  it("prefers SERVICE_JWT_SECRET over JWT_SECRET", () => {
    expect(serviceJwtSecret({ SERVICE_JWT_SECRET: "a", JWT_SECRET: "b" })).toBe("a");
    expect(serviceJwtSecret({ JWT_SECRET: "b" })).toBe("b");
    expect(serviceJwtSecret({})).toBeUndefined();
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

  const secret = "mw-secret";

  it("always allows the health probe", () => {
    const mw = createServiceAuthMiddleware({ env: { NODE_ENV: "production" } });
    const res = makeRes();
    let called = false;
    mw({ path: "/health", headers: {} }, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it("returns 503 in production when no secret is configured", () => {
    const mw = createServiceAuthMiddleware({ env: { NODE_ENV: "production" } });
    const res = makeRes();
    mw({ path: "/api/x", headers: {} }, res, () => {});
    expect(res.statusCode).toBe(503);
  });

  it("allows unauthenticated access in non-production when unconfigured", () => {
    const mw = createServiceAuthMiddleware({ env: { NODE_ENV: "development" } });
    const res = makeRes();
    let called = false;
    mw({ path: "/api/x", headers: {} }, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it("rejects missing or invalid tokens once a secret is set", () => {
    const mw = createServiceAuthMiddleware({ env: { NODE_ENV: "production", JWT_SECRET: secret } });
    const missing = makeRes();
    mw({ path: "/api/x", headers: {} }, missing, () => {});
    expect(missing.statusCode).toBe(401);

    const bad = makeRes();
    mw({ path: "/api/x", headers: { authorization: "Bearer not-a-token" } }, bad, () => {});
    expect(bad.statusCode).toBe(401);
  });

  it("accepts a valid token and attaches claims to req.auth", () => {
    const mw = createServiceAuthMiddleware({ env: { NODE_ENV: "production", JWT_SECRET: secret } });
    const token = signServiceToken({ tenantId: "tenant-42" }, secret, 60);
    const res = makeRes();
    const req: AuthRequestLike = {
      path: "/api/x",
      headers: { authorization: `Bearer ${token}` },
    };
    let called = false;
    mw(req, res, () => { called = true; });
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

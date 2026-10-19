import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "crypto";
import { getSecret, createSession, verifyToken } from "../src/lib/auth";
import type { AuthUser } from "../src/types";

const user: AuthUser = {
  id: "u_1",
  email: "demo@keekii.net",
  name: "Demo User",
  role: "owner",
  tenantId: "t_1",
  tenantName: "Demo Co",
  plan: "pro",
  avatarInitials: "DU",
};

function b64(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function signRaw(payload: Record<string, unknown>, secret: string): string {
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest().toString("base64url");
  return `${header}.${body}.${sig}`;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("jwt sessions", () => {
  it("round-trips a session created in development", () => {
    const token = createSession(user);
    const payload = verifyToken(token);
    expect(payload).toMatchObject({
      sub: "u_1",
      email: "demo@keekii.net",
      tenantId: "t_1",
    });
  });

  it("rejects a tampered payload", () => {
    const token = createSession(user);
    const [header, , sig] = token.split(".");
    const forged = b64(JSON.stringify({ sub: "attacker", email: "x@y.z", tenantId: "t_1", exp: Math.floor(Date.now() / 1000) + 3600 }));
    expect(verifyToken(`${header}.${forged}.${sig}`)).toBeNull();
  });

  it("rejects an alg:none header", () => {
    const header = b64(JSON.stringify({ alg: "none", typ: "JWT" }));
    const body = b64(JSON.stringify({ sub: "u_1", email: "a@b.c", tenantId: "t_1", exp: Math.floor(Date.now() / 1000) + 3600 }));
    expect(verifyToken(`${header}.${body}.`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signRaw(
      { sub: "u_1", email: "a@b.c", tenantId: "t_1", exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_SECRET as string
    );
    expect(verifyToken(token)).toBeNull();
  });
});

describe("jwt secret validation", () => {
  it("requires JWT_SECRET in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "");
    expect(() => getSecret()).toThrow(/JWT_SECRET environment variable is required/);
  });

  it("rejects a weak JWT_SECRET in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "too-short");
    expect(() => getSecret()).toThrow(/at least 32 characters/);
  });

  it("accepts a strong JWT_SECRET in production and never uses the dev fallback", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "a".repeat(48));
    expect(getSecret()).toBe("a".repeat(48));
  });

  it("falls back to the dev secret only outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("JWT_SECRET", "");
    expect(getSecret()).toContain("kiki-dev-secret");
  });
});

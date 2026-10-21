import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyAdServiceRequest } from "@/lib/ad-server";

// ============================================================
// Ad service auth must fail closed in production.
// ============================================================

function req(auth?: string): Request {
  const headers = new Headers();
  if (auth) headers.set("authorization", auth);
  return new Request("https://keekii.net/api/ads/request", { method: "POST", headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyAdServiceRequest — no secret configured", () => {
  it("rejects in production (fail closed)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SERVICE_JWT_SECRET", "");
    vi.stubEnv("JWT_SECRET", "");
    const result = await verifyAdServiceRequest(req());
    expect(result.ok).toBe(false);
    expect(result.required).toBe(true);
  });

  it("allows in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SERVICE_JWT_SECRET", "");
    vi.stubEnv("JWT_SECRET", "");
    const result = await verifyAdServiceRequest(req());
    expect(result.ok).toBe(true);
    expect(result.required).toBe(false);
  });

  it("allows in test", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SERVICE_JWT_SECRET", "");
    vi.stubEnv("JWT_SECRET", "");
    const result = await verifyAdServiceRequest(req());
    expect(result.ok).toBe(true);
    expect(result.required).toBe(false);
  });
});

describe("verifyAdServiceRequest — secret configured", () => {
  it("rejects a request with no bearer token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SERVICE_JWT_SECRET", "a-secret-at-least-32-characters-long!!");
    const result = await verifyAdServiceRequest(req());
    expect(result.ok).toBe(false);
    expect(result.required).toBe(true);
  });
});

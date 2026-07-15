import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MetaConnector } from "@/lib/connectors/meta";
import {
  encryptToken,
  decryptToken,
  buildQueryString,
  normalizeEmail,
  normalizePhone,
} from "@/lib/connectors/base";

function mockFetch(
  body: unknown,
  opts: { ok?: boolean; status?: number } = {}
): typeof fetch {
  return vi.fn(async () => ({
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers: { get: () => null },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  })) as unknown as typeof fetch;
}

describe("Meta Connector — webhook signature", () => {
  const connector = new MetaConnector();
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({ entry: [{ id: "1" }] });

  it("verifies a correct signature", () => {
    const crypto = require("crypto");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const signature = `sha256=${expected}`;
    expect(connector.verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it("rejects a wrong signature", () => {
    const bad = `sha256=${"0".repeat(64)}`;
    expect(connector.verifyWebhookSignature(payload, bad, secret)).toBe(false);
  });
});

describe("Meta Connector — token validation (mocked fetch)", () => {
  const connector = new MetaConnector();

  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => vi.restoreAllMocks());

  it("returns true when /me resolves", async () => {
    vi.stubGlobal("fetch", mockFetch({ id: "12345678" }));
    const result = await connector.validateToken("fake-token");
    expect(result).toBe(true);
  });

  it("returns false on 401", async () => {
    vi.stubGlobal("fetch", mockFetch("Unauthorized", { ok: false, status: 401 }));
    const result = await connector.validateToken("bad-token");
    expect(result).toBe(false);
  });
});

describe("Meta Connector — campaign parsing (mocked fetch)", () => {
  const connector = new MetaConnector();

  afterEach(() => vi.unstubAllGlobals());

  it("maps ACTIVE status and converts daily_budget cents to dollars", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        data: [
          {
            id: "2384",
            name: "Summer Sale",
            status: "ACTIVE",
            objective: "CONVERSIONS",
            daily_budget: "10000",
            created_time: "2026-01-01T00:00:00Z",
            updated_time: "2026-01-02T00:00:00Z",
          },
        ],
      })
    );

    const res = await connector.listCampaigns("tok", "act_123");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0].status).toBe("active");
    expect(res.data?.[0].dailyBudget).toBe(100);
    expect(res.data?.[0].platformId).toBe("meta");
  });

  it("returns success:false when the API errors", async () => {
    vi.stubGlobal("fetch", mockFetch("boom", { ok: false, status: 500 }));
    const res = await connector.listCampaigns("tok", "act_123");
    expect(res.success).toBe(false);
  });
});

describe("Token encryption round-trip", () => {
  it("encrypts and decrypts back to the original", () => {
    const token = "ya29.example-access-token";
    const encrypted = encryptToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted)).toBe(token);
  });
});

describe("Shared connector helpers", () => {
  it("buildQueryString omits undefined values", () => {
    expect(buildQueryString({ a: 1, b: undefined, c: "x" })).toBe("?a=1&c=x");
    expect(buildQueryString({ a: undefined })).toBe("");
  });

  it("normalizeEmail lowercases and trims", () => {
    expect(normalizeEmail("  Alex@Acme.COM ")).toBe("alex@acme.com");
  });

  it("normalizePhone strips non-digits except +", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("+15551234567");
  });
});

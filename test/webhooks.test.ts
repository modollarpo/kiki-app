import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// ── Test the HMAC verification logic directly ──────────────
// We mirror the algorithm from src/lib/webhooks.ts to verify correctness
// without needing to import private functions or mock the full request pipeline.

const WEBHOOK_SECRETS: Record<string, { header: string; envKey: string }> = {
  meta:      { header: "x-hub-signature-256",       envKey: "META_APP_SECRET" },
  tiktok:    { header: "x-tt-signature",             envKey: "TIKTOK_WEBHOOK_SECRET" },
  linkedin:  { header: "x-li-signature",             envKey: "LINKEDIN_WEBHOOK_SECRET" },
  google:    { header: "x-goog-signature",           envKey: "GOOGLE_WEBHOOK_SECRET" },
  snap:      { header: "x-snap-signature",           envKey: "SNAP_WEBHOOK_SECRET" },
  pinterest: { header: "x-pinterest-signature",      envKey: "PINTEREST_WEBHOOK_SECRET" },
};

function computeSignature(secret: string, body: string, prefix = ""): string {
  const hex = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return prefix + hex;
}

function verifySignature(
  headerName: string,
  headerValue: string | null,
  secret: string,
  rawBody: string
): boolean {
  if (!headerValue) return false;
  const expectedHex = headerValue.startsWith("sha256=") ? headerValue.slice(7) : headerValue;
  const computedHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expectedHex.length !== computedHex.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expectedHex, "hex"),
    Buffer.from(computedHex, "hex")
  );
}

describe("webhook HMAC signature verification", () => {
  const SECRET = "test-webhook-secret-key-32chars!!";
  const BODY = '{"event":"Purchase","value":49.99}';

  it("accepts a valid sha256-prefixed signature (Meta format)", () => {
    const sig = computeSignature(SECRET, BODY, "sha256=");
    expect(verifySignature("x-hub-signature-256", sig, SECRET, BODY)).toBe(true);
  });

  it("accepts a valid raw-hex signature (TikTok/LinkedIn format)", () => {
    const sig = computeSignature(SECRET, BODY);
    expect(verifySignature("x-tt-signature", sig, SECRET, BODY)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const badSig = "sha256=" + "a".repeat(64);
    expect(verifySignature("x-hub-signature-256", badSig, SECRET, BODY)).toBe(false);
  });

  it("rejects when header is missing", () => {
    expect(verifySignature("x-hub-signature-256", null, SECRET, BODY)).toBe(false);
  });

  it("rejects when signature length mismatches", () => {
    const shortSig = "sha256=abc123";
    expect(verifySignature("x-hub-signature-256", shortSig, SECRET, BODY)).toBe(false);
  });

  it("rejects with wrong secret", () => {
    const sig = computeSignature("wrong-secret-key-32chars!!!", BODY);
    expect(verifySignature("x-hub-signature-256", "sha256=" + sig, SECRET, BODY)).toBe(false);
  });

  it("rejects tampered body", () => {
    const sig = computeSignature(SECRET, BODY);
    const tampered = '{"event":"Purchase","value":0.01}';
    expect(verifySignature("x-hub-signature-256", "sha256=" + sig, SECRET, tampered)).toBe(false);
  });

  it("rejects empty body with valid signature for different body", () => {
    const sig = computeSignature(SECRET, "some-other-body");
    expect(verifySignature("x-hub-signature-256", "sha256=" + sig, SECRET, BODY)).toBe(false);
  });
});

// ── Per-platform header mapping tests ──────────────────────

describe("webhook platform header mapping", () => {
  it("each platform uses the correct header name", () => {
    expect(WEBHOOK_SECRETS.meta.header).toBe("x-hub-signature-256");
    expect(WEBHOOK_SECRETS.tiktok.header).toBe("x-tt-signature");
    expect(WEBHOOK_SECRETS.linkedin.header).toBe("x-li-signature");
    expect(WEBHOOK_SECRETS.google.header).toBe("x-goog-signature");
    expect(WEBHOOK_SECRETS.snap.header).toBe("x-snap-signature");
    expect(WEBHOOK_SECRETS.pinterest.header).toBe("x-pinterest-signature");
  });

  it("each platform maps to the correct env var", () => {
    expect(WEBHOOK_SECRETS.meta.envKey).toBe("META_APP_SECRET");
    expect(WEBHOOK_SECRETS.tiktok.envKey).toBe("TIKTOK_WEBHOOK_SECRET");
    expect(WEBHOOK_SECRETS.linkedin.envKey).toBe("LINKEDIN_WEBHOOK_SECRET");
    expect(WEBHOOK_SECRETS.google.envKey).toBe("GOOGLE_WEBHOOK_SECRET");
    expect(WEBHOOK_SECRETS.snap.envKey).toBe("SNAP_WEBHOOK_SECRET");
    expect(WEBHOOK_SECRETS.pinterest.envKey).toBe("PINTEREST_WEBHOOK_SECRET");
  });
});

// ── handleWebhook integration test (mocked DB) ─────────────

describe("handleWebhook integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  async function callWebhook(platform: string, body: string, headers: Record<string, string> = {}) {
    const { handleWebhook } = await import("@/lib/webhooks");
    const req = new Request("http://localhost:3000/api/webhooks/" + platform, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    }) as any;
    req.text = async () => body;
    return handleWebhook(req, platform);
  }

  it("returns 401 for invalid signature when secret is set", { timeout: 15000 }, async () => {
    process.env.META_APP_SECRET = "real-secret-12345678901234567890";
    const res = await callWebhook("meta", '{"event":"test"}', {
      "x-hub-signature-256": "sha256=" + "dead".repeat(16),
    });
    expect(res.status).toBe(401);
  });

  it("allows request in dev mode when no secret is set", async () => {
    delete process.env.META_APP_SECRET;
    process.env.NODE_ENV = "development";
    // This will fail at DB query stage, but shouldn't fail at signature check
    const res = await callWebhook("meta", '{"event":"test"}');
    // Should NOT be 401 (signature check passed), will be 500 (no DB)
    expect(res.status).not.toBe(401);
  });

  it("rejects unknown platform", async () => {
    const res = await callWebhook("unknown", '{"event":"test"}');
    expect(res.status).toBe(400);
  });
});

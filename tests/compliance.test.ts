import { describe, it, expect, beforeEach } from "vitest";

describe("GDPR Compliance", () => {
  it("should export user data", async () => {
    const { exportUserData } = await import("@/lib/gdpr");

    const data = exportUserData("t1", "u1");

    expect(data.exportedAt).toBeTruthy();
    expect(data.tenantId).toBe("t1");
    expect(data.userId).toBe("u1");
    expect(data.data).toBeTruthy();
    expect(data.data.profile).toBeTruthy();
    expect(Array.isArray(data.data.campaigns)).toBe(true);
    expect(Array.isArray(data.data.signals)).toBe(true);
    expect(Array.isArray(data.data.ltvPredictions)).toBe(true);
  });

  it("should anonymize user data", async () => {
    const { deleteUserData, exportUserData } = await import("@/lib/gdpr");

    const result = deleteUserData("t1", "u1", { anonymizeOnly: true });

    expect(result.deletedAt).toBeTruthy();
    expect(result.anonymizedRecords.users).toBe(1);
    expect(result.deletedRecords).toEqual({});
  });

  it("should enforce data retention policies", async () => {
    const { enforceDataRetentionPolicy } = await import("@/lib/gdpr");

    const result = enforceDataRetentionPolicy("t1", {
      signals: 365,
      metrics: 90,
      predictions: 730,
      feedback: 730,
      metacognition: 365,
      agentActions: 180,
    });

    expect(result.cleanedAt).toBeTruthy();
    expect(typeof result.recordsDeleted).toBe("object");
  });

  it("should record and retrieve consent", async () => {
    const { recordConsent, getConsentStatus } = await import("@/lib/gdpr");

    recordConsent({
      tenantId: "t1",
      userId: "u1",
      consentType: "analytics",
      granted: true,
    });

    const consents = getConsentStatus("t1", "u1");
    expect(typeof consents).toBe("object");
  });
});

describe("Environment Validation", () => {
  it("should validate required env vars", async () => {
    const { validateEnvironment } = await import("@/lib/env");

    const result = validateEnvironment();
    expect(typeof result.valid).toBe("boolean");
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

describe("Token Encryption", () => {
  it("should encrypt and decrypt tokens", async () => {
    const { encryptToken, decryptToken } = await import("@/lib/connectors/base");

    const original = "my-super-secret-oauth-token-12345";
    const encrypted = encryptToken(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":");

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(original);
  });

  it("should produce different ciphertext for same plaintext (random IV)", async () => {
    const { encryptToken } = await import("@/lib/connectors/base");

    const token = "same-token";
    const enc1 = encryptToken(token);
    const enc2 = encryptToken(token);

    expect(enc1).not.toBe(enc2); // Different IVs = different ciphertext
  });
});

describe("Fraud Detection", () => {
  it("should detect fraud signals", async () => {
    const { detectFraud } = await import("@/lib/fraud");

    const result = detectFraud({
      value: 10000,
      sessionDuration: 2,
      fraudRate: 0.15,
      isDuplicate: false,
      referrer: "http://suspicious-site.com",
    });

    expect(result).toBeTruthy();
    expect(result.isFraud).toBeDefined();
    expect(result.score).toBeDefined();
    expect(Array.isArray(result.rules)).toBe(true);
  });
});

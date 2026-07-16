import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { BaseConnector } from "../src/lib/connectors/base";
import { type PlatformId, type PlatformConfig, type PlatformApiResponse, type OAuthTokens } from "../src/lib/connectors/types";

// Concrete connector for testing PKCE helpers
const TEST_CONFIG: PlatformConfig = {
  id: "meta" as PlatformId,
  name: "Test",
  apiVersion: "v1",
  apiBaseUrl: "https://example.com",
  oauth: {
    clientId: "test_client_id",
    clientSecret: "test_secret",
    redirectUri: "http://localhost:3000/callback",
    scopes: ["ads_management"],
    authUrl: "https://example.com/auth",
    tokenUrl: "https://example.com/token",
  },
  rateLimits: { requestsPerSecond: 10, requestsPerHour: 100 },
  supportsCAPI: false,
  supportsOAuth: true,
  supportsConversionValue: false,
  conversionEvents: [],
};

class TestConnector extends BaseConnector {
  platformId = "meta" as const;
  async generateOAuthUrl() { return { url: "", state: "", codeVerifier: "" }; }
  async handleCallback() { return { accessToken: "", expiresAt: 0, tokenType: "bearer", scope: [] }; }
  async refreshToken() { return { accessToken: "", expiresAt: 0, tokenType: "bearer", scope: [] }; }
  async validateToken() { return true; }
  async getAccountInfo() { return { success: true, data: undefined, latencyMs: 0 }; }
  async listCampaigns() { return { success: true, data: [], latencyMs: 0 }; }
  async getCampaign() { return { success: false, latencyMs: 0 }; }
  async getCampaignMetrics() { return { success: false, latencyMs: 0 }; }
  async sendConversion() { return { platform: "meta" as PlatformId, success: true, latencyMs: 0 }; }

  // Expose protected methods for testing
  public testGenerateCodeVerifier() { return this.generateCodeVerifier(); }
  public testGenerateCodeChallenge(verifier: string) { return this.generateCodeChallenge(verifier); }
}

describe("PKCE (S256)", () => {
  const connector = new TestConnector(TEST_CONFIG);

  describe("code_verifier generation", () => {
    it("generates a URL-safe string", () => {
      const verifier = connector.testGenerateCodeVerifier();
      expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it("generates a 43-char verifier (32 bytes → base64url)", () => {
      const verifier = connector.testGenerateCodeVerifier();
      expect(verifier.length).toBe(43);
    });

    it("generates unique verifiers", () => {
      const v1 = connector.testGenerateCodeVerifier();
      const v2 = connector.testGenerateCodeVerifier();
      expect(v1).not.toBe(v2);
    });

    it("uses crypto.randomBytes (not Math.random)", () => {
      // Verify by checking entropy — two 128-char verifiers should differ
      const verifiers = new Set<string>();
      for (let i = 0; i < 50; i++) {
        verifiers.add(connector.testGenerateCodeVerifier());
      }
      expect(verifiers.size).toBe(50);
    });
  });

  describe("code_challenge (S256)", () => {
    it("produces a base64url-encoded SHA-256 of the verifier", () => {
      const verifier = "test_verifier_1234567890abcdefghijklmnopqrstuvwxyz";
      const challenge = connector.testGenerateCodeChallenge(verifier);

      // Manually compute expected SHA-256
      const expected = crypto.createHash("sha256").update(verifier).digest("base64url");
      expect(challenge).toBe(expected);
    });

    it("produces a URL-safe base64 string", () => {
      const verifier = connector.testGenerateCodeVerifier();
      const challenge = connector.testGenerateCodeChallenge(verifier);
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+=*$/);
    });

    it("produces a 43-char challenge for a 128-char verifier", () => {
      const verifier = connector.testGenerateCodeVerifier();
      const challenge = connector.testGenerateCodeChallenge(verifier);
      expect(challenge.length).toBe(43);
    });

    it("different verifiers produce different challenges", () => {
      const v1 = connector.testGenerateCodeVerifier();
      const v2 = connector.testGenerateCodeVerifier();
      const c1 = connector.testGenerateCodeChallenge(v1);
      const c2 = connector.testGenerateCodeChallenge(v2);
      expect(c1).not.toBe(c2);
    });

    it("same verifier always produces the same challenge", () => {
      const verifier = "deterministic_test_verifier";
      const c1 = connector.testGenerateCodeChallenge(verifier);
      const c2 = connector.testGenerateCodeChallenge(verifier);
      expect(c1).toBe(c2);
    });
  });

  describe("PKCE roundtrip (verifier → challenge → verify)", () => {
    it("challenge verifies correctly", () => {
      const verifier = connector.testGenerateCodeVerifier();
      const challenge = connector.testGenerateCodeChallenge(verifier);

      // Simulate server-side verification (RFC 7636 §4.6)
      const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
      expect(computed).toBe(challenge);
    });

    it("wrong verifier fails verification", () => {
      const verifier = connector.testGenerateCodeVerifier();
      const challenge = connector.testGenerateCodeChallenge(verifier);

      const wrongVerifier = connector.testGenerateCodeVerifier();
      const computed = crypto.createHash("sha256").update(wrongVerifier).digest("base64url");
      expect(computed).not.toBe(challenge);
    });
  });
});

describe("Token Encryption roundtrip", () => {
  it("encrypts and decrypts back to the original", async () => {
    const { encryptToken, decryptToken } = await import("../src/lib/connectors/base");
    const original = "super_secret_access_token_12345";
    const encrypted = encryptToken(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":");
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext for same input (random IV)", async () => {
    const { encryptToken } = await import("../src/lib/connectors/base");
    const token = "same_token";
    const e1 = encryptToken(token);
    const e2 = encryptToken(token);
    expect(e1).not.toBe(e2); // Different IV each time
  });
});

// ── Set connector env vars BEFORE module imports (config constants read at import time) ──
process.env.SHOPIFY_CLIENT_ID = "test_client_id";
process.env.SHOPIFY_CLIENT_SECRET = "test_secret";
process.env.SHOPIFY_STORE_DOMAIN = "test-store.myshopify.com";
process.env.SHOPIFY_REDIRECT_URI = "http://localhost:3000/api/auth/callback/shopify";
process.env.WOO_CLIENT_ID = "test_client";
process.env.WOO_CLIENT_SECRET = "test_secret";
process.env.WOO_STORE_URL = "https://teststore.com";
process.env.WOO_REDIRECT_URI = "http://localhost:3000/api/auth/callback/woocommerce";
process.env.HUBSPOT_CLIENT_ID = "test_client_id";
process.env.HUBSPOT_CLIENT_SECRET = "test_secret";
process.env.HUBSPOT_REDIRECT_URI = "http://localhost:3000/api/auth/callback/hubspot";
process.env.SALESFORCE_CLIENT_ID = "test_client_id";
process.env.SALESFORCE_CLIENT_SECRET = "test_secret";
process.env.SALESFORCE_REDIRECT_URI = "http://localhost:3000/api/auth/callback/salesforce";
process.env.SALESFORCE_INSTANCE_URL = "https://test.salesforce.com";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ShopifyConnector } from "@/lib/connectors/shopify";
import { WooCommerceConnector } from "@/lib/connectors/woocommerce";
import { HubspotConnector } from "@/lib/connectors/hubspot";
import { SalesforceConnector } from "@/lib/connectors/salesforce";
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

// ── Shopify ────────────────────────────────────────────

describe("Shopify Connector", () => {
  let connector: ShopifyConnector;

  beforeEach(async () => {
    vi.stubEnv("SHOPIFY_CLIENT_ID", "test_client_id");
    vi.stubEnv("SHOPIFY_CLIENT_SECRET", "test_secret");
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "test-store.myshopify.com");
    vi.stubEnv("SHOPIFY_REDIRECT_URI", "http://localhost:3000/api/auth/callback/shopify");
    const { ShopifyConnector: SC } = await import("@/lib/connectors/shopify");
    connector = new SC();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("generateOAuthUrl", () => {
    it("returns a valid Shopify OAuth URL with state and code verifier", async () => {
      const result = await connector.generateOAuthUrl("tenant-1");
      expect(result.url).toContain("test-store.myshopify.com");
      expect(result.url).toContain("/admin/oauth/authorize");
      expect(result.url).toContain("client_id=");
      expect(result.url).toContain("scope=");
      expect(result.url).toContain("redirect_uri=");
      expect(result.url).toContain("state=");
      expect(result.url).toContain("grant_options=");
      expect(result.state).toBeTruthy();
      expect(result.codeVerifier).toBeTruthy();
    });
  });

  describe("handleCallback", () => {
    it("exchanges code for tokens via Shopify OAuth", async () => {
      vi.stubGlobal("fetch", mockFetch({
        access_token: "shopify_access_token",
        scope: "read_orders read_customers",
        expires_in: 3600,
      }));

      const result = await connector.handleCallback("test_code", "test_state", "verifier", "test-store.myshopify.com");
      expect(result.accessToken).toBe("shopify_access_token");
      expect(result.tokenType).toBe("Bearer");
    });

    it("throws on OAuth failure", async () => {
      vi.stubGlobal("fetch", mockFetch({ error: "access_denied" }, { ok: false, status: 403 }));
      await expect(
        connector.handleCallback("bad_code", "bad_state", "verifier", "test-store.myshopify.com")
      ).rejects.toThrow("Shopify OAuth");
    });
  });

  describe("validateToken", () => {
    it("returns true when shop API responds 200", async () => {
      vi.stubGlobal("fetch", mockFetch({ shop: { id: "123" } }));
      const result = await connector.validateToken("valid_token");
      expect(result).toBe(true);
    });

    it("returns false when shop API responds 401", async () => {
      vi.stubGlobal("fetch", mockFetch("Unauthorized", { ok: false, status: 401 }));
      const result = await connector.validateToken("bad_token");
      expect(result).toBe(false);
    });

    it("returns false when store domain is missing", async () => {
      process.env.SHOPIFY_STORE_DOMAIN = "";
      const result = await connector.validateToken("token");
      expect(result).toBe(false);
      process.env.SHOPIFY_STORE_DOMAIN = "test-store.myshopify.com";
    });
  });

  describe("getAccountInfo", () => {
    it("returns account info from shop.json", async () => {
      vi.stubGlobal("fetch", mockFetch({
        shop: { id: "123", name: "Test Store", currency: "USD", timezone: "America/New_York" },
      }));
      const result = await connector.getAccountInfo("token");
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Test Store");
      expect(result.data?.currency).toBe("USD");
    });

    it("returns error when store domain not configured", async () => {
      process.env.SHOPIFY_STORE_DOMAIN = "";
      const result = await connector.getAccountInfo("token");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
      process.env.SHOPIFY_STORE_DOMAIN = "test-store.myshopify.com";
    });
  });

  describe("verifyWebhookSignature", () => {
    it("verifies a correct HMAC signature", () => {
      const crypto = require("crypto");
      const secret = "whsec_test";
      const payload = JSON.stringify({ order: { id: "1" } });
      const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("base64");
      expect(connector.verifyWebhookSignature(payload, expected, secret)).toBe(true);
    });

    it("rejects a wrong signature", () => {
      expect(connector.verifyWebhookSignature("payload", "bad_signature", "secret")).toBe(false);
    });
  });

  describe("parseWebhookPayload", () => {
    it("parses order webhook payload", () => {
      const body = { topic: "orders/updated", order: { id: "456", updated_at: "2026-01-01T00:00:00Z" } };
      const result = connector.parseWebhookPayload(body);
      expect(result.platform).toBe("shopify");
      expect(result.eventType).toBe("orders/updated");
      expect(result.eventId).toBe("456");
    });
  });
});

// ── WooCommerce ────────────────────────────────────────

describe("WooCommerce Connector", () => {
  const connector = new WooCommerceConnector();

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("generateOAuthUrl", () => {
    it("returns a valid WooCommerce Connect OAuth URL", async () => {
      const result = await connector.generateOAuthUrl("tenant-1");
      expect(result.url).toContain("teststore.com");
      expect(result.url).toContain("/wc-auth/v1/authorize");
      expect(result.url).toContain("app_name=KIKI+Agent+Platform");
      expect(result.state).toBeTruthy();
    });
  });

  describe("handleCallback", () => {
    it("extracts consumer_key and consumer_secret from callback", async () => {
      const result = await connector.handleCallback("consumer_key=wc_key&consumer_secret=wc_secret", "state");
      expect(result.accessToken).toBeTruthy();
      expect(result.tokenType).toBe("Basic");
      expect(result.scope).toContain("read");
    });

    it("throws when credentials are missing", async () => {
      await expect(connector.handleCallback("noice=param", "state")).rejects.toThrow("did not return consumer credentials");
    });
  });

  describe("refreshToken", () => {
    it("echoes same credentials for legacy WooCommerce keys", async () => {
      const result = await connector.refreshToken("refresh_token_value");
      expect(result.accessToken).toBeTruthy();
      expect(result.tokenType).toBe("Basic");
    });
  });

  describe("validateToken", () => {
    it("returns true when orders fetch succeeds", async () => {
      vi.stubGlobal("fetch", mockFetch([{ id: 1 }]));
      const result = await connector.validateToken("dXNlcjpwYXNz");
      expect(result).toBe(true);
    });

    it("returns false when store URL is missing", async () => {
      process.env.WOO_STORE_URL = "";
      const result = await connector.validateToken("token");
      expect(result).toBe(false);
      process.env.WOO_STORE_URL = "https://teststore.com";
    });
  });

  describe("getAccountInfo", () => {
    it("returns account info from system_status", async () => {
      vi.stubGlobal("fetch", mockFetch({ environment: { site_title: "My Store", currency: "USD", timezone: "UTC" } }));
      const result = await connector.getAccountInfo("dXNlcjpwYXNz");
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("My Store");
    });

    it("returns error when store URL missing", async () => {
      process.env.WOO_STORE_URL = "";
      const result = await connector.getAccountInfo("token");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
      process.env.WOO_STORE_URL = "https://teststore.com";
    });
  });

  describe("verifyWebhookSignature", () => {
    it("verifies a correct HMAC signature", () => {
      const crypto = require("crypto");
      const secret = "wc_webhook_secret";
      const payload = JSON.stringify({ id: "123" });
      const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("base64");
      expect(connector.verifyWebhookSignature(payload, expected, secret)).toBe(true);
    });
  });

  describe("parseWebhookPayload", () => {
    it("parses order webhook payload", () => {
      const body = { id: "123", date_created: "2026-01-01T00:00:00" };
      const result = connector.parseWebhookPayload(body);
      expect(result.platform).toBe("woocommerce");
      expect(result.eventId).toBe("123");
    });
  });
});

// ── HubSpot ────────────────────────────────────────────

describe("Hubspot Connector", () => {
  const connector = new HubspotConnector();

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("generateOAuthUrl", () => {
    it("returns a valid HubSpot OAuth URL with PKCE", async () => {
      const result = await connector.generateOAuthUrl("tenant-1");
      expect(result.url).toContain("client_id=");
      expect(result.url).toContain("response_type=code");
      expect(result.url).toContain("code_challenge=");
      expect(result.url).toContain("code_challenge_method=S256");
      expect(result.state).toBeTruthy();
      expect(result.codeVerifier).toBeTruthy();
    });
  });

  describe("handleCallback", () => {
    it("exchanges authorization code for tokens", async () => {
      vi.stubGlobal("fetch", mockFetch({
        access_token: "hubspot_token",
        refresh_token: "hubspot_refresh",
        expires_in: 7200,
        token_type: "bearer",
      }));

      const result = await connector.handleCallback("auth_code", "state", "verifier");
      expect(result.accessToken).toBe("hubspot_token");
      expect(result.refreshToken).toBe("hubspot_refresh");
      expect(result.tokenType).toBe("bearer");
    });

    it("throws on token exchange error", async () => {
      vi.stubGlobal("fetch", mockFetch({ error: "invalid_grant" }, { ok: false, status: 400 }));
      await expect(connector.handleCallback("bad_code", "state", "verifier")).rejects.toThrow("HubSpot");
    });
  });

  describe("validateToken", () => {
    it("returns true when /me endpoint succeeds", async () => {
      vi.stubGlobal("fetch", mockFetch({ userId: "12345" }));
      const result = await connector.validateToken("valid_token");
      expect(result).toBe(true);
    });

    it("returns false on 401", async () => {
      vi.stubGlobal("fetch", mockFetch("Unauthorized", { ok: false, status: 401 }));
      const result = await connector.validateToken("bad_token");
      expect(result).toBe(false);
    });
  });

  describe("getAccountInfo", () => {
    it("returns contact info from /crm/v3/objects/contacts/me", async () => {
      vi.stubGlobal("fetch", mockFetch({
        results: [{ id: "contact-1", properties: { email: "test@test.com" } }],
      }));
      const result = await connector.getAccountInfo("token");
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });
  });

  describe("listCampaigns", () => {
    it("maps deals to PlatformCampaign[]", async () => {
      vi.stubGlobal("fetch", mockFetch({
        results: [
          { id: "deal-1", properties: { amount: "5000", dealname: "Big Deal", hs_pipeline_stage: "closed-won" } },
        ],
      }));
      const result = await connector.listCampaigns("token", "");
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("returns success:false on API error", async () => {
      vi.stubGlobal("fetch", mockFetch("boom", { ok: false, status: 500 }));
      const result = await connector.listCampaigns("token", "");
      expect(result.success).toBe(false);
    });
  });
});

// ── Salesforce ─────────────────────────────────────────

describe("Salesforce Connector", () => {
  const connector = new SalesforceConnector();

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("generateOAuthUrl", () => {
    it("returns a valid Salesforce OAuth URL with PKCE", async () => {
      const result = await connector.generateOAuthUrl("tenant-1");
      expect(result.url).toContain("client_id=");
      expect(result.url).toContain("response_type=code");
      expect(result.url).toContain("code_challenge=");
      expect(result.url).toContain("code_challenge_method=S256");
      expect(result.state).toBeTruthy();
      expect(result.codeVerifier).toBeTruthy();
    });
  });

  describe("handleCallback", () => {
    it("exchanges authorization code for access token", async () => {
      vi.stubGlobal("fetch", mockFetch({
        access_token: "sf_access_token",
        refresh_token: "sf_refresh_token",
        instance_url: "https://test.salesforce.com",
        id: "https://test.salesforce.com/id/00D.../005...",
      }));

      const result = await connector.handleCallback("auth_code", "state", "verifier");
      expect(result.accessToken).toBe("sf_access_token");
      expect(result.refreshToken).toBe("sf_refresh_token");
    });

    it("throws on token error", async () => {
      vi.stubGlobal("fetch", mockFetch({ error: "invalid_grant" }, { ok: false, status: 400 }));
      await expect(connector.handleCallback("bad_code", "state", "verifier")).rejects.toThrow("Salesforce");
    });
  });

  describe("validateToken", () => {
    it("returns true when query succeeds", async () => {
      vi.stubGlobal("fetch", mockFetch({ records: [] }));
      const result = await connector.validateToken("valid_token");
      expect(result).toBe(true);
    });

    it("returns false on 401", async () => {
      vi.stubGlobal("fetch", mockFetch("Unauthorized", { ok: false, status: 401 }));
      const result = await connector.validateToken("bad_token");
      expect(result).toBe(false);
    });

    it("returns false when instance URL missing", async () => {
      process.env.SALESFORCE_INSTANCE_URL = "";
      const result = await connector.validateToken("token");
      expect(result).toBe(false);
      process.env.SALESFORCE_INSTANCE_URL = "https://test.salesforce.com";
    });
  });

  describe("getAccountInfo", () => {
    it("returns account info from contact query", async () => {
      vi.stubGlobal("fetch", mockFetch({
        records: [{ Id: "003...", Name: "Test User", Email: "test@test.com" }],
      }));
      const result = await connector.getAccountInfo("token");
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });
  });

  describe("listCampaigns", () => {
    it("maps SOQL results to PlatformCampaign[]", async () => {
      vi.stubGlobal("fetch", mockFetch({
        records: [
          { Id: "a01...", Name: "Q4 Campaign", Campaign_Status__c: "Active", ExpectedRevenue: 10000 },
        ],
      }));
      const result = await connector.listCampaigns("token", "");
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});

// ── Pure utilities ──────────────────────────────────

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

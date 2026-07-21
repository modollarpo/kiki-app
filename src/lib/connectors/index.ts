// ============================================================
// KIKI Agent Platform — Connector Registry
// Central registry for all platform connectors
// ============================================================

import { type PlatformId, type IPlatformConnector, type PlatformConfig } from "./types";
import { metaConnector } from "./meta";
import { googleConnector } from "./google";
import { tiktokConnector } from "./tiktok";
import { linkedinConnector } from "./linkedin";
import { snapConnector } from "./snap";
import { pinterestConnector } from "./pinterest";
import { AmazonConnector } from "./amazon";
import { CtvConnector } from "./ctv";

// ── Connector Registry ─────────────────────────────────────

const connectors: Map<PlatformId, IPlatformConnector> = new Map();

// Register all connectors
connectors.set("meta", metaConnector);
connectors.set("google", googleConnector);
connectors.set("tiktok", tiktokConnector);
connectors.set("linkedin", linkedinConnector);
connectors.set("snap", snapConnector);
connectors.set("pinterest", pinterestConnector);

// CMS & CRM Mocks (UI Stubs)
const createStubConnector = (id: PlatformId, name: string): IPlatformConnector => ({
  platformId: id,
  config: {
    id, name, apiVersion: "1.0", apiBaseUrl: "",
    oauth: { clientId: "", clientSecret: "", redirectUri: "", scopes: [], authUrl: "/dashboard/settings", tokenUrl: "" },
    rateLimits: { requestsPerSecond: 10, requestsPerHour: 1000 },
    supportsCAPI: false, supportsOAuth: true, supportsConversionValue: false, conversionEvents: []
  },
  generateOAuthUrl: async () => ({ url: `/dashboard/settings?stub_connect=${id}`, state: "stub", codeVerifier: "stub" }),
  handleCallback: async () => ({ accessToken: "stub", expiresAt: Date.now() + 86400000, tokenType: "Bearer", scope: [] }),
  refreshToken: async () => ({ accessToken: "stub", expiresAt: Date.now() + 86400000, tokenType: "Bearer", scope: [] }),
  validateToken: async () => true,
  getAccountInfo: async () => ({ success: true, latencyMs: 0, data: { id: "stub", name: `${name} Account`, config: {} } }),
  listCampaigns: async () => ({ success: true, latencyMs: 0, data: [] }),
  getCampaign: async () => ({ success: true, latencyMs: 0 } as any),
  getCampaignMetrics: async () => ({ success: true, latencyMs: 0 } as any),
  sendConversion: async () => ({ platform: id, success: true, latencyMs: 0 })
});

connectors.set("shopify", createStubConnector("shopify", "Shopify"));
connectors.set("woocommerce", createStubConnector("woocommerce", "WooCommerce"));
connectors.set("hubspot", createStubConnector("hubspot", "HubSpot"));
connectors.set("salesforce", createStubConnector("salesforce", "Salesforce"));

// Amazon Ads connector (lazy-initialized from env)
if (process.env.AMAZON_CLIENT_ID) {
  connectors.set("amazon", new AmazonConnector({
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET || "",
    profileId: process.env.AMAZON_PROFILE_ID || "",
  }));
}

// CTV connector (lazy-initialized from env)
if (process.env.CTV_CLIENT_ID) {
  connectors.set("ctv", new CtvConnector({
    provider: (process.env.CTV_PROVIDER as "roku" | "thed-trade-desk") || "roku",
    clientId: process.env.CTV_CLIENT_ID,
    clientSecret: process.env.CTV_CLIENT_SECRET || "",
    partnerId: process.env.CTV_PARTNER_ID || "",
  }));
}

// ── Public API ─────────────────────────────────────────────

export function getConnector(platformId: PlatformId): IPlatformConnector {
  const connector = connectors.get(platformId);
  if (!connector) {
    throw new Error(`No connector registered for platform: ${platformId}`);
  }
  return connector;
}

export function getConnectorConfig(platformId: PlatformId): PlatformConfig {
  return getConnector(platformId).config;
}

export function listConnectors(): Array<{ platformId: PlatformId; name: string; supportsCAPI: boolean; supportsOAuth: boolean }> {
  return Array.from(connectors.values()).map(c => ({
    platformId: c.platformId,
    name: c.config.name,
    supportsCAPI: c.config.supportsCAPI,
    supportsOAuth: c.config.supportsOAuth,
  }));
}

export function getSupportedPlatforms(): PlatformId[] {
  return Array.from(connectors.keys());
}

export function isPlatformSupported(platformId: string): platformId is PlatformId {
  return connectors.has(platformId as PlatformId);
}

// ── Convenience Functions ──────────────────────────────────

export async function sendConversionToAllPlatforms(
  accessToken: string,
  event: import("./types").ConversionEvent,
  platforms?: PlatformId[]
): Promise<import("./types").ConversionDeliveryResult[]> {
  const targetPlatforms = platforms || ["meta", "google", "tiktok", "snap", "pinterest"];
  const results: import("./types").ConversionDeliveryResult[] = [];

  const deliveryPromises = targetPlatforms
    .filter(p => connectors.has(p))
    .map(async (platformId) => {
      const connector = connectors.get(platformId)!;
      try {
        return await connector.sendConversion(accessToken, event);
      } catch (error) {
        return {
          platform: platformId,
          success: false,
          latencyMs: 0,
          error: String(error),
        };
      }
    });

  const settled = await Promise.allSettled(deliveryPromises);
  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(result.value);
    }
  }

  return results;
}

export async function listAllCampaigns(
  accessToken: string,
  accountId: string,
  platforms?: PlatformId[]
): Promise<Record<PlatformId, import("./types").PlatformCampaign[]>> {
  const targetPlatforms = platforms || ["meta", "google", "tiktok"];
  const results: Record<string, import("./types").PlatformCampaign[]> = {};

  const fetchPromises = targetPlatforms
    .filter(p => connectors.has(p))
    .map(async (platformId) => {
      const connector = connectors.get(platformId)!;
      try {
        const result = await connector.listCampaigns(accessToken, accountId);
        if (result.success && result.data) {
          results[platformId] = result.data;
        }
      } catch (error) {
        console.error(`Failed to fetch campaigns from ${platformId}:`, error);
      }
    });

  await Promise.allSettled(fetchPromises);
  return results as Record<PlatformId, import("./types").PlatformCampaign[]>;
}

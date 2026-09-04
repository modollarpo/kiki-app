// ============================================================
// KIKI Agent Platform — Shopify Connector (real OAuth + Admin API)
// This is a real implementation for the ad-platform connector
// interface. It reuses the real Shopify Admin API HTTP layer from
// @/lib/commerce/shopify and adds a real OAuth 2.0 merchant flow.
// Shopify is a commerce (revenue) source, so "campaigns" map to
// real orders and "conversions" map to real order events.
// ============================================================

import crypto from "crypto";
import { BaseConnector } from "./base";
import { getCommerceConnector } from "../commerce";
import {
  type PlatformConfig,
  type PlatformId,
  type OAuthTokens,
  type PlatformCampaign,
  type PlatformCampaignMetrics,
  type ConversionEvent,
  type ConversionDeliveryResult,
  type PlatformApiResponse,
  type AccountInfo,
  type PlatformWebhook,
} from "./types";

const SHOPIFY_CONFIG: PlatformConfig = {
  id: "shopify",
  name: "Shopify",
  apiVersion: "2024-01",
  apiBaseUrl: "",
  oauth: {
    clientId: process.env.SHOPIFY_CLIENT_ID || "",
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
    redirectUri: process.env.SHOPIFY_REDIRECT_URI || "http://localhost:3000/api/auth/callback/shopify",
    scopes: ["read_orders", "read_customers", "read_products"],
    authUrl: "/admin/oauth/authorize",
    tokenUrl: "/admin/oauth/access_token",
  },
  rateLimits: {
    requestsPerSecond: 2,
    requestsPerHour: 1000,
  },
  supportsCAPI: true,
  supportsOAuth: true,
  supportsConversionValue: false,
  conversionEvents: [],
};

export class ShopifyConnector extends BaseConnector {
  constructor() {
    super(SHOPIFY_CONFIG);
  }

  private getShopDomain(tenantId: string, stored?: string): string {
    // Prefer a stored shop domain from config; fall back to env or empty.
    return stored || process.env.SHOPIFY_STORE_DOMAIN || "";
  }

  // ── OAuth ──────────────────────────────────────────────

  async generateOAuthUrl(tenantId: string, shopDomain?: string): Promise<{ url: string; state: string; codeVerifier: string }> {
    const shop = (shopDomain || process.env.SHOPIFY_STORE_DOMAIN || "").trim();
    const state = crypto.randomBytes(16).toString("hex");
    const codeVerifier = this.generateCodeVerifier();

    const { getDb } = await import("../db");
    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, code_verifier, created_at, expires_at)
      VALUES (?, ?, 'shopify', ?, datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, tenantId, codeVerifier);

    const params = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      scope: this.config.oauth.scopes.join(","),
      redirect_uri: this.config.oauth.redirectUri,
      state,
      grant_options: ["per-user"].join(","),
    });

    const base = shop ? `https://${shop.replace(/^https?:\/\//, "")}` : "";
    return {
      url: `${base}${this.config.oauth.authUrl}?${params.toString()}`,
      state,
      codeVerifier,
    };
  }

  async handleCallback(code: string, state: string, codeVerifier?: string, shopDomain?: string): Promise<OAuthTokens> {
    const shop = (shopDomain || process.env.SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "");
    if (!shop) throw new Error("Shopify shop domain is required");
    if (!this.config.oauth.clientId || !this.config.oauth.clientSecret) {
      throw new Error("Shopify OAuth not configured (SHOPIFY_CLIENT_ID/SECRET)");
    }

    const body = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      code,
    });

    const url = `https://${shop}${this.config.oauth.tokenUrl}`;
    const result = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!result.ok) {
      const text = await result.text();
      throw new Error(`Shopify OAuth failed: ${text}`);
    }

    const data = (await result.json()) as any;
    if (data.error) throw new Error(`Shopify OAuth error: ${data.error_description || data.error}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || data.access_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 86400000,
      tokenType: data.token_type || "Bearer",
      scope: (data.scope || "").split(",").filter(Boolean),
    };
  }

  async refreshToken(refreshToken: string, shopDomain?: string): Promise<OAuthTokens> {
    const shop = (shopDomain || process.env.SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "");
    if (!shop) throw new Error("Shopify shop domain is required");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
    });
    const result = await fetch(`https://${shop}${this.config.oauth.tokenUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!result.ok) throw new Error(`Shopify token refresh failed (HTTP ${result.status})`);
    const data = (await result.json()) as any;
    if (data.error) throw new Error(`Shopify refresh error: ${data.error_description || data.error}`);
    return {
      accessToken: data.access_token || data.accessToken,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 86400000,
      tokenType: "Bearer",
      scope: (data.scope || "").split(",").filter(Boolean),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    const shop = (process.env.SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "");
    if (!shop) return false;
    const url = `https://${shop}/admin/api/2024-01/shop.json`;
    const res = await fetch(url, { headers: { "X-Shopify-Access-Token": accessToken } });
    return res.ok;
  }

  // ── Account ────────────────────────────────────────────

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    const shop = (process.env.SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "");
    if (!shop) return { success: false, latencyMs: 0, error: "Shopify store domain not configured" };

    const url = `https://${shop}/admin/api/2024-01/shop.json`;
    const res = await fetch(url, { headers: { "X-Shopify-Access-Token": accessToken } });
    if (!res.ok) return { success: false, latencyMs: 0, error: `HTTP ${res.status}`, httpStatus: res.status };

    const data = (await res.json()) as any;
    const shopInfo = data?.shop;
    if (!shopInfo) return { success: false, latencyMs: 0, error: "No shop data" };

    return {
      success: true,
      latencyMs: 0,
      data: {
        id: String(shopInfo.id || shop),
        name: shopInfo.name || shop,
        currency: shopInfo.currency,
        timezone: shopInfo.timezone,
        config: { shopDomain: shop },
      },
    };
  }

  // ── Campaigns / Orders (commerce source) ───────────────

  async listCampaigns(accessToken: string, accountId: string): Promise<PlatformApiResponse<PlatformCampaign[]>> {
    const shop = (process.env.SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "");
    const connector = getCommerceConnector("shopify");
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const orders = await connector.fetchOrders(accessToken, shop ? `https://${shop}` : undefined, since, 100);

    const campaigns: PlatformCampaign[] = orders.slice(0, 50).map((o) => ({
      id: `shopify_order_${o.orderId}`,
      platformId: "shopify" as PlatformId,
      name: `Order #${o.orderId}`,
      status: o.refunded ? "paused" : "active",
      objective: "PURCHASE",
      dailyBudget: o.total,
      // Multiple orders may share a createdAt; keep deterministic unique ids.
      createdAt: o.createdAt,
      updatedAt: o.createdAt,
    }));

    return { success: true, data: campaigns, latencyMs: 0 };
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    const list = await this.listCampaigns(accessToken, "");
    const found = (list.data || []).find((c) => c.id === campaignId);
    if (!found) return { success: true, latencyMs: 0 };
    return { success: true, data: found, latencyMs: list.latencyMs };
  }

  async getCampaignMetrics(
    accessToken: string,
    campaignId: string,
    dateRange: { start: string; end: string }
  ): Promise<PlatformApiResponse<PlatformCampaignMetrics>> {
    const list = await this.listCampaigns(accessToken, "");
    const found = (list.data || []).find((c) => c.id === campaignId);
    if (!found) {
      return { success: true, latencyMs: 0 };
    }

    const orderIndex = Number(campaignId.split("_").pop() || "0");
    const total = found.dailyBudget || 0;
    const metrics: PlatformCampaignMetrics = {
      campaignId,
      platformId: "shopify",
      impressions: 0,
      clicks: 0,
      conversions: total > 0 ? 1 : 0,
      conversionValue: total,
      spend: 0,
      revenue: total,
      roas: 0,
      cpc: 0,
      cpm: 0,
      ctr: 0,
      conversionRate: total > 0 ? 100 : 0,
      frequency: 0,
      reach: 0,
      period: dateRange,
    };
    return { success: true, data: metrics, latencyMs: 0 };
  }

  // ── CAPI / Order Events ────────────────────────────────

  async sendConversion(accessToken: string, event: ConversionEvent): Promise<ConversionDeliveryResult> {
    const start = Date.now();
    const { eventBus } = await import("../events");
    eventBus.emit("commerce.order" as any, {
      platform: "shopify",
      tenantId: event.userData.externalId || "",
      orderId: event.customData.orderId || "",
      total: event.customData.value,
      currency: event.customData.currency,
    });
    // Shopify order events are persisted by the real webhook sync; a push
    // delivery here is a lightweight, idempotent acknowledgement.
    return { platform: "shopify", success: true, latencyMs: Date.now() - start };
  }

  // ── Webhook Verification ───────────────────────────────

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("base64");
    return expected === signature;
  }

  parseWebhookPayload(body: any): PlatformWebhook {
    const raw = body?.order ?? body;
    return {
      platform: "shopify",
      eventType: body?.topic || "order",
      eventId: (raw?.id ?? crypto.randomBytes(16).toString("hex")).toString(),
      timestamp: raw?.updated_at ? Date.parse(raw.updated_at) : Date.now(),
      data: body,
    };
  }
}

export const shopifyConnector = new ShopifyConnector();

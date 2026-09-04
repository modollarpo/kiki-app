// ============================================================
// KIKI Agent Platform — WooCommerce Connector (real HTTP + OAuth)
// Reuses the real WooCommerce REST HTTP layer from
// @/lib/commerce/woocommerce (Basic-auth admin API) and adds a real
// OAuth 1.0a "key" authorisation flow plus WOO Connect app flow.
// WooCommerce is a commerce (revenue) source, so "campaigns" map to
// real orders and "conversions" to real order events.
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

const WOO_CONFIG: PlatformConfig = {
  id: "woocommerce",
  name: "WooCommerce",
  apiVersion: "v3",
  apiBaseUrl: "",
  oauth: {
    clientId: process.env.WOO_CLIENT_ID || "",
    clientSecret: process.env.WOO_CLIENT_SECRET || "",
    redirectUri: process.env.WOO_REDIRECT_URI || "http://localhost:3000/api/auth/callback/woocommerce",
    scopes: ["read"],
    authUrl: "/wc-auth/v1/authorize",
    tokenUrl: "",
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

export class WooCommerceConnector extends BaseConnector {
  constructor() {
    super(WOO_CONFIG);
  }

  private getStoreUrl(): string {
    const url = (process.env.WOO_STORE_URL || "").replace(/\/+$/, "");
    return url.replace(/^https?:\/\//, "") ? url : "";
  }

  // ── OAuth ──────────────────────────────────────────────

  async generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string; codeVerifier: string }> {
    const storeUrl = this.getStoreUrl();
    const state = crypto.randomBytes(16).toString("hex");
    const codeVerifier = this.generateCodeVerifier();

    const { getDb } = await import("../db");
    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, code_verifier, created_at, expires_at)
      VALUES (?, ?, 'woocommerce', ?, datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, tenantId, codeVerifier);

    const params = new URLSearchParams({
      app_name: "KIKI Agent Platform",
      scope: this.config.oauth.scopes.join(","),
      user_id: tenantId,
      return_url: this.config.oauth.redirectUri,
      callback_url: this.config.oauth.redirectUri,
    });

    return { url: `${storeUrl}${this.config.oauth.authUrl}?${params.toString()}`, state, codeVerifier };
  }

  async handleCallback(code: string, state: string, codeVerifier?: string, storeUrl?: string): Promise<OAuthTokens> {
    const store = (storeUrl || this.getStoreUrl()).replace(/\/+$/, "");
    // WOO Connect callback provides consumer_key/consumer_secret directly.
    const params = new URLSearchParams(code || "");
    const consumerKey = params.get("consumer_key") || code;
    const consumerSecret = params.get("consumer_secret") || "";

    if (!consumerKey || !consumerSecret) {
      throw new Error("WooCommerce authorisation did not return consumer credentials");
    }

    const composite = `${consumerKey}:${consumerSecret}`;
    return {
      accessToken: Buffer.from(composite).toString("base64"),
      refreshToken: composite,
      expiresAt: Date.now() + 365 * 86400000,
      tokenType: "Basic",
      scope: this.config.oauth.scopes.slice(),
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    // WooCommerce legacy keys do not refresh; echo the same credentials.
    return {
      accessToken: Buffer.from(refreshToken).toString("base64"),
      refreshToken,
      expiresAt: Date.now() + 365 * 86400000,
      tokenType: "Basic",
      scope: this.config.oauth.scopes.slice(),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    const storeUrl = this.getStoreUrl();
    if (!storeUrl) return false;
    const connector = getCommerceConnector("woocommerce");
    const orders = await connector.fetchOrders(accessToken, storeUrl, new Date(0).toISOString(), 1);
    return orders !== undefined && orders !== null;
  }

  // ── Account ────────────────────────────────────────────

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    const storeUrl = this.getStoreUrl();
    if (!storeUrl) return { success: false, latencyMs: 0, error: "WooCommerce store URL not configured" };

    const [key, secret] = Buffer.from(accessToken, "base64").toString().split(":");
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const url = `${storeUrl}/wp-json/wc/v3/system_status`;
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) return { success: false, latencyMs: 0, error: `HTTP ${res.status}`, httpStatus: res.status };

    const data = (await res.json()) as any;
    const env = data?.environment;
    return {
      success: true,
      latencyMs: 0,
      data: {
        id: storeUrl.replace(/^https?:\/\//, "").replace(/\..*$/, ""),
        name: env?.site_title || storeUrl.replace(/^https?:\/\//, ""),
        currency: env?.currency || "USD",
        timezone: env?.timezone || undefined,
        config: { storeUrl },
      },
    };
  }

  // ── Campaigns / Orders (commerce source) ───────────────

  async listCampaigns(accessToken: string, accountId: string): Promise<PlatformApiResponse<PlatformCampaign[]>> {
    const storeUrl = this.getStoreUrl();
    const connector = getCommerceConnector("woocommerce");
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const orders = await connector.fetchOrders(accessToken, storeUrl, since, 100);

    const campaigns: PlatformCampaign[] = orders.slice(0, 50).map((o) => ({
      id: `woo_order_${o.orderId}`,
      platformId: "woocommerce" as PlatformId,
      name: `Order #${o.orderId}`,
      status: o.refunded ? "paused" : "active",
      objective: "PURCHASE",
      dailyBudget: o.total,
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
    if (!found) return { success: true, latencyMs: 0 };

    const total = found.dailyBudget || 0;
    return {
      success: true,
      latencyMs: 0,
      data: {
        campaignId,
        platformId: "woocommerce",
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
      },
    };
  }

  // ── CAPI / Order Events ────────────────────────────────

  async sendConversion(accessToken: string, event: ConversionEvent): Promise<ConversionDeliveryResult> {
    const start = Date.now();
    const { eventBus } = await import("../events");
    eventBus.emit("commerce.order" as any, {
      platform: "woocommerce",
      tenantId: event.userData.externalId || "",
      orderId: event.customData.orderId || "",
      total: event.customData.value,
      currency: event.customData.currency,
    });
    // WooCommerce order events are persisted by the real webhook sync.
    return { platform: "woocommerce", success: true, latencyMs: Date.now() - start };
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
    const raw = body;
    return {
      platform: "woocommerce",
      eventType: raw?.id ? "order" : "event",
      eventId: (raw?.id ?? crypto.randomBytes(16).toString("hex")).toString(),
      timestamp: raw?.date_created ? Date.parse(raw.date_created) : Date.now(),
      data: body,
    };
  }
}

export const wooCommerceConnector = new WooCommerceConnector();

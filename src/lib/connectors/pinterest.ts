// ============================================================
// KIKI Agent Platform — Pinterest Ads Connector
// OAuth 2.0, Campaign Management, Conversions API
// ============================================================

import crypto from "crypto";
import { getDb } from "../db";
import {
  BaseConnector,
  encryptToken,
  decryptToken,
} from "./base";
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

// ── Pinterest Configuration ─────────────────────────────────

const PINTEREST_CONFIG: PlatformConfig = {
  id: "pinterest",
  name: "Pinterest Ads",
  apiVersion: "v5",
  apiBaseUrl: "https://api.pinterest.com/v5",
  oauth: {
    clientId: process.env.PINTEREST_APP_ID || "",
    clientSecret: process.env.PINTEREST_APP_SECRET || "",
    redirectUri: process.env.PINTEREST_REDIRECT_URI || "http://localhost:3000/api/auth/callback/pinterest",
    scopes: ["ads:read", "ads:write", "catalogs:write"],
    authUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
  },
  rateLimits: {
    requestsPerSecond: 5,
    requestsPerHour: 100,
    dailySpendLimit: 20000,
  },
  supportsCAPI: true,
  supportsOAuth: true,
  supportsConversionValue: true,
  conversionEvents: [
    "PAGE_VISIT", "SIGNUP", "CHECKOUT", "ADD_TO_CART",
    "VIEW_CATEGORY", "SEARCH", "LEAD", "CUSTOM",
  ],
};

// ── Pinterest Connector ─────────────────────────────────────

export class PinterestConnector extends BaseConnector {
  constructor() {
    super(PINTEREST_CONFIG);
  }

  // ── OAuth ──────────────────────────────────────────────

  async generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(32).toString("hex");

    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, created_at, expires_at)
      VALUES (?, ?, 'pinterest', datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, tenantId);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.oauth.clientId,
      redirect_uri: this.config.oauth.redirectUri,
      state,
      scope: this.config.oauth.scopes.join(","),
    });

    return { url: `${this.config.oauth.authUrl}?${params.toString()}`, state };
  }

  async handleCallback(code: string, state: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      code,
    });

    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!result.ok) {
      const error = await result.text();
      throw new Error(`Pinterest OAuth failed: ${error}`);
    }

    const data = await result.json();
    if (data.code) {
      throw new Error(`Pinterest OAuth error: ${data.message || data.code}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 86400000,
      tokenType: data.token_type || "Bearer",
      scope: (data.scope || "").split(",").map((s: string) => s.trim()).filter(Boolean),
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      refresh_token: refreshToken,
    });

    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!result.ok) throw new Error("Pinterest token refresh failed");

    const data = await result.json();
    if (data.code) throw new Error(`Pinterest refresh error: ${data.message || data.code}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 86400000,
      tokenType: data.token_type || "Bearer",
      scope: (data.scope || "").split(",").map((s: string) => s.trim()).filter(Boolean),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    const result = await this.get<{ data: { id: string; username: string } }>(
      "/user_account",
      accessToken
    );
    return result.success && !!result.data?.data?.id;
  }

  // ── Account ────────────────────────────────────────────

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    const userResult = await this.get<{ data: { id: string; username: string } }>(
      "/user_account",
      accessToken
    );

    if (!userResult.success || !userResult.data?.data?.id) {
      return { ...userResult, data: undefined };
    }

    const accountsResult = await this.get<{
      items: Array<{
        id: string;
        name: string;
        type: string;
        currency: string;
        owner: string;
      }>;
    }>(
      "/ad_accounts",
      accessToken,
      { page_size: "1", order: "DESCENDING" }
    );

    if (!accountsResult.success || !accountsResult.data?.items?.[0]) {
      return { ...accountsResult, data: undefined };
    }

    const account = accountsResult.data.items[0];
    return {
      success: true,
      data: {
        id: account.id,
        name: account.name,
        currency: account.currency,
        config: { userId: userResult.data.data.id },
      },
      latencyMs: userResult.latencyMs + accountsResult.latencyMs,
    };
  }

  // ── Campaigns ──────────────────────────────────────────

  async listCampaigns(
    accessToken: string,
    accountId: string
  ): Promise<PlatformApiResponse<PlatformCampaign[]>> {
    const result = await this.get<{
      items: Array<{
        id: string;
        name: string;
        status: string;
        objective_type: string;
        daily_spend_cap: number;
        created_time: number;
        updated_time: number;
      }>;
    }>(
      `/ad_accounts/${accountId}/campaigns`,
      accessToken,
      { page_size: "100", order: "DESCENDING" }
    );

    if (!result.success || !result.data?.items) {
      return { ...result, data: undefined };
    }

    const campaigns: PlatformCampaign[] = result.data.items.map(c => ({
      id: c.id,
      platformId: "pinterest" as PlatformId,
      name: c.name,
      status: c.status === "ACTIVE" ? "active" : "paused",
      objective: c.objective_type,
      dailyBudget: c.daily_spend_cap || 0,
      createdAt: new Date(c.created_time * 1000).toISOString(),
      updatedAt: new Date(c.updated_time * 1000).toISOString(),
    }));

    return { success: true, data: campaigns, latencyMs: result.latencyMs };
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    const result = await this.get<{
      data: {
        id: string;
        name: string;
        status: string;
        objective_type: string;
        daily_spend_cap: number;
        created_time: number;
        updated_time: number;
      };
    }>(
      `/campaigns/${campaignId}`,
      accessToken
    );

    if (!result.success || !result.data?.data?.id) {
      return { ...result, data: undefined };
    }

    const c = result.data.data;
    return {
      success: true,
      data: {
        id: c.id,
        platformId: "pinterest",
        name: c.name,
        status: c.status === "ACTIVE" ? "active" : "paused",
        objective: c.objective_type,
        dailyBudget: c.daily_spend_cap || 0,
        createdAt: new Date(c.created_time * 1000).toISOString(),
        updatedAt: new Date(c.updated_time * 1000).toISOString(),
      },
      latencyMs: result.latencyMs,
    };
  }

  async getCampaignMetrics(
    accessToken: string,
    campaignId: string,
    dateRange: { start: string; end: string }
  ): Promise<PlatformApiResponse<PlatformCampaignMetrics>> {
    const result = await this.get<{
      data: {
        impressions: string;
        clicks: string;
        total_conversions: string;
        spend_micro_dollar: string;
        cpc_micro_dollar: string;
        cpm_micro_dollar: string;
        ctr: string;
        frequency: string;
        sum_clicks: string;
      };
    }>(
      `/campaigns/${campaignId}/metrics`,
      accessToken,
      {
        start_date: dateRange.start,
        end_date: dateRange.end,
        columns: "IMPRESSIONS,CLICKS,TOTAL_CONVERSIONS,SPEND_MICRO_DOLLAR,CPC_MICRO_DOLLAR,CPM_MICRO_DOLLAR,CTR,FREQUENCY,SUM_CLICKS",
      }
    );

    if (!result.success || !result.data?.data) {
      return { ...result, data: undefined };
    }

    const m = result.data.data;
    const impressions = parseInt(m.impressions || "0");
    const clicks = parseInt(m.clicks || "0");
    const conversions = parseFloat(m.total_conversions || "0");
    const spend = (parseFloat(m.spend_micro_dollar || "0")) / 1_000_000;

    return {
      success: true,
      data: {
        campaignId,
        platformId: "pinterest",
        impressions,
        clicks,
        conversions,
        conversionValue: 0,
        spend,
        revenue: 0,
        roas: 0,
        cpc: (parseFloat(m.cpc_micro_dollar || "0")) / 1_000_000,
        cpm: (parseFloat(m.cpm_micro_dollar || "0")) / 1_000_000,
        ctr: parseFloat(m.ctr || "0") * 100,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        frequency: parseFloat(m.frequency || "0"),
        reach: 0,
        period: dateRange,
      },
      latencyMs: result.latencyMs,
    };
  }

  // ── CAPI (Conversions API) ─────────────────────────────

  async sendConversion(
    accessToken: string,
    event: ConversionEvent
  ): Promise<ConversionDeliveryResult> {
    const start = Date.now();

    try {
      const accountId = process.env.PINTEREST_AD_ACCOUNT_ID || "";
      if (!accountId) {
        return { platform: "pinterest", success: false, latencyMs: Date.now() - start, error: "No ad account ID configured" };
      }

      const dedupId = this.generateDedupId(
        "pinterest",
        event.customData.orderId || "",
        event.eventName
      );

      const userData: Record<string, any> = {};
      if (event.userData.email) userData.hashed_email = this.hashEmail(event.userData.email);
      if (event.userData.phone) userData.hashed_phone_number = this.hashPhone(event.userData.phone);
      if (event.userData.ipAddress) userData.ip_address = event.userData.ipAddress;
      if (event.userData.userAgent) userData.user_agent = event.userData.userAgent;
      if (event.userData.pinterestClickId) userData.click_id = event.userData.pinterestClickId;

      const payload = {
        event_name: event.eventName,
        event_id: dedupId,
        event_time: event.eventTime,
        user_data: userData,
        custom_data: {
          currency: event.customData.currency,
          value: event.customData.value,
          order_id: event.customData.orderId,
          content_name: event.customData.contentName,
          content_ids: event.customData.contentIds,
          content_type: "product",
          number_items: event.customData.numberOfItems,
        },
      };

      const result = await this.post<{ data: { event_id: string } }>(
        `/ad_accounts/${accountId}/conversion_events`,
        accessToken,
        payload
      );

      return {
        platform: "pinterest",
        success: result.success,
        eventId: dedupId,
        latencyMs: Date.now() - start,
        error: result.error,
        httpStatus: result.httpStatus,
      };
    } catch (error) {
      return {
        platform: "pinterest",
        success: false,
        latencyMs: Date.now() - start,
        error: String(error),
      };
    }
  }

  // ── Webhook Verification ───────────────────────────────

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return signature === expectedSignature;
  }

  parseWebhookPayload(body: any): PlatformWebhook {
    return {
      platform: "pinterest",
      eventType: body.event_type || "conversion",
      eventId: body.event_id || crypto.randomBytes(16).toString("hex"),
      timestamp: body.timestamp || Date.now(),
      data: body,
    };
  }
}

// ── Export Singleton ────────────────────────────────────────

export const pinterestConnector = new PinterestConnector();

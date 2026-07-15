// ============================================================
// KIKI Agent Platform — Snapchat Ads Connector
// OAuth 2.0, Campaign Management, Conversion API
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

// ── Snap Configuration ──────────────────────────────────────

const SNAP_CONFIG: PlatformConfig = {
  id: "snap",
  name: "Snapchat Ads",
  apiVersion: "v1",
  apiBaseUrl: "https://adsapi.snapchat.com/v1",
  oauth: {
    clientId: process.env.SNAP_CLIENT_ID || "",
    clientSecret: process.env.SNAP_CLIENT_SECRET || "",
    redirectUri: process.env.SNAP_REDIRECT_URI || "http://localhost:3000/api/auth/callback/snap",
    scopes: ["snapchat-marketing-api"],
    authUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
    tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
  },
  rateLimits: {
    requestsPerSecond: 5,
    requestsPerHour: 100,
    dailySpendLimit: 25000,
  },
  supportsCAPI: true,
  supportsOAuth: true,
  supportsConversionValue: true,
  conversionEvents: [
    "PAGE_VIEW", "SIGN_UP", "PURCHASE", "ADD_TO_CART",
    "START_CHECKOUT", "SEARCH", "VIEW_CONTENT", "SUBSCRIBE",
    "DOWNLOAD", "CONTACT", "SUBMIT_FORM",
  ],
};

// ── Snap Connector ──────────────────────────────────────────

export class SnapConnector extends BaseConnector {
  constructor() {
    super(SNAP_CONFIG);
  }

  // ── OAuth ──────────────────────────────────────────────

  async generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(32).toString("hex");

    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, created_at, expires_at)
      VALUES (?, ?, 'snap', datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, tenantId);

    const params = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      redirect_uri: this.config.oauth.redirectUri,
      response_type: "code",
      state,
      scope: this.config.oauth.scopes.join(" "),
    });

    return { url: `${this.config.oauth.authUrl}?${params.toString()}`, state };
  }

  async handleCallback(code: string, state: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      redirect_uri: this.config.oauth.redirectUri,
    });

    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!result.ok) {
      const error = await result.text();
      throw new Error(`Snap OAuth failed: ${error}`);
    }

    const data = await result.json();
    if (data.error) {
      throw new Error(`Snap OAuth error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 86400000,
      tokenType: data.token_type || "Bearer",
      scope: (data.scope || "").split(" ").filter(Boolean),
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
    });

    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!result.ok) throw new Error("Snap token refresh failed");

    const data = await result.json();
    if (data.error) throw new Error(`Snap refresh error: ${data.error_description || data.error}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 86400000,
      tokenType: data.token_type || "Bearer",
      scope: (data.scope || "").split(" ").filter(Boolean),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    const result = await this.get<{ advertiser_id: string }>(
      "/me",
      accessToken
    );
    return result.success && !!result.data?.advertiser_id;
  }

  // ── Account ────────────────────────────────────────────

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    const result = await this.get<{
      advertisers: Array<{
        id: string;
        name: string;
        currency: string;
        timezone: string;
        status: string;
      }>;
    }>(
      "/adaccounts",
      accessToken,
      { status: "ACTIVE" }
    );

    if (!result.success || !result.data?.advertisers?.[0]) {
      return { ...result, data: undefined };
    }

    const account = result.data.advertisers[0];
    return {
      success: true,
      data: {
        id: account.id,
        name: account.name,
        currency: account.currency,
        timezone: account.timezone,
        config: {},
      },
      latencyMs: result.latencyMs,
    };
  }

  // ── Campaigns ──────────────────────────────────────────

  async listCampaigns(
    accessToken: string,
    accountId: string
  ): Promise<PlatformApiResponse<PlatformCampaign[]>> {
    const result = await this.get<{
      campaigns: Array<{
        id: string;
        name: string;
        status: string;
        objective: string;
        daily_budget_micro_currency: number;
        created_at: string;
        updated_at: string;
      }>;
    }>(
      "/campaigns",
      accessToken,
      {
        advertiser_id: accountId,
        status: "ACTIVE",
      }
    );

    if (!result.success || !result.data?.campaigns) {
      return { ...result, data: undefined };
    }

    const campaigns: PlatformCampaign[] = result.data.campaigns.map(c => ({
      id: c.id,
      platformId: "snap" as PlatformId,
      name: c.name,
      status: c.status === "ACTIVE" ? "active" : "paused",
      objective: c.objective,
      dailyBudget: (c.daily_budget_micro_currency || 0) / 1_000_000,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return { success: true, data: campaigns, latencyMs: result.latencyMs };
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    const result = await this.get<{
      campaign: {
        id: string;
        name: string;
        status: string;
        objective: string;
        daily_budget_micro_currency: number;
        created_at: string;
        updated_at: string;
      };
    }>(
      `/campaigns/${campaignId}`,
      accessToken
    );

    if (!result.success || !result.data?.campaign?.id) {
      return { ...result, data: undefined };
    }

    const c = result.data.campaign;
    return {
      success: true,
      data: {
        id: c.id,
        platformId: "snap",
        name: c.name,
        status: c.status === "ACTIVE" ? "active" : "paused",
        objective: c.objective,
        dailyBudget: (c.daily_budget_micro_currency || 0) / 1_000_000,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
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
      timeseries: Array<{
        impressions: string;
        swipes: string;
        conversions: string;
        conversion_purchases: string;
        spend_micro_currency: string;
        swipe_up_rate: string;
        frequency: string;
      }>;
    }>(
      `/campaigns/${campaignId}/stats`,
      accessToken,
      {
        start_time: `${dateRange.start}T00:00:00.000-00:00`,
        end_time: `${dateRange.end}T23:59:59.999-00:00`,
        granularity: "TOTAL",
        conversion_source_types: "WEB,APP",
      }
    );

    if (!result.success || !result.data?.timeseries?.[0]) {
      return { ...result, data: undefined };
    }

    const m = result.data.timeseries[0];
    const impressions = parseInt(m.impressions || "0");
    const clicks = parseInt(m.swipes || "0");
    const conversions = parseFloat(m.conversions || "0");
    const spend = (parseFloat(m.spend_micro_currency || "0")) / 1_000_000;

    return {
      success: true,
      data: {
        campaignId,
        platformId: "snap",
        impressions,
        clicks,
        conversions,
        conversionValue: 0,
        spend,
        revenue: 0,
        roas: 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        ctr: parseFloat(m.swipe_up_rate || "0") * 100,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        frequency: parseFloat(m.frequency || "0"),
        reach: 0,
        period: dateRange,
      },
      latencyMs: result.latencyMs,
    };
  }

  // ── CAPI ───────────────────────────────────────────────

  async sendConversion(
    accessToken: string,
    event: ConversionEvent
  ): Promise<ConversionDeliveryResult> {
    const start = Date.now();

    try {
      const pixelId = process.env.SNAP_PIXEL_ID || "";
      if (!pixelId) {
        return { platform: "snap", success: false, latencyMs: Date.now() - start, error: "No pixel ID configured" };
      }

      const dedupId = this.generateDedupId(
        "snap",
        event.customData.orderId || "",
        event.eventName
      );

      const userData: Record<string, any> = {};
      if (event.userData.email) userData.hashed_email = this.hashEmail(event.userData.email);
      if (event.userData.phone) userData.hashed_phone_number = this.hashPhone(event.userData.phone);
      if (event.userData.ipAddress) userData.ip_address = event.userData.ipAddress;
      if (event.userData.userAgent) userData.user_agent = event.userData.userAgent;
      if (event.userData.snapClickId) userData.click_id = event.userData.snapClickId;

      const payload = {
        pixel_id: pixelId,
        events: [
          {
            event_name: event.eventName,
            event_id: dedupId,
            event_timestamp_ms: event.eventTime * 1000,
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
          },
        ],
      };

      const result = await this.post<{ request_id: string }>(
        "/conversion_events",
        accessToken,
        payload
      );

      return {
        platform: "snap",
        success: result.success,
        eventId: dedupId,
        latencyMs: Date.now() - start,
        error: result.error,
        httpStatus: result.httpStatus,
      };
    } catch (error) {
      return {
        platform: "snap",
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
      platform: "snap",
      eventType: body.event_type || "conversion",
      eventId: body.event_id || crypto.randomBytes(16).toString("hex"),
      timestamp: body.timestamp || Date.now(),
      data: body,
    };
  }
}

// ── Export Singleton ────────────────────────────────────────

export const snapConnector = new SnapConnector();

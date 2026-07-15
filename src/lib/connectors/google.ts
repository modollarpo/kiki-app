// ============================================================
// KIKI Agent Platform — Google Ads Connector
// OAuth 2.0, Campaign Management, Enhanced Conversions
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

// ── Google Ads Configuration ───────────────────────────────

const GOOGLE_CONFIG: PlatformConfig = {
  id: "google",
  name: "Google Ads",
  apiVersion: "v16",
  apiBaseUrl: "https://googleads.googleapis.com/v16",
  oauth: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google",
    scopes: [
      "https://www.googleapis.com/auth/adwords",
      "https://www.googleapis.com/auth/analytics.readonly",
    ],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
  },
  rateLimits: {
    requestsPerSecond: 15,
    requestsPerHour: 1500,
    dailySpendLimit: 100000,
  },
  supportsCAPI: true,
  supportsOAuth: true,
  supportsConversionValue: true,
  conversionEvents: [
    "conversion", "purchase", "signup", "page_view",
    "add_to_cart", "begin_checkout", "purchase",
  ],
};

// ── Google Ads Connector ───────────────────────────────────

export class GoogleConnector extends BaseConnector {
  constructor() {
    super(GOOGLE_CONFIG);
  }

  // ── OAuth ──────────────────────────────────────────────

  async generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(32).toString("hex");

    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, created_at, expires_at)
      VALUES (?, ?, 'google', datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, tenantId);

    const params = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      redirect_uri: this.config.oauth.redirectUri,
      response_type: "code",
      scope: this.config.oauth.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return { url: `${this.config.oauth.authUrl}?${params.toString()}`, state };
  }

  async handleCallback(code: string, state: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: this.config.oauth.redirectUri,
    });

    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!result.ok) {
      const error = await result.text();
      throw new Error(`Google OAuth failed: ${error}`);
    }

    const data = await result.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 3600000,
      tokenType: data.token_type || "Bearer",
      scope: (data.scope || "").split(" "),
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!result.ok) throw new Error("Google token refresh failed");

    const data = await result.json();
    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Google doesn't return new refresh token
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 3600000,
      tokenType: "Bearer",
      scope: (data.scope || "").split(" "),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const result = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return result.ok;
    } catch {
      return false;
    }
  }

  // ── Account ────────────────────────────────────────────

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    try {
      // Google Ads requires a developer token and customer ID
      // In production, fetch from user info + Ads API
      const userResult = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResult.ok) {
        return { success: false, error: "Failed to fetch user info", latencyMs: 0 };
      }

      const userData = await userResult.json();

      return {
        success: true,
        data: {
          id: userData.sub || "google_account",
          name: userData.name || "Google Ads Account",
          email: userData.email,
          config: {
            customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || "",
            developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
            loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "",
          },
        },
        latencyMs: 0,
      };
    } catch (error) {
      return { success: false, error: String(error), latencyMs: 0 };
    }
  }

  // ── Campaigns ──────────────────────────────────────────

  async listCampaigns(
    accessToken: string,
    accountId: string
  ): Promise<PlatformApiResponse<PlatformCampaign[]>> {
    const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID || "";
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        campaign.start_date,
        campaign.end_date
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.start_date DESC
    `;

    const result = await this.post<{
      results: Array<{
        campaign: {
          resourceName: string;
          id: string;
          name: string;
          status: string;
          advertisingChannelType: string;
        };
        campaignBudget: { amountMicros: string };
      }>;
    }>(
      `customers/${customerId}/googleAds:searchStream`,
      accessToken,
      { query }
    );

    if (!result.success || !result.data) {
      return { ...result, data: undefined };
    }

    const campaigns: PlatformCampaign[] = result.data.results.map(r => ({
      id: r.campaign.id,
      platformId: "google" as PlatformId,
      name: r.campaign.name,
      status: r.campaign.status === "ENABLED" ? "active" : r.campaign.status === "PAUSED" ? "paused" : "archived",
      objective: r.campaign.advertisingChannelType,
      dailyBudget: parseInt(r.campaignBudget?.amountMicros || "0") / 1000000,
      createdAt: r.campaign.id,
      updatedAt: r.campaign.id,
    }));

    return { success: true, data: campaigns, latencyMs: result.latencyMs };
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || "";

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    const result = await this.post<{
      results: Array<{
        campaign: {
          id: string;
          name: string;
          status: string;
          advertisingChannelType: string;
        };
        campaignBudget: { amountMicros: string };
      }>;
    }>(
      `customers/${customerId}/googleAds:searchStream`,
      accessToken,
      { query }
    );

    if (!result.success || !result.data?.results?.[0]) {
      return { ...result, data: undefined };
    }

    const r = result.data.results[0];
    return {
      success: true,
      data: {
        id: r.campaign.id,
        platformId: "google",
        name: r.campaign.name,
        status: r.campaign.status === "ENABLED" ? "active" : "paused",
        objective: r.campaign.advertisingChannelType,
        dailyBudget: parseInt(r.campaignBudget?.amountMicros || "0") / 1000000,
        createdAt: r.campaign.id,
        updatedAt: r.campaign.id,
      },
      latencyMs: result.latencyMs,
    };
  }

  async getCampaignMetrics(
    accessToken: string,
    campaignId: string,
    dateRange: { start: string; end: string }
  ): Promise<PlatformApiResponse<PlatformCampaignMetrics>> {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || "";

    const query = `
      SELECT
        campaign.id,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_micros,
        metrics.average_cpc,
        metrics.average_cpm,
        metrics.ctr,
        metrics.search_impression_share
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
    `;

    const result = await this.post<{
      results: Array<{
        metrics: {
          impressions: string;
          clicks: string;
          conversions: string;
          conversionsValue: string;
          costMicros: string;
          averageCpc: string;
          averageCpm: string;
          ctr: string;
        };
      }>;
    }>(
      `customers/${customerId}/googleAds:searchStream`,
      accessToken,
      { query }
    );

    if (!result.success || !result.data?.results?.[0]) {
      return { ...result, data: undefined };
    }

    const m = result.data.results[0].metrics;
    const impressions = parseInt(m.impressions || "0");
    const clicks = parseInt(m.clicks || "0");
    const conversions = parseFloat(m.conversions || "0");
    const conversionValue = parseFloat(m.conversionsValue || "0");
    const spend = parseInt(m.costMicros || "0") / 1000000;

    return {
      success: true,
      data: {
        campaignId,
        platformId: "google",
        impressions,
        clicks,
        conversions,
        conversionValue,
        spend,
        revenue: conversionValue,
        roas: spend > 0 ? conversionValue / spend : 0,
        cpc: parseFloat(m.averageCpc || "0") / 1000000,
        cpm: parseFloat(m.averageCpm || "0") / 1000000,
        ctr: parseFloat(m.ctr || "0"),
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        frequency: 0,
        reach: 0,
        period: dateRange,
      },
      latencyMs: result.latencyMs,
    };
  }

  // ── Enhanced Conversions (CAPI) ────────────────────────

  async sendConversion(
    accessToken: string,
    event: ConversionEvent
  ): Promise<ConversionDeliveryResult> {
    const start = Date.now();

    try {
      const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || "";
      const conversionActionId = process.env.GOOGLE_CONVERSION_ACTION_ID || "";

      // Build Enhanced Conversions payload
      const userData: Record<string, any> = {};
      if (event.userData.email) {
        userData.emailAddresses = [{ sha256Hashed: this.hashEmail(event.userData.email) }];
      }
      if (event.userData.phone) {
        userData.phoneNumbers = [{ sha256Hashed: this.hashPhone(event.userData.phone) }];
      }
      if (event.userData.externalId) {
        userData.addresses = [{ hashedFirstName: event.userData.externalId }];
      }

      const payload = {
        conversions: [{
          conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
          conversionDateTime: new Date(event.eventTime * 1000).toISOString(),
          conversionValue: event.customData.value,
          currencyCode: event.customData.currency,
          orderId: event.customData.orderId,
          gbraid: event.userData.gbraid,
          wbraid: event.userData.wbraid,
          userData,
        }],
      };

      const result = await this.post<{ results: Array<{ conversionAction: string; conversionDateTime: string }> }>(
        `customers/${customerId}/conversionUploads:uploadClickConversions`,
        accessToken,
        payload
      );

      return {
        platform: "google",
        success: result.success,
        eventId: event.customData.orderId,
        latencyMs: Date.now() - start,
        error: result.error,
        httpStatus: result.httpStatus,
      };
    } catch (error) {
      return {
        platform: "google",
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
      .digest("base64");
    return signature === expectedSignature;
  }

  parseWebhookPayload(body: any): PlatformWebhook {
    return {
      platform: "google",
      eventType: body.kind?.replace("adhoc#conversionReport ", "") || "conversion",
      eventId: body.conversion?.conversionActionId || crypto.randomBytes(16).toString("hex"),
      timestamp: body.conversion?.conversionDateTime
        ? new Date(body.conversion.conversionDateTime).getTime()
        : Date.now(),
      data: body,
    };
  }
}

// ── Export Singleton ────────────────────────────────────────

export const googleConnector = new GoogleConnector();

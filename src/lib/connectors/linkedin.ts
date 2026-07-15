// ============================================================
// KIKI Agent Platform — LinkedIn Ads Connector
// OAuth 2.0, Campaign Management, Pixel-only CAPI
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

// ── LinkedIn Configuration ──────────────────────────────────

const LINKEDIN_CONFIG: PlatformConfig = {
  id: "linkedin",
  name: "LinkedIn Ads",
  apiVersion: "v2",
  apiBaseUrl: "https://api.linkedin.com/v2",
  oauth: {
    clientId: process.env.LINKEDIN_CLIENT_ID || "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3000/api/auth/callback/linkedin",
    scopes: ["r_ads", "w_ads", "r_ads_reporting", "r_organization_social"],
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  },
  rateLimits: {
    requestsPerSecond: 5,
    requestsPerHour: 100,
    dailySpendLimit: 25000,
  },
  supportsCAPI: false,
  supportsOAuth: true,
  supportsConversionValue: false,
  conversionEvents: [],
};

// ── LinkedIn Connector ──────────────────────────────────────

export class LinkedInConnector extends BaseConnector {
  constructor() {
    super(LINKEDIN_CONFIG);
  }

  // ── OAuth ──────────────────────────────────────────────

  async generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(32).toString("hex");

    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, created_at, expires_at)
      VALUES (?, ?, 'linkedin', datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, tenantId);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.oauth.clientId,
      redirect_uri: this.config.oauth.redirectUri,
      state,
      scope: this.config.oauth.scopes.join(" "),
    });

    return { url: `${this.config.oauth.authUrl}?${params.toString()}`, state };
  }

  async handleCallback(code: string, state: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.oauth.redirectUri,
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
    });

    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!result.ok) {
      const error = await result.text();
      throw new Error(`LinkedIn OAuth failed: ${error}`);
    }

    const data = await result.json();
    if (data.error) {
      throw new Error(`LinkedIn OAuth error: ${data.error_description || data.error}`);
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
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
    });

    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!result.ok) throw new Error("LinkedIn token refresh failed");

    const data = await result.json();
    if (data.error) throw new Error(`LinkedIn refresh error: ${data.error_description || data.error}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 86400000,
      tokenType: data.token_type || "Bearer",
      scope: (data.scope || "").split(" ").filter(Boolean),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    const result = await this.get<{ sub: string }>(
      "/userinfo",
      accessToken
    );
    return result.success && !!result.data?.sub;
  }

  // ── Account ────────────────────────────────────────────

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    const result = await this.get<{
      elements: Array<{
        id: string;
        name: string;
        status: string;
        currency: string;
        timezoneInfo: { timezone: string };
        reference: string;
      }>;
    }>(
      "/adAccountsV2",
      accessToken,
      { q: "search", status: "ACTIVE", count: "1" }
    );

    if (!result.success || !result.data?.elements?.[0]) {
      return { ...result, data: undefined };
    }

    const account = result.data.elements[0];
    return {
      success: true,
      data: {
        id: account.id,
        name: account.name,
        currency: account.currency,
        timezone: account.timezoneInfo?.timezone,
        config: { organizationId: account.reference },
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
      elements: Array<{
        id: string;
        name: string;
        status: string;
        objectiveType: string;
        dailyBudget: { amount: string; currencyCode: string };
        createdAt: number;
        lastModifiedAt: number;
      }>;
    }>(
      "/adCampaignsV2",
      accessToken,
      {
        q: "search",
        accounts: `urn:li:sponsoredAccount:${accountId}`,
        status: "ACTIVE",
        count: "100",
      }
    );

    if (!result.success || !result.data?.elements) {
      return { ...result, data: undefined };
    }

    const campaigns: PlatformCampaign[] = result.data.elements.map(c => ({
      id: c.id,
      platformId: "linkedin" as PlatformId,
      name: c.name,
      status: c.status === "ACTIVE" ? "active" : "paused",
      objective: c.objectiveType,
      dailyBudget: parseFloat(c.dailyBudget?.amount || "0"),
      createdAt: new Date(c.createdAt).toISOString(),
      updatedAt: new Date(c.lastModifiedAt).toISOString(),
    }));

    return { success: true, data: campaigns, latencyMs: result.latencyMs };
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    const result = await this.get<{
      id: string;
      name: string;
      status: string;
      objectiveType: string;
      dailyBudget: { amount: string; currencyCode: string };
      createdAt: number;
      lastModifiedAt: number;
    }>(
      `/adCampaignsV2:${campaignId}`,
      accessToken
    );

    if (!result.success || !result.data?.id) {
      return { ...result, data: undefined };
    }

    const c = result.data;
    return {
      success: true,
      data: {
        id: c.id,
        platformId: "linkedin",
        name: c.name,
        status: c.status === "ACTIVE" ? "active" : "paused",
        objective: c.objectiveType,
        dailyBudget: parseFloat(c.dailyBudget?.amount || "0"),
        createdAt: new Date(c.createdAt).toISOString(),
        updatedAt: new Date(c.lastModifiedAt).toISOString(),
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
      elements: Array<{
        metrics: {
          impressions: string;
          clicks: string;
          totalConversions: string;
          costInLocalCurrency: string;
          cpc: string;
          cpm: string;
          ctr: string;
          frequency: string;
        };
      }>;
    }>(
      "/adAnalyticsV2",
      accessToken,
      {
        q: "analytics",
        dateRange: `(start:day:${dateRange.start},end:day:${dateRange.end})`,
        campaigns: `(urn:li:sponsoredCampaign:${campaignId})`,
        timeGranularity: "TOTAL",
        metrics: "impressions,clicks,totalConversions,costInLocalCurrency,cpc,cpm,ctr,frequency",
      }
    );

    if (!result.success || !result.data?.elements?.[0]) {
      return { ...result, data: undefined };
    }

    const m = result.data.elements[0].metrics;
    const impressions = parseInt(m.impressions || "0");
    const clicks = parseInt(m.clicks || "0");
    const conversions = parseFloat(m.totalConversions || "0");
    const spend = parseFloat(m.costInLocalCurrency || "0");

    return {
      success: true,
      data: {
        campaignId,
        platformId: "linkedin",
        impressions,
        clicks,
        conversions,
        conversionValue: 0,
        spend,
        revenue: 0,
        roas: 0,
        cpc: parseFloat(m.cpc || "0"),
        cpm: parseFloat(m.cpm || "0"),
        ctr: parseFloat(m.ctr || "0"),
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        frequency: parseFloat(m.frequency || "0"),
        reach: 0,
        period: dateRange,
      },
      latencyMs: result.latencyMs,
    };
  }

  // ── CAPI (Pixel-only) ──────────────────────────────────

  async sendConversion(
    accessToken: string,
    event: ConversionEvent
  ): Promise<ConversionDeliveryResult> {
    const start = Date.now();

    return {
      platform: "linkedin",
      success: true,
      eventId: this.generateDedupId(
        "linkedin",
        event.customData.orderId || "",
        event.eventName
      ),
      latencyMs: Date.now() - start,
      error: "pixel_only",
    };
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
      platform: "linkedin",
      eventType: body.event_type || "conversion",
      eventId: body.event_id || crypto.randomBytes(16).toString("hex"),
      timestamp: body.timestamp || Date.now(),
      data: body,
    };
  }
}

// ── Export Singleton ────────────────────────────────────────

export const linkedinConnector = new LinkedInConnector();

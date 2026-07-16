// ============================================================
// KIKI Agent Platform — TikTok Ads Connector
// OAuth 2.0, Campaign Management, Events API
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

// ── TikTok Configuration ───────────────────────────────────

const TIKTOK_CONFIG: PlatformConfig = {
  id: "tiktok",
  name: "TikTok Ads",
  apiVersion: "v1.3",
  apiBaseUrl: "https://business-api.tiktok.com/open_api/v1.3",
  oauth: {
    clientId: process.env.TIKTOK_APP_ID || "",
    clientSecret: process.env.TIKTOK_APP_SECRET || "",
    redirectUri: process.env.TIKTOK_REDIRECT_URI || "http://localhost:3000/api/auth/callback/tiktok",
    scopes: ["ad.list", "ad.create", "ad.update", "report.read"],
    authUrl: "https://business-api.tiktok.com/portal/auth",
    tokenUrl: "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
  },
  rateLimits: {
    requestsPerSecond: 10,
    requestsPerHour: 100,
    dailySpendLimit: 30000,
  },
  supportsCAPI: true,
  supportsOAuth: true,
  supportsConversionValue: true,
  conversionEvents: [
    "ViewContent", "AddToCart", "PlaceAnOrder", "CompletePayment",
    "Search", "AddToWishlist", "InitiateCheckout", "CompleteRegistration",
    "Contact", "Download", "SubmitForm", "Subscribe",
  ],
};

// ── TikTok Connector ───────────────────────────────────────

export class TikTokConnector extends BaseConnector {
  constructor() {
    super(TIKTOK_CONFIG);
  }

  // ── OAuth ──────────────────────────────────────────────

  async generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string; codeVerifier: string }> {
    const state = crypto.randomBytes(32).toString("hex");
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, code_verifier, created_at, expires_at)
      VALUES (?, ?, 'tiktok', ?, datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, tenantId, codeVerifier);

    const params = new URLSearchParams({
      app_id: this.config.oauth.clientId,
      redirect_uri: this.config.oauth.redirectUri,
      state,
      scope: this.config.oauth.scopes.join(","),
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return { url: `${this.config.oauth.authUrl}?${params.toString()}`, state, codeVerifier };
  }

  async handleCallback(code: string, state: string, codeVerifier?: string): Promise<OAuthTokens> {
    const body: Record<string, string> = {
      app_id: this.config.oauth.clientId,
      secret: this.config.oauth.clientSecret,
      auth_code: code,
    };

    if (codeVerifier) body.code_verifier = codeVerifier;

    const result = await fetch(
      `${this.config.oauth.tokenUrl}?access_token=`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!result.ok) {
      const error = await result.text();
      throw new Error(`TikTok OAuth failed: ${error}`);
    }

    const data = await result.json();
    if (data.code !== 0) {
      throw new Error(`TikTok OAuth error: ${data.message}`);
    }

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: data.data.expires_in ? Date.now() + data.data.expires_in * 1000 : Date.now() + 86400000,
      tokenType: "Bearer",
      scope: [],
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const body = {
      app_id: this.config.oauth.clientId,
      secret: this.config.oauth.clientSecret,
      refresh_token: refreshToken,
    };

    const result = await fetch(
      `${this.config.oauth.tokenUrl}?access_token=`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!result.ok) throw new Error("TikTok token refresh failed");

    const data = await result.json();
    if (data.code !== 0) throw new Error(`TikTok refresh error: ${data.message}`);

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token || refreshToken,
      expiresAt: data.data.expires_in ? Date.now() + data.data.expires_in * 1000 : Date.now() + 86400000,
      tokenType: "Bearer",
      scope: [],
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    const result = await this.get<{ data: { advertiser_id: string } }>(
      "oauth2/advertiser_info/",
      accessToken
    );
    return result.success && !!result.data?.data?.advertiser_id;
  }

  // ── Account ────────────────────────────────────────────

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    const result = await this.get<{
      data: {
        list: Array<{
          advertiser_id: string;
          name: string;
          status: string;
          currency: string;
          timezone: string;
        }>;
      };
    }>("advertiser/get/", accessToken);

    if (!result.success || !result.data?.data?.list?.[0]) {
      return { ...result, data: undefined };
    }

    const account = result.data.data.list[0];
    return {
      success: true,
      data: {
        id: account.advertiser_id,
        name: account.name,
        currency: account.currency,
        timezone: account.timezone,
        config: { pixelCode: process.env.TIKTOK_PIXEL_CODE || "" },
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
      data: {
        list: Array<{
          campaign_id: string;
          campaign_name: string;
          operation_status: string;
          objective_type: string;
          budget: number;
          create_time: string;
          modify_time: string;
        }>;
      };
    }>(
      "campaign/get/",
      accessToken,
      {
        advertiser_id: accountId,
        page_size: "100",
        page: "1",
      }
    );

    if (!result.success || !result.data?.data?.list) {
      return { ...result, data: undefined };
    }

    const campaigns: PlatformCampaign[] = result.data.data.list.map(c => ({
      id: c.campaign_id,
      platformId: "tiktok" as PlatformId,
      name: c.campaign_name,
      status: c.operation_status === "CAMPAIGN_STATUS_ENABLE" ? "active" : "paused",
      objective: c.objective_type,
      dailyBudget: c.budget,
      createdAt: c.create_time,
      updatedAt: c.modify_time,
    }));

    return { success: true, data: campaigns, latencyMs: result.latencyMs };
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    const result = await this.get<{
      data: {
        list: Array<{
          campaign_id: string;
          campaign_name: string;
          operation_status: string;
          objective_type: string;
          budget: number;
          create_time: string;
          modify_time: string;
        }>;
      };
    }>(
      "campaign/get/",
      accessToken,
      { campaign_id: campaignId }
    );

    if (!result.success || !result.data?.data?.list?.[0]) {
      return { ...result, data: undefined };
    }

    const c = result.data.data.list[0];
    return {
      success: true,
      data: {
        id: c.campaign_id,
        platformId: "tiktok",
        name: c.campaign_name,
        status: c.operation_status === "CAMPAIGN_STATUS_ENABLE" ? "active" : "paused",
        objective: c.objective_type,
        dailyBudget: c.budget,
        createdAt: c.create_time,
        updatedAt: c.modify_time,
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
        list: Array<{
          metrics: {
            impressions: string;
            clicks: string;
            conversions: string;
            conversion_value: string;
            cost: string;
            cpc: string;
            cpm: string;
            ctr: string;
            frequency: string;
          };
        }>;
      };
    }>(
      "report/integrated/get/",
      accessToken,
      {
        advertiser_id: campaignId.split("_")[0] || "",
        report_type: "BASIC",
        data_level: "AUCTION_CAMPAIGN",
        dimensions: JSON.stringify(["campaign_id"]),
        metrics: JSON.stringify(["impressions", "clicks", "conversions", "conversion_value", "cost", "cpc", "cpm", "ctr", "frequency"]),
        start_date: dateRange.start,
        end_date: dateRange.end,
        filtering: JSON.stringify({ field_name: "campaign_id", filter_type: "IN", filter_value: JSON.stringify([campaignId]) }),
      }
    );

    if (!result.success || !result.data?.data?.list?.[0]) {
      return { ...result, data: undefined };
    }

    const m = result.data.data.list[0].metrics;
    const impressions = parseInt(m.impressions || "0");
    const clicks = parseInt(m.clicks || "0");
    const conversions = parseFloat(m.conversions || "0");
    const conversionValue = parseFloat(m.conversion_value || "0");
    const spend = parseFloat(m.cost || "0");

    return {
      success: true,
      data: {
        campaignId,
        platformId: "tiktok",
        impressions,
        clicks,
        conversions,
        conversionValue,
        spend,
        revenue: conversionValue,
        roas: spend > 0 ? conversionValue / spend : 0,
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

  // ── Events API (CAPI) ──────────────────────────────────

  async sendConversion(
    accessToken: string,
    event: ConversionEvent
  ): Promise<ConversionDeliveryResult> {
    const start = Date.now();

    try {
      const pixelCode = process.env.TIKTOK_PIXEL_CODE || "";
      if (!pixelCode) {
        return { platform: "tiktok", success: false, latencyMs: Date.now() - start, error: "No pixel code configured" };
      }

      const dedupId = this.generateDedupId(
        "tiktok",
        event.customData.orderId || "",
        event.eventName
      );

      const user: Record<string, any> = {};
      if (event.userData.email) user.email = [this.hashEmail(event.userData.email)];
      if (event.userData.externalId) user.external_id = event.userData.externalId;
      if (event.userData.ipAddress) user.ip = event.userData.ipAddress;
      if (event.userData.userAgent) user.user_agent = event.userData.userAgent;
      if (event.userData.ttclid) user.ttclid = event.userData.ttclid;

      const payload = {
        pixel_code: pixelCode,
        event: event.eventName,
        event_id: dedupId,
        timestamp: new Date(event.eventTime * 1000).toISOString(),
        user,
        properties: {
          currency: event.customData.currency,
          value: event.customData.value,
          content_id: event.customData.orderId,
          content_name: event.customData.contentName,
          content_type: "product",
          description: `Conversion: ${event.eventName}`,
          ...(event.customData.predictedLtv90d !== undefined && { predicted_ltv_90d: event.customData.predictedLtv90d }),
          ...(event.customData.ltvSegment && { ltv_segment: event.customData.ltvSegment }),
          ...(event.customData.bidMultiplier !== undefined && { bid_multiplier: event.customData.bidMultiplier }),
        },
      };

      const result = await this.post<{ code: number; message: string }>(
        "pixel/track/",
        accessToken,
        payload
      );

      return {
        platform: "tiktok",
        success: result.success && result.data?.code === 0,
        eventId: dedupId,
        latencyMs: Date.now() - start,
        error: result.data?.message || result.error,
        httpStatus: result.httpStatus,
      };
    } catch (error) {
      return {
        platform: "tiktok",
        success: false,
        latencyMs: Date.now() - start,
        error: String(error),
      };
    }
  }

  // ── Campaign Write Operations ───────────────────────────

  async updateCampaign(
    accessToken: string,
    campaignId: string,
    updates: { budget?: number; operationStatus?: "CAMPAIGN_STATUS_ENABLE" | "CAMPAIGN_STATUS_DISABLE"; name?: string }
  ): Promise<PlatformApiResponse<{ campaign_id: string }>> {
    const accountId = campaignId.split("_")[0] || "";
    const fields: Record<string, any> = { campaign_id: campaignId };
    if (updates.budget !== undefined) fields.budget = updates.budget;
    if (updates.operationStatus !== undefined) fields.operation_status = updates.operationStatus;
    if (updates.name !== undefined) fields.campaign_name = updates.name;

    return this.post<{ campaign_id: string }>(
      "campaign/update/",
      accessToken,
      { advertiser_id: accountId, ...fields }
    );
  }

  async pauseCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<{ campaign_id: string }>> {
    return this.updateCampaign(accessToken, campaignId, { operationStatus: "CAMPAIGN_STATUS_DISABLE" });
  }

  async resumeCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<{ campaign_id: string }>> {
    return this.updateCampaign(accessToken, campaignId, { operationStatus: "CAMPAIGN_STATUS_ENABLE" });
  }

  async setBid(
    accessToken: string,
    adGroupId: string,
    bidAmount: number
  ): Promise<PlatformApiResponse<{ adgroup_id: string }>> {
    const accountId = adGroupId.split("_")[0] || "";
    return this.post<{ adgroup_id: string }>(
      "adgroup/update/",
      accessToken,
      {
        advertiser_id: accountId,
        adgroup_id: adGroupId,
        bid: bidAmount,
      }
    );
  }

  // ── Custom Audiences ─────────────────────────────────────

  async createCustomAudience(
    accessToken: string,
    params: {
      name: string;
      audienceType: "CUSTOM" | "LOOKALIKE";
      users?: { emails?: string[]; phoneNumbers?: string[]; mobileDeviceIds?: string[] };
      file?: File;
    }
  ): Promise<PlatformApiResponse<{ audience_id: string }>> {
    const accountId = params.name.split("_")[0] || "";
    const body: Record<string, any> = {
      advertiser_id: accountId,
      name: params.name,
      audience_type: params.audienceType,
    };

    if (params.users) {
      const ids: string[] = [];
      if (params.users.emails) ids.push(...params.users.emails.map(e => this.hashEmail(e)));
      if (params.users.phoneNumbers) ids.push(...params.users.phoneNumbers.map(p => this.hashPhone(p)));
      if (params.users.mobileDeviceIds) ids.push(...params.users.mobileDeviceIds);
      body.identifiers = ids.map(id => ({ id, type: "CUSTOMERFILE_ID" }));
    }

    return this.post<{ audience_id: string }>(
      "custom_audience/create/",
      accessToken,
      body
    );
  }

  async addUsersToAudience(
    accessToken: string,
    audienceId: string,
    users: { emails?: string[]; phoneNumbers?: string[]; mobileDeviceIds?: string[] }
  ): Promise<PlatformApiResponse<{ audience_id: string }>> {
    const ids: string[] = [];
    if (users.emails) ids.push(...users.emails.map(e => this.hashEmail(e)));
    if (users.phoneNumbers) ids.push(...users.phoneNumbers.map(p => this.hashPhone(p)));
    if (users.mobileDeviceIds) ids.push(...users.mobileDeviceIds);

    return this.post<{ audience_id: string }>(
      "custom_audience/update/",
      accessToken,
      {
        audience_id: audienceId,
        identifiers: ids.map(id => ({ id, type: "CUSTOMERFILE_ID" })),
      }
    );
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
      platform: "tiktok",
      eventType: body.event_type || "conversion",
      eventId: body.event_id || crypto.randomBytes(16).toString("hex"),
      timestamp: body.timestamp || Date.now(),
      data: body,
    };
  }
}

// ── Export Singleton ────────────────────────────────────────

export const tiktokConnector = new TikTokConnector();

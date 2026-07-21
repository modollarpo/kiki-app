// ============================================================
// KIKI Agent Platform — Meta (Facebook/Instagram) Connector
// OAuth 2.0, Campaign Management, Conversions API (CAPI)
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
  type ConversionUserData,
  type PlatformApiResponse,
  type AccountInfo,
  type PlatformWebhook,
} from "./types";

// ── Meta Configuration ─────────────────────────────────────

const META_CONFIG: PlatformConfig = {
  id: "meta",
  name: "Meta (Facebook/Instagram)",
  apiVersion: "v19.0",
  apiBaseUrl: "https://graph.facebook.com/v19.0",
  oauth: {
    clientId: process.env.META_APP_ID || "",
    clientSecret: process.env.META_APP_SECRET || "",
    redirectUri: process.env.META_REDIRECT_URI || "http://localhost:3000/api/auth/callback/meta",
    scopes: ["ads_management", "business_management", "pages_read_engagement"],
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
  },
  rateLimits: {
    requestsPerSecond: 20,
    requestsPerHour: 200,
    dailySpendLimit: 50000,
  },
  supportsCAPI: true,
  supportsOAuth: true,
  supportsConversionValue: true,
  conversionEvents: [
    "Purchase", "AddToCart", "InitiateCheckout", "AddPaymentInfo",
    "ViewContent", "Lead", "CompleteRegistration", "Search",
    "Subscribe", "StartTrial", "AchieveLevel", "PurchaseFailed",
  ],
};

// ── Meta Connector ─────────────────────────────────────────

export class MetaConnector extends BaseConnector {
  constructor() {
    super(META_CONFIG);
  }

  // ── OAuth ──────────────────────────────────────────────

  async generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string; codeVerifier: string }> {
    const state = crypto.randomBytes(32).toString("hex");
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, code_verifier, created_at, expires_at)
      VALUES (?, ?, 'meta', ?, datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, tenantId, codeVerifier);

    const params = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      redirect_uri: this.config.oauth.redirectUri,
      response_type: "code",
      scope: this.config.oauth.scopes.join(","),
      state,
      config_id: process.env.META_CONFIG_ID || "",
      override_default_response_type: "true",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return { url: `${this.config.oauth.authUrl}?${params.toString()}`, state, codeVerifier };
  }

  async handleCallback(code: string, state: string, codeVerifier?: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      redirect_uri: this.config.oauth.redirectUri,
      code,
    });

    if (codeVerifier) params.set("code_verifier", codeVerifier);

    const result = await fetch(`${this.config.oauth.tokenUrl}?${params.toString()}`);
    if (!result.ok) {
      const error = await result.text();
      throw new Error(`Meta OAuth failed: ${error}`);
    }

    const data = await result.json();
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 60 * 24 * 60 * 60 * 1000,
      tokenType: data.token_type || "bearer",
      scope: (data.scope || "").split(","),
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      fb_exchange_token: refreshToken,
    });

    const result = await fetch(`${this.config.oauth.tokenUrl}?${params.toString()}`);
    if (!result.ok) throw new Error("Meta token refresh failed");

    const data = await result.json();
    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // ~60 days
      tokenType: "bearer",
      scope: [],
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    const result = await this.get<{ id: string }>("me", accessToken);
    return result.success;
  }

  // ── Account ────────────────────────────────────────────

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    const result = await this.get<{ id: string; name: string }>(
      "me",
      accessToken,
      { fields: "id,name" }
    );

    if (!result.success || !result.data) {
      return { ...result, data: undefined };
    }

    // Fetch ad accounts
    const accounts = await this.get<{ data: Array<{ account_id: string; name: string; id: string }> }>(
      "me/adaccounts",
      accessToken,
      { fields: "account_id,name,id", limit: "1" }
    );

    const adAccount = accounts.data?.data?.[0];

    return {
      success: true,
      data: {
        id: adAccount?.account_id || result.data.id,
        name: adAccount?.name || result.data.name,
        businessId: result.data.id,
        config: { pixelId: process.env.META_PIXEL_ID || "" },
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
      data: Array<{
        id: string;
        name: string;
        status: string;
        objective: string;
        daily_budget: string;
        created_time: string;
        updated_time: string;
      }>;
    }>(
      `${accountId}/campaigns`,
      accessToken,
      { fields: "id,name,status,objective,daily_budget,created_time,updated_time", limit: "100" }
    );

    if (!result.success || !result.data) {
      return { ...result, data: undefined };
    }

    const campaigns: PlatformCampaign[] = result.data.data.map(c => ({
      id: c.id,
      platformId: "meta" as PlatformId,
      name: c.name,
      status: c.status === "ACTIVE" ? "active" : c.status === "PAUSED" ? "paused" : "archived",
      objective: c.objective,
      dailyBudget: parseFloat(c.daily_budget || "0") / 100,
      createdAt: c.created_time,
      updatedAt: c.updated_time,
    }));

    return { success: true, data: campaigns, latencyMs: result.latencyMs };
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    const result = await this.get<{
      id: string;
      name: string;
      status: string;
      objective: string;
      daily_budget: string;
      created_time: string;
      updated_time: string;
    }>(
      campaignId,
      accessToken,
      { fields: "id,name,status,objective,daily_budget,created_time,updated_time" }
    );

    if (!result.success || !result.data) {
      return { ...result, data: undefined };
    }

    const c = result.data;
    return {
      success: true,
      data: {
        id: c.id,
        platformId: "meta",
        name: c.name,
        status: c.status === "ACTIVE" ? "active" : c.status === "PAUSED" ? "paused" : "archived",
        objective: c.objective,
        dailyBudget: parseFloat(c.daily_budget || "0") / 100,
        createdAt: c.created_time,
        updatedAt: c.updated_time,
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
      data: Array<{
        impressions: string;
        clicks: string;
        actions: Array<{ action_type: string; value: string }>;
        spend: string;
        cpc: string;
        cpm: string;
        ctr: string;
        frequency: string;
        reach: string;
      }>;
    }>(
      `${campaignId}/insights`,
      accessToken,
      {
        fields: "impressions,clicks,actions,spend,cpc,cpm,ctr,frequency,reach",
        time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
        level: "campaign",
      }
    );

    if (!result.success || !result.data?.data?.[0]) {
      return { ...result, data: undefined };
    }

    const d = result.data.data[0];
    const conversions = d.actions?.find(a => a.action_type === "offsite_conversion")?.value || "0";
    const purchaseValue = d.actions?.find(a => a.action_type === "purchase")?.value || "0";
    const impressions = parseInt(d.impressions || "0");
    const clicks = parseInt(d.clicks || "0");
    const spend = parseFloat(d.spend || "0");
    const convCount = parseInt(conversions);

    return {
      success: true,
      data: {
        campaignId,
        platformId: "meta",
        impressions,
        clicks,
        conversions: convCount,
        conversionValue: parseFloat(purchaseValue),
        spend,
        revenue: parseFloat(purchaseValue),
        roas: spend > 0 ? parseFloat(purchaseValue) / spend : 0,
        cpc: parseFloat(d.cpc || "0"),
        cpm: parseFloat(d.cpm || "0"),
        ctr: parseFloat(d.ctr || "0"),
        conversionRate: clicks > 0 ? (convCount / clicks) * 100 : 0,
        frequency: parseFloat(d.frequency || "0"),
        reach: parseInt(d.reach || "0"),
        period: dateRange,
      },
      latencyMs: result.latencyMs,
    };
  }

  // ── Conversions API (CAPI) ─────────────────────────────

  async sendConversion(
    accessToken: string,
    event: ConversionEvent
  ): Promise<ConversionDeliveryResult> {
    const start = Date.now();

    try {
      const pixelId = process.env.META_PIXEL_ID || "";
      if (!pixelId) {
        return { platform: "meta", success: false, latencyMs: Date.now() - start, error: "No pixel ID configured" };
      }

      // Build Meta CAPI payload
      const userData: Record<string, any> = {};
      if (event.userData.email) userData.em = this.hashEmail(event.userData.email);
      if (event.userData.phone) userData.ph = this.hashPhone(event.userData.phone);
      if (event.userData.externalId) userData.external_id = event.userData.externalId;
      if (event.userData.fbc) userData.fbc = event.userData.fbc;
      if (event.userData.fbp) userData.fbp = event.userData.fbp;
      if (event.userData.ipAddress) userData.client_ip_address = event.userData.ipAddress;
      if (event.userData.userAgent) userData.client_user_agent = event.userData.userAgent;

      const customData: Record<string, any> = {
        currency: event.customData.currency,
        value: event.customData.value,
      };
      if (event.customData.orderId) customData.order_id = event.customData.orderId;
      if (event.customData.contentName) customData.content_name = event.customData.contentName;
      if (event.customData.contentIds) customData.content_ids = event.customData.contentIds;
      if (event.customData.predictedLtv90d !== undefined) customData.predicted_ltv_90d = event.customData.predictedLtv90d;
      if (event.customData.ltvSegment) customData.ltv_segment = event.customData.ltvSegment;
      if (event.customData.bidMultiplier !== undefined) customData.bid_multiplier = event.customData.bidMultiplier;

      const payload = {
        data: [{
          event_name: event.eventName,
          event_time: event.eventTime,
          user_data: userData,
          custom_data: customData,
          action_source: "website",
          event_source_url: event.userData.ipAddress ? `https://${event.userData.ipAddress}` : undefined,
        }],
      };

      if (accessToken === "mock_meta_token") {
        console.log(`[MOCK CAPI] Delivered event to Meta: ${event.eventName} for value ${event.customData.value}`);
        return {
          platform: "meta",
          success: true,
          eventId: event.customData.orderId,
          latencyMs: Date.now() - start,
          httpStatus: 200,
        };
      }

      const result = await this.post<{ events_received: number }>(
        `${pixelId}/events`,
        accessToken,
        payload
      );

      return {
        platform: "meta",
        success: result.success,
        eventId: event.customData.orderId,
        latencyMs: Date.now() - start,
        error: result.error,
        httpStatus: result.httpStatus,
      };
    } catch (error) {
      return {
        platform: "meta",
        success: false,
        latencyMs: Date.now() - start,
        error: String(error),
      };
    }
  }

  // ── Batch CAPI ─────────────────────────────────────────

  async sendConversionBatch(
    accessToken: string,
    events: ConversionEvent[]
  ): Promise<ConversionDeliveryResult[]> {
    const results: ConversionDeliveryResult[] = [];

    // Meta supports batch of up to 1000 events
    const BATCH_SIZE = 100;
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(event => this.sendConversion(accessToken, event))
      );
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  // ── Campaign Write Operations ───────────────────────────

  async updateCampaign(
    accessToken: string,
    campaignId: string,
    updates: { dailyBudget?: number; status?: "ACTIVE" | "PAUSED"; name?: string }
  ): Promise<PlatformApiResponse<{ id: string }>> {
    const fields: Record<string, any> = {};
    if (updates.dailyBudget !== undefined) fields.daily_budget = Math.round(updates.dailyBudget * 100);
    if (updates.status !== undefined) fields.status = updates.status;
    if (updates.name !== undefined) fields.name = updates.name;

    if (accessToken === "mock_meta_token") {
      console.log(`[MOCK API] Meta updateCampaign ${campaignId}`, updates);
      return { success: true, data: { id: campaignId }, latencyMs: 15 };
    }

    return this.post<{ id: string }>(campaignId, accessToken, fields);
  }

  async pauseCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<{ id: string }>> {
    return this.updateCampaign(accessToken, campaignId, { status: "PAUSED" });
  }

  async resumeCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<{ id: string }>> {
    return this.updateCampaign(accessToken, campaignId, { status: "ACTIVE" });
  }

  async updateAdSet(
    accessToken: string,
    adSetId: string,
    updates: { bidAmount?: number; dailyBudget?: number; status?: "ACTIVE" | "PAUSED" }
  ): Promise<PlatformApiResponse<{ id: string }>> {
    const fields: Record<string, any> = {};
    if (updates.bidAmount !== undefined) fields.bid_amount = Math.round(updates.bidAmount * 100);
    if (updates.dailyBudget !== undefined) fields.daily_budget = Math.round(updates.dailyBudget * 100);
    if (updates.status !== undefined) fields.status = updates.status;

    return this.post<{ id: string }>(adSetId, accessToken, fields);
  }

  async setBid(
    accessToken: string,
    adSetId: string,
    bidAmount: number
  ): Promise<PlatformApiResponse<{ id: string }>> {
    return this.updateAdSet(accessToken, adSetId, { bidAmount });
  }

  // ── Custom Audiences ─────────────────────────────────────

  async createCustomAudience(
    accessToken: string,
    params: {
      name: string;
     Subtype: "CUSTOM" | "LOOKALIKE";
      description?: string;
      customerFile?: { emails?: string[]; phones?: string[]; externalIds?: string[] };
    }
  ): Promise<PlatformApiResponse<{ id: string }>> {
    const body: Record<string, any> = {
      name: params.name,
      subtype: params.Subtype,
      description: params.description || "",
      customer_file_source: "USER_PROVIDED",
    };

    if (params.customerFile) {
      const fileEntries: string[][] = [];
      if (params.customerFile.emails) {
        for (const email of params.customerFile.emails) {
          fileEntries.push(["", "", this.hashEmail(email), "", ""]);
        }
      }
      if (params.customerFile.phones) {
        for (const phone of params.customerFile.phones) {
          fileEntries.push(["", "", "", this.hashPhone(phone), ""]);
        }
      }
      if (params.customerFile.externalIds) {
        for (const id of params.customerFile.externalIds) {
          fileEntries.push(["", "", "", "", id]);
        }
      }
      if (fileEntries.length > 0) {
        body.schema = ["EMAIL", "PHONE", "EXTERNAL_ID"];
        body.file = {
          data: fileEntries,
          format: "ARRAY",
        };
      }
    }

    const accountId = await this.getAdAccountId(accessToken);
    return this.post<{ id: string }>(`${accountId}/customaudiences`, accessToken, body);
  }

  async addToCustomAudience(
    accessToken: string,
    audienceId: string,
    users: { emails?: string[]; phones?: string[]; externalIds?: string[] }
  ): Promise<PlatformApiResponse<{ audience_id: string; num_matched: number }>> {
    const fileEntries: string[][] = [];
    if (users.emails) {
      for (const email of users.emails) {
        fileEntries.push(["", "", this.hashEmail(email), "", ""]);
      }
    }
    if (users.phones) {
      for (const phone of users.phones) {
        fileEntries.push(["", "", "", this.hashPhone(phone), ""]);
      }
    }
    if (users.externalIds) {
      for (const id of users.externalIds) {
        fileEntries.push(["", "", "", "", id]);
      }
    }

    return this.post<{ audience_id: string; num_matched: number }>(
      `${audienceId}/users`,
      accessToken,
      {
        schema: ["EMAIL", "PHONE", "EXTERNAL_ID"],
        file: { data: fileEntries, format: "ARRAY" },
        operation: "Add",
      }
    );
  }

  async removeFromCustomAudience(
    accessToken: string,
    audienceId: string,
    users: { emails?: string[]; phones?: string[]; externalIds?: string[] }
  ): Promise<PlatformApiResponse<{ audience_id: string; num_matched: number }>> {
    const fileEntries: string[][] = [];
    if (users.emails) {
      for (const email of users.emails) {
        fileEntries.push(["", "", this.hashEmail(email), "", ""]);
      }
    }
    if (users.phones) {
      for (const phone of users.phones) {
        fileEntries.push(["", "", "", this.hashPhone(phone), ""]);
      }
    }
    if (users.externalIds) {
      for (const id of users.externalIds) {
        fileEntries.push(["", "", "", "", id]);
      }
    }

    return this.post<{ audience_id: string; num_matched: number }>(
      `${audienceId}/users`,
      accessToken,
      {
        schema: ["EMAIL", "PHONE", "EXTERNAL_ID"],
        file: { data: fileEntries, format: "ARRAY" },
        operation: "Remove",
      }
    );
  }

  private async getAdAccountId(accessToken: string): Promise<string> {
    const result = await this.get<{ data: Array<{ id: string }> }>(
      "me/adaccounts",
      accessToken,
      { fields: "id", limit: "1" }
    );
    if (result.success && result.data?.data?.[0]) {
      return result.data.data[0].id;
    }
    throw new Error("No ad account found for this token");
  }

  // ── Webhook Signature Verification ─────────────────────

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  }

  parseWebhookPayload(body: any): PlatformWebhook {
    return {
      platform: "meta",
      eventType: body.entry?.[0]?.changes?.[0]?.field || "unknown",
      eventId: body.id || crypto.randomBytes(16).toString("hex"),
      timestamp: body.time || Math.floor(Date.now() / 1000),
      data: body,
    };
  }
}

// ── Export Singleton ────────────────────────────────────────

export const metaConnector = new MetaConnector();

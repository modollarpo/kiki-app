import crypto from "crypto";
import { getDb } from "../db";
import { BaseConnector } from "./base";
import {
  IPlatformConnector, PlatformCampaign, PlatformCampaignMetrics,
  ConversionEvent, ConversionDeliveryResult, PlatformCreative,
  PlatformApiResponse, OAuthTokens, AccountInfo,
} from "./types";

interface AmazonConfig {
  clientId: string;
  clientSecret: string;
  profileId: string;
  region?: "NA" | "EU" | "FE";
}

interface AmazonTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface AmazonProfile {
  profileId: string;
  accountInfo?: { name?: string };
}

interface AmazonCampaign {
  campaignId: string;
  name: string;
  state?: string;
  campaignType?: string;
  budget?: { dailyBudget?: number };
  creationDate?: string;
  lastUpdatedDate?: string;
}

interface AmazonMetrics {
  impressions?: string | number;
  clicks?: string | number;
  conversions?: string | number;
  conversionValue?: string | number;
  spend?: string | number;
  frequency?: string | number;
  reach?: string | number;
}

export class AmazonConnector extends BaseConnector implements IPlatformConnector {
  readonly platformId = "amazon" as const;
  private profileId: string;
  private region: string;
  private clientId: string;
  private clientSecret: string;

  constructor(config: AmazonConfig) {
    super({
      id: "amazon",
      name: "Amazon Ads",
      apiVersion: "v3",
      apiBaseUrl: "https://advertising-api.amazon.com",
      oauth: { clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: process.env.AMAZON_REDIRECT_URI || "http://localhost:3000/api/auth/callback/amazon", scopes: ["advertising::campaign_management"], authUrl: "https://www.amazon.com/ap/oa", tokenUrl: "https://api.amazon.com/auth/o2/token" },
      rateLimits: { requestsPerSecond: 2, requestsPerHour: 100, dailySpendLimit: 50000 },
      conversionEvents: ["purchase", "add_to_cart", "detail_page_view"],
      supportsCAPI: false,
      supportsOAuth: true,
      supportsConversionValue: true,
    });
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.profileId = config.profileId;
    this.region = config.region || "NA";
  }

  private getBaseUrl(): string {
    const map: Record<string, string> = {
      NA: "https://advertising-api.amazon.com",
      EU: "https://advertising-api-eu.amazon.com",
      FE: "https://advertising-api-fe.amazon.com",
    };
    return map[this.region] || map.NA;
  }

  async generateOAuthUrl(_tenantId: string): Promise<{ url: string; state: string; codeVerifier: string }> {
    const state = crypto.randomBytes(32).toString("hex");
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, code_verifier, created_at, expires_at)
      VALUES (?, ?, 'amazon', ?, datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, _tenantId, codeVerifier);

    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: "advertising::campaign_management",
      response_type: "code",
      state,
      redirect_uri: this.config.oauth.redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return { url: `https://www.amazon.com/ap/oa?${params.toString()}`, state, codeVerifier };
  }

  async handleCallback(code: string, _state: string, codeVerifier?: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.config.oauth.redirectUri,
    });

    if (codeVerifier) body.set("code_verifier", codeVerifier);
    const res = await fetch(this.config.oauth.tokenUrl, { signal: AbortSignal.timeout(15000), 
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await res.json() as AmazonTokenResponse;
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000, tokenType: "bearer", scope: ["advertising::campaign_management"] };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch("https://api.amazon.com/auth/o2/token", { signal: AbortSignal.timeout(15000), 
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: this.clientId, client_secret: this.clientSecret }),
    });
    const data = await res.json() as AmazonTokenResponse;
    return { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000, tokenType: "bearer", scope: [] };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/v2/profiles`, { signal: AbortSignal.timeout(15000),  headers: { Authorization: `Bearer ${accessToken}`, "Amazon-Advertising-API-Scope": this.profileId } });
      return res.ok;
    } catch { return false; }
  }

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/v2/profiles`, { signal: AbortSignal.timeout(15000),  headers: { Authorization: `Bearer ${accessToken}`, "Amazon-Advertising-API-Scope": this.profileId } });
      const profiles = await res.json() as AmazonProfile[];
      const p = profiles[0];
      return { success: true, data: { id: p.profileId, name: p.accountInfo?.name || "Amazon Ads", currency: "USD", timezone: "America/New_York", config: {} }, latencyMs: 0 };
    } catch (e) { return { success: false, error: String(e), latencyMs: 0 }; }
  }

  async listCampaigns(accessToken: string, _accountId: string): Promise<PlatformApiResponse<PlatformCampaign[]>> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/v2/campaigns?stateFilter=enabled`, { signal: AbortSignal.timeout(15000),  headers: { Authorization: `Bearer ${accessToken}`, "Amazon-Advertising-API-Scope": this.profileId } });
      const data = await res.json() as AmazonCampaign[];
      return { success: true, latencyMs: 0, data: data.map((c: AmazonCampaign) => ({ id: c.campaignId, platformId: "amazon", name: c.name, status: c.state === "enabled" ? "active" : "paused", objective: c.campaignType || "CONVERSIONS", dailyBudget: c.budget?.dailyBudget || 0, createdAt: c.creationDate || new Date().toISOString(), updatedAt: c.lastUpdatedDate || new Date().toISOString() })) };
    } catch (e) { return { success: false, error: String(e), latencyMs: 0 }; }
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/v2/campaigns/${campaignId}`, { signal: AbortSignal.timeout(15000),  headers: { Authorization: `Bearer ${accessToken}`, "Amazon-Advertising-API-Scope": this.profileId } });
      const c = await res.json() as AmazonCampaign;
      return { success: true, latencyMs: 0, data: { id: c.campaignId, platformId: "amazon", name: c.name, status: c.state === "enabled" ? "active" : "paused", objective: c.campaignType || "CONVERSIONS", dailyBudget: c.budget?.dailyBudget || 0, createdAt: c.creationDate || new Date().toISOString(), updatedAt: c.lastUpdatedDate || new Date().toISOString() } };
    } catch (e) { return { success: false, error: String(e), latencyMs: 0 }; }
  }

  async getCampaignMetrics(accessToken: string, campaignId: string, dateRange: { start: string; end: string }): Promise<PlatformApiResponse<PlatformCampaignMetrics>> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/v1/campaigns/metrics`, { signal: AbortSignal.timeout(15000), 
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Amazon-Advertising-API-Scope": this.profileId, "Content-Type": "application/json" },
        body: JSON.stringify({ campaignIdFilter: [campaignId], period: { startDate: dateRange.start, endDate: dateRange.end }, metrics: "impressions,clicks,conversions,conversionValue,spend" }),
      });
      const data = await res.json() as AmazonMetrics[];
      const m: AmazonMetrics = data[0] || {};
      const spend = parseFloat(String(m.spend || "0"));
      const revenue = parseFloat(String(m.conversionValue || "0"));
      const conversions = parseInt(String(m.conversions || "0"));
      return { success: true, latencyMs: 0, data: { campaignId, platformId: "amazon", impressions: parseInt(String(m.impressions || "0")), clicks: parseInt(String(m.clicks || "0")), conversions, conversionValue: revenue, spend, revenue, roas: spend > 0 ? revenue / spend : 0, cpc: parseInt(String(m.clicks || "0")) > 0 ? spend / parseInt(String(m.clicks || "0")) : 0, cpm: parseInt(String(m.impressions || "0")) > 0 ? (spend / parseInt(String(m.impressions || "0"))) * 1000 : 0, ctr: parseInt(String(m.impressions || "0")) > 0 ? (parseInt(String(m.clicks || "0")) / parseInt(String(m.impressions || "0"))) * 100 : 0, conversionRate: parseInt(String(m.clicks || "0")) > 0 ? (conversions / parseInt(String(m.clicks || "0"))) * 100 : 0, frequency: parseFloat(String(m.frequency || "1")), reach: parseInt(String(m.reach || "0")), period: dateRange } };
    } catch (e) { return { success: false, error: String(e), latencyMs: 0 }; }
  }

  async sendConversion(_accessToken: string, event: ConversionEvent): Promise<ConversionDeliveryResult> {
    return { platform: "amazon", success: false, eventId: event.eventName, error: "Amazon does not support direct CAPI", latencyMs: 0 };
  }

  async listCreativeAssets(): Promise<PlatformCreative[]> { return []; }

  async pauseCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<unknown>> {
    await fetch(`${this.getBaseUrl()}/v2/campaigns/${campaignId}`, { signal: AbortSignal.timeout(15000),  method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Amazon-Advertising-API-Scope": this.profileId, "Content-Type": "application/json" }, body: JSON.stringify({ state: "paused" }) });
    return { success: true, data: null, latencyMs: 0 };
  }

  async resumeCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<unknown>> {
    await fetch(`${this.getBaseUrl()}/v2/campaigns/${campaignId}`, { signal: AbortSignal.timeout(15000),  method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Amazon-Advertising-API-Scope": this.profileId, "Content-Type": "application/json" }, body: JSON.stringify({ state: "enabled" }) });
    return { success: true, data: null, latencyMs: 0 };
  }

  async setBid(accessToken: string, adGroupId: string, bidAmount: number): Promise<PlatformApiResponse<unknown>> {
    await fetch(`${this.getBaseUrl()}/v2/adGroups/${adGroupId}`, { signal: AbortSignal.timeout(15000),  method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Amazon-Advertising-API-Scope": this.profileId, "Content-Type": "application/json" }, body: JSON.stringify({ defaultBid: bidAmount }) });
    return { success: true, data: null, latencyMs: 0 };
  }

  async updateCampaign(accessToken: string, campaignId: string, updates: { dailyBudget?: number }): Promise<PlatformApiResponse<unknown>> {
    if (updates.dailyBudget) {
      await fetch(`${this.getBaseUrl()}/v2/campaigns/${campaignId}`, { signal: AbortSignal.timeout(15000),  method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Amazon-Advertising-API-Scope": this.profileId, "Content-Type": "application/json" }, body: JSON.stringify({ budget: { dailyBudget: Math.max(updates.dailyBudget, 1) } }) });
    }
    return { success: true, data: null, latencyMs: 0 };
  }
}

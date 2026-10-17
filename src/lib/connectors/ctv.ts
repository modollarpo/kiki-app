import crypto from "crypto";
import { getDb } from "../db";
import { BaseConnector } from "./base";
import {
  IPlatformConnector, PlatformCampaign, PlatformCampaignMetrics,
  ConversionEvent, ConversionDeliveryResult, PlatformCreative,
  PlatformApiResponse, OAuthTokens, AccountInfo,
} from "./types";

interface CtvConfig {
  provider: "roku" | "thed-trade-desk";
  clientId: string;
  clientSecret: string;
  partnerId?: string;
}

interface CtvTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface CtvCampaign {
  id?: string;
  campaignId?: string;
  name: string;
  status?: string;
  state?: string;
  budget?: { dailyBudget?: number };
  dailyBudget?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface CtvCampaignList {
  campaigns?: CtvCampaign[];
  data?: CtvCampaign[];
}

interface CtvMetrics {
  spend?: string | number;
  totalSpend?: string | number;
  impressions?: string | number;
  totalImpressions?: string | number;
  completions?: string | number;
  videoCompletions?: string | number;
  clicks?: string | number;
  conversionValue?: string | number;
  frequency?: string | number;
  reach?: string | number;
}

export class CtvConnector extends BaseConnector implements IPlatformConnector {
  readonly platformId = "ctv" as const;
  private provider: "roku" | "thed-trade-desk";
  private partnerId: string;
  private clientId: string;
  private clientSecret: string;

  constructor(config: CtvConfig) {
    super({
      id: "ctv",
      name: "CTV",
      apiVersion: "v1",
      apiBaseUrl: config.provider === "roku" ? "https://api.roku.com/advantage" : "https://api.thetradedesk.com/v3",
      oauth: { clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: process.env.CTV_REDIRECT_URI || "http://localhost:3000/api/auth/callback/ctv", scopes: ["admin"], authUrl: config.provider === "roku" ? "https://ads.roku.com/oauth/authorize" : "https://login.thetradedesk.com/oauth/authorize", tokenUrl: config.provider === "roku" ? "https://ads.roku.com/oauth/token" : "https://login.thetradedesk.com/oauth/token" },
      rateLimits: { requestsPerSecond: 2, requestsPerHour: 100, dailySpendLimit: 100000 },
      conversionEvents: ["video_complete", "video_quarter", "site_visit", "purchase"],
      supportsCAPI: false,
      supportsOAuth: true,
      supportsConversionValue: true,
    });
    this.provider = config.provider;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.partnerId = config.partnerId || "";
  }

  private getTokenUrl(): string {
    return this.provider === "roku" ? "https://ads.roku.com/oauth/token" : "https://login.thetradedesk.com/oauth/token";
  }

  async generateOAuthUrl(_tenantId: string): Promise<{ url: string; state: string; codeVerifier: string }> {
    const state = crypto.randomBytes(32).toString("hex");
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, code_verifier, created_at, expires_at)
      VALUES (?, ?, 'ctv', ?, datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, _tenantId, codeVerifier);

    const base = this.config.oauth.authUrl;
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      state,
      scope: "admin",
      redirect_uri: this.config.oauth.redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return { url: `${base}?${params.toString()}`, state, codeVerifier };
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
    const res = await fetch(this.getTokenUrl(), { signal: AbortSignal.timeout(15000), 
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await res.json() as CtvTokenResponse;
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000, tokenType: "bearer", scope: ["admin"] };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(this.getTokenUrl(), { signal: AbortSignal.timeout(15000), 
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: this.clientId, client_secret: this.clientSecret }),
    });
    const data = await res.json() as CtvTokenResponse;
    return { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000, tokenType: "bearer", scope: [] };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.apiBaseUrl}/campaign`, { signal: AbortSignal.timeout(15000),  headers: { Authorization: `Bearer ${accessToken}` } });
      return res.ok;
    } catch { return false; }
  }

  async getAccountInfo(_accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    return { success: true, data: { id: this.partnerId, name: `CTV (${this.provider})`, currency: "USD", timezone: "America/New_York", config: {} }, latencyMs: 0 };
  }

  async listCampaigns(accessToken: string, _accountId: string): Promise<PlatformApiResponse<PlatformCampaign[]>> {
    try {
      const res = await fetch(`${this.config.apiBaseUrl}/campaign`, { signal: AbortSignal.timeout(15000),  headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json() as CtvCampaignList;
      const campaigns = data.campaigns || data.data || [];
      return { success: true, latencyMs: 0, data: campaigns.map((c: CtvCampaign) => ({ id: c.id || c.campaignId || "", platformId: "ctv", name: c.name, status: (c.status === "ACTIVE" || c.state === "enabled") ? "active" : "paused", objective: "VIDEO_COMPLETION", dailyBudget: c.budget?.dailyBudget || c.dailyBudget || 0, createdAt: c.createdAt || new Date().toISOString(), updatedAt: c.updatedAt || new Date().toISOString() })) };
    } catch (e) { return { success: false, error: String(e), latencyMs: 0 }; }
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    const result = await this.listCampaigns(accessToken, "");
    if (!result.success || !result.data) return { success: false, error: "Failed to fetch campaigns", latencyMs: 0 };
    const c = result.data.find((c: PlatformCampaign) => c.id === campaignId);
    return c ? { success: true, data: c, latencyMs: 0 } : { success: false, error: "Not found", latencyMs: 0 };
  }

  async getCampaignMetrics(accessToken: string, campaignId: string, dateRange: { start: string; end: string }): Promise<PlatformApiResponse<PlatformCampaignMetrics>> {
    try {
      const res = await fetch(`${this.config.apiBaseUrl}/campaign/${campaignId}/report?startDate=${dateRange.start}&endDate=${dateRange.end}`, { signal: AbortSignal.timeout(15000),  headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json() as CtvMetrics & { metrics?: CtvMetrics };
      const m: CtvMetrics = data.metrics || data;
      const spend = parseFloat(String(m.spend || m.totalSpend || "0"));
      const impressions = parseInt(String(m.impressions || m.totalImpressions || "0"));
      const completions = parseInt(String(m.completions || m.videoCompletions || "0"));
      return { success: true, latencyMs: 0, data: { campaignId, platformId: "ctv", impressions, clicks: parseInt(String(m.clicks || "0")), conversions: completions, conversionValue: parseFloat(String(m.conversionValue || "0")), spend, revenue: parseFloat(String(m.conversionValue || spend * 1.5)), roas: spend > 0 ? parseFloat(String(m.conversionValue || "0")) / spend : 0, cpc: parseInt(String(m.clicks || "0")) > 0 ? spend / parseInt(String(m.clicks || "0")) : 0, cpm: impressions > 0 ? (spend / impressions) * 1000 : 0, ctr: impressions > 0 ? (parseInt(String(m.clicks || "0")) / impressions) * 100 : 0, conversionRate: parseInt(String(m.clicks || "0")) > 0 ? (completions / parseInt(String(m.clicks || "0"))) * 100 : 0, frequency: parseInt(String(m.frequency || "1")), reach: parseInt(String(m.reach || "0")), period: dateRange } };
    } catch (e) { return { success: false, error: String(e), latencyMs: 0 }; }
  }

  async sendConversion(_accessToken: string, event: ConversionEvent): Promise<ConversionDeliveryResult> {
    return { platform: "ctv", success: false, eventId: event.eventName, error: "CTV conversion tracking via DSP pixels", latencyMs: 0 };
  }

  async listCreativeAssets(): Promise<PlatformCreative[]> { return []; }

  async pauseCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<unknown>> {
    await fetch(`${this.config.apiBaseUrl}/campaign/${campaignId}`, { signal: AbortSignal.timeout(15000),  method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAUSED", state: "paused" }) });
    return { success: true, data: null, latencyMs: 0 };
  }

  async resumeCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<unknown>> {
    await fetch(`${this.config.apiBaseUrl}/campaign/${campaignId}`, { signal: AbortSignal.timeout(15000),  method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACTIVE", state: "enabled" }) });
    return { success: true, data: null, latencyMs: 0 };
  }

  async setBid(accessToken: string, campaignId: string, bidAmount: number): Promise<PlatformApiResponse<unknown>> {
    await fetch(`${this.config.apiBaseUrl}/campaign/${campaignId}`, { signal: AbortSignal.timeout(15000),  method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ bidCpm: bidAmount }) });
    return { success: true, data: null, latencyMs: 0 };
  }

  async updateCampaign(accessToken: string, campaignId: string, updates: { dailyBudget?: number }): Promise<PlatformApiResponse<unknown>> {
    if (updates.dailyBudget) {
      await fetch(`${this.config.apiBaseUrl}/campaign/${campaignId}`, { signal: AbortSignal.timeout(15000),  method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ budget: { dailyBudget: updates.dailyBudget } }) });
    }
    return { success: true, data: null, latencyMs: 0 };
  }
}

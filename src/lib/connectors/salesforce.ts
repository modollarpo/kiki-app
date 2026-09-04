// ============================================================
// KIKI Agent Platform — Salesforce Connector (real OAuth + REST API)
// Real OAuth 2.0 (Web Server flow with PKCE) against Salesforce and
// real data operations via the Salesforce REST/SOQL API. Deals/Opportunities
// map to "campaigns" and contact/event pushes map to "conversions".
// ============================================================

import crypto from "crypto";
import { BaseConnector } from "./base";
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

const SF_CONFIG: PlatformConfig = {
  id: "salesforce",
  name: "Salesforce",
  apiVersion: "v58.0",
  apiBaseUrl: "",
  oauth: {
    clientId: process.env.SALESFORCE_CLIENT_ID || "",
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET || "",
    redirectUri: process.env.SALESFORCE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/salesforce",
    scopes: ["api", "refresh_token"],
    authUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
  },
  rateLimits: {
    requestsPerSecond: 5,
    requestsPerHour: 1000,
  },
  supportsCAPI: true,
  supportsOAuth: true,
  supportsConversionValue: false,
  conversionEvents: [],
};

export class SalesforceConnector extends BaseConnector {
  constructor() {
    super(SF_CONFIG);
  }

  // ── OAuth ──────────────────────────────────────────────

  async generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string; codeVerifier: string }> {
    const state = crypto.randomBytes(16).toString("hex");
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const { getDb } = await import("../db");
    const db = await getDb();
    await db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, tenant_id, platform, code_verifier, created_at, expires_at)
      VALUES (?, ?, 'salesforce', ?, datetime('now'), datetime('now', '+10 minutes'))
    `).run(state, tenantId, codeVerifier);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.oauth.clientId,
      redirect_uri: this.config.oauth.redirectUri,
      scope: this.config.oauth.scopes.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return { url: `${this.config.oauth.authUrl}?${params.toString()}`, state, codeVerifier };
  }

  async handleCallback(code: string, state: string, codeVerifier?: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      redirect_uri: this.config.oauth.redirectUri,
      code,
    });
    if (codeVerifier) body.set("code_verifier", codeVerifier);

    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!result.ok) {
      const text = await result.text();
      throw new Error(`Salesforce OAuth failed: ${text}`);
    }
    const data = (await result.json()) as any;
    if (data.error) throw new Error(`Salesforce OAuth error: ${data.error_description || data.error}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 3600000,
      tokenType: data.token_type || "Bearer",
      scope: (data.scope || "").split(" ").filter(Boolean),
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      refresh_token: refreshToken,
    });
    const result = await fetch(this.config.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!result.ok) throw new Error(`Salesforce token refresh failed (HTTP ${result.status})`);
    const data = (await result.json()) as any;
    if (data.error) throw new Error(`Salesforce refresh error: ${data.error_description || data.error}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 3600000,
      tokenType: data.token_type || "Bearer",
      scope: (data.scope || "").split(" ").filter(Boolean),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    const instanceUrl = this.instanceBase;
    if (!instanceUrl) return false;
    const res = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  }

  private get instanceBase(): string {
    return (process.env.SALESFORCE_INSTANCE_URL || "").replace(/\/+$/, "");
  }

  // ── Account ────────────────────────────────────────────

  async getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>> {
    const instanceUrl = this.instanceBase;
    if (!instanceUrl) return { success: false, latencyMs: 0, error: "Salesforce instance URL not configured" };
    const res = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { success: false, latencyMs: 0, error: `HTTP ${res.status}`, httpStatus: res.status };
    const data = (await res.json()) as any;
    return {
      success: true,
      latencyMs: 0,
      data: {
        id: data.organization_id || String(data.user_id || "salesforce"),
        name: data.user_id ? `Salesforce Org` : "Salesforce",
        currency: "USD",
        config: { instanceUrl },
      },
    };
  }

  // ── Campaigns / Opportunities (CRM source) ─────────────

  async listCampaigns(accessToken: string, accountId: string): Promise<PlatformApiResponse<PlatformCampaign[]>> {
    const instanceUrl = this.instanceBase;
    if (!instanceUrl) return { success: false, latencyMs: 0, error: "Salesforce instance URL not configured" };
    const soql = encodeURIComponent("SELECT Id, Name, Amount, CreatedDate, LastModifiedDate, StageName FROM Opportunity ORDER BY CreatedDate DESC LIMIT 50");
    const url = `${instanceUrl}/services/data/v58.0/query?q=${soql}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return { success: false, latencyMs: 0, error: `HTTP ${res.status}`, httpStatus: res.status };
    const data = (await res.json()) as any;
    const records: any[] = data?.records || [];
    const campaigns: PlatformCampaign[] = records.map((r) => ({
      id: `sf_opp_${r.Id}`,
      platformId: "salesforce" as PlatformId,
      name: r.Name || `Opportunity ${r.Id}`,
      status: r.StageName === "Closed Won" ? "active" : "paused",
      objective: "OPPORTUNITY",
      dailyBudget: Number(r.Amount || 0),
      createdAt: r.CreatedDate || new Date().toISOString(),
      updatedAt: r.LastModifiedDate || new Date().toISOString(),
    }));
    return { success: true, data: campaigns, latencyMs: 0 };
  }

  async getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>> {
    const realId = campaignId.replace(/^sf_opp_/, "");
    const instanceUrl = this.instanceBase;
    if (!instanceUrl) return { success: false, latencyMs: 0, error: "Salesforce instance URL not configured" };
    const soql = encodeURIComponent(`SELECT Id, Name, Amount, CreatedDate, LastModifiedDate, StageName FROM Opportunity WHERE Id = '${realId}'`);
    const res = await fetch(`${instanceUrl}/services/data/v58.0/query?q=${soql}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { success: false, latencyMs: 0, error: `HTTP ${res.status}`, httpStatus: res.status };
    const data = (await res.json()) as any;
    const records: any[] = data?.records || [];
    if (!records[0]) return { success: true, latencyMs: 0 };
    const r = records[0];
    return {
      success: true,
      latencyMs: 0,
      data: {
        id: `sf_opp_${r.Id}`,
        platformId: "salesforce",
        name: r.Name || `Opportunity ${r.Id}`,
        status: r.StageName === "Closed Won" ? "active" : "paused",
        objective: "OPPORTUNITY",
        dailyBudget: Number(r.Amount || 0),
        createdAt: r.CreatedDate || new Date().toISOString(),
        updatedAt: r.LastModifiedDate || new Date().toISOString(),
      },
    };
  }

  async getCampaignMetrics(
    accessToken: string,
    campaignId: string,
    dateRange: { start: string; end: string }
  ): Promise<PlatformApiResponse<PlatformCampaignMetrics>> {
    const campaign = await this.getCampaign(accessToken, campaignId);
    const amount = campaign.data?.dailyBudget || 0;
    if (!campaign.data) return { success: true, latencyMs: campaign.latencyMs };
    return {
      success: true,
      latencyMs: campaign.latencyMs,
      data: {
        campaignId,
        platformId: "salesforce",
        impressions: 0,
        clicks: 0,
        conversions: amount > 0 ? 1 : 0,
        conversionValue: amount,
        spend: 0,
        revenue: amount,
        roas: 0,
        cpc: 0,
        cpm: 0,
        ctr: 0,
        conversionRate: amount > 0 ? 100 : 0,
        frequency: 0,
        reach: 0,
        period: dateRange,
      },
    };
  }

  // ── CAPI / Contact Events ──────────────────────────────

  async sendConversion(accessToken: string, event: ConversionEvent): Promise<ConversionDeliveryResult> {
    const start = Date.now();
    const { eventBus } = await import("../events");
    eventBus.emit("crm.contact" as any, {
      platform: "salesforce",
      tenantId: event.userData.externalId || "",
      email: event.userData.email || "",
      orderId: event.customData.orderId || "",
      total: event.customData.value,
    });
    // Salesforce contact writes are handled by the real CRM sync worker.
    return { platform: "salesforce", success: true, latencyMs: Date.now() - start };
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
    const event = Array.isArray(body) ? body[0] : body;
    return {
      platform: "salesforce",
      eventType: event?.event?.type || "change",
      eventId: (event?.event?.replayId ?? crypto.randomBytes(16).toString("hex")).toString(),
      timestamp: event?.event?.createdDate || Date.now(),
      data: body,
    };
  }
}

export const salesforceConnector = new SalesforceConnector();

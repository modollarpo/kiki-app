// ============================================================
// KIKI Agent Platform — Platform Connector Types
// Shared types for all ad platform connectors
// ============================================================

// ── Platform Identifiers ───────────────────────────────────

export type PlatformId =
  | "meta"
  | "google"
  | "tiktok"
  | "linkedin"
  | "snap"
  | "pinterest"
  | "amazon"
  | "ctv";

export type PlatformStatus = "active" | "expired" | "revoked" | "error" | "rate_limited";

// ── OAuth ──────────────────────────────────────────────────

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope: string[];
}

export interface OAuthState {
  state: string;
  tenantId: string;
  platform: PlatformId;
  createdAt: number;
  expiresAt: number;
}

// ── Platform Configuration ─────────────────────────────────

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  apiVersion: string;
  apiBaseUrl: string;
  oauth: OAuthConfig;
  rateLimits: {
    requestsPerSecond: number;
    requestsPerHour: number;
    dailySpendLimit?: number;
  };
  supportsCAPI: boolean;
  supportsOAuth: boolean;
  supportsConversionValue: boolean;
  conversionEvents: string[];
}

// ── Campaign ───────────────────────────────────────────────

export interface PlatformCampaign {
  id: string;
  platformId: PlatformId;
  name: string;
  status: "active" | "paused" | "archived" | "deleted";
  objective: string;
  dailyBudget: number;
  lifetimeBudget?: number;
  bidStrategy?: string;
  targeting?: Record<string, any>;
  creative?: PlatformCreative[];
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformCampaignMetrics {
  campaignId: string;
  platformId: PlatformId;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  spend: number;
  revenue: number;
  roas: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversionRate: number;
  frequency: number;
  reach: number;
  period: { start: string; end: string };
}

// ── Creative ───────────────────────────────────────────────

export interface PlatformCreative {
  id: string;
  name: string;
  type: "image" | "video" | "carousel" | "text" | "collection";
  status: "active" | "paused" | "archived";
  thumbnailUrl?: string;
  title?: string;
  body?: string;
  callToAction?: string;
  linkUrl?: string;
}

// ── Conversion Event (CAPI) ────────────────────────────────

export interface ConversionEvent {
  eventName: string;
  eventTime: number;
  userData: ConversionUserData;
  customData: ConversionCustomData;
  consent: ConversionConsent;
}

export interface ConversionUserData {
  email?: string;
  phone?: string;
  externalId?: string;
  ipAddress?: string;
  userAgent?: string;
  clickId?: string;
  fbc?: string;    // Meta click ID
  fbp?: string;    // Meta browser ID
  gbraid?: string; // Google click ID
  wbraid?: string; // Google web click ID
  ttclid?: string; // TikTok click ID
  lapid?: string;  // LinkedIn ad ID
  snapClickId?: string;
  pinterestClickId?: string;
}

export interface ConversionCustomData {
  currency: string;
  value: number;
  orderId?: string;
  productId?: string;
  productCategory?: string;
  numberOfItems?: number;
  contentName?: string;
  contentIds?: string[];
  predictedLtv90d?: number;
  ltvSegment?: "high" | "mid" | "low" | "churn_risk";
  bidMultiplier?: number;
  content_type?: string;
}

export interface ConversionConsent {
  gdpr?: boolean;
  ccpa?: boolean;
  gpc?: boolean;
}

export interface ConversionDeliveryResult {
  platform: PlatformId;
  success: boolean;
  eventId?: string;
  latencyMs: number;
  error?: string;
  httpStatus?: number;
}

// ── Ad Spend ───────────────────────────────────────────────

export interface AdSpendData {
  platform: PlatformId;
  accountId: string;
  campaignId?: string;
  amount: number;
  currency: string;
  timestamp: string;
  description?: string;
}

// ── Webhook ────────────────────────────────────────────────

export interface PlatformWebhook {
  platform: PlatformId;
  eventType: string;
  eventId: string;
  timestamp: number;
  data: Record<string, any>;
  signature?: string;
}

// ── API Response Wrapper ───────────────────────────────────

export interface PlatformApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  httpStatus?: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  requestId?: string;
  latencyMs: number;
}

// ── Connector Interface ────────────────────────────────────

export interface IPlatformConnector {
  readonly platformId: PlatformId;
  readonly config: PlatformConfig;

  // OAuth (with PKCE support)
  generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string; codeVerifier: string }>;
  handleCallback(code: string, state: string, codeVerifier?: string): Promise<OAuthTokens>;
  refreshToken(refreshToken: string): Promise<OAuthTokens>;
  validateToken(accessToken: string): Promise<boolean>;

  // Account
  getAccountInfo(accessToken: string): Promise<PlatformApiResponse<AccountInfo>>;

  // Campaigns
  listCampaigns(accessToken: string, accountId: string): Promise<PlatformApiResponse<PlatformCampaign[]>>;
  getCampaign(accessToken: string, campaignId: string): Promise<PlatformApiResponse<PlatformCampaign>>;
  getCampaignMetrics(accessToken: string, campaignId: string, dateRange: { start: string; end: string }): Promise<PlatformApiResponse<PlatformCampaignMetrics>>;

  // CAPI
  sendConversion(accessToken: string, event: ConversionEvent): Promise<ConversionDeliveryResult>;
  sendConversionBatch?(accessToken: string, events: ConversionEvent[]): Promise<ConversionDeliveryResult[]>;

  // Campaign Write Operations
  pauseCampaign?(accessToken: string, campaignId: string): Promise<PlatformApiResponse<any>>;
  resumeCampaign?(accessToken: string, campaignId: string): Promise<PlatformApiResponse<any>>;
  setBid?(accessToken: string, adGroupId: string, bidAmount: number): Promise<PlatformApiResponse<any>>;
  updateCampaign?(accessToken: string, campaignId: string, updates: { dailyBudget?: number; status?: string; name?: string }): Promise<PlatformApiResponse<any>>;

  // Audience Operations
  createCustomAudience?(accessToken: string, params: { name: string; users?: any }): Promise<PlatformApiResponse<any>>;
  addToCustomAudience?(accessToken: string, audienceId: string, users: any): Promise<PlatformApiResponse<any>>;

  // Webhooks
  verifyWebhookSignature?(payload: string, signature: string, secret: string): boolean;
  parseWebhookPayload?(body: any): PlatformWebhook;
}

export interface AccountInfo {
  id: string;
  name: string;
  email?: string;
  currency?: string;
  timezone?: string;
  businessId?: string;
  pixelId?: string;
  config: Record<string, any>;
}

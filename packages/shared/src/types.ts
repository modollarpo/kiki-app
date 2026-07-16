// ============================================================
// KIKI Agent™ — Shared Types & Event Schemas
// Used across all microservices
// ============================================================

import { z } from "zod";

// ── Core Domain Types ──────────────────────────────────────
export type PlatformId = "meta" | "google" | "tiktok" | "linkedin" | "snap" | "pinterest" | "amazon" | "ctv";
export type LtvSegment = "high" | "mid" | "low" | "churn_risk";
export type AttributionModel = "last_touch" | "first_touch" | "linear" | "position" | "time_decay";
export type CreativeType = "image" | "video" | "carousel" | "text" | "collection";

export interface TenantContext {
  tenantId: string;
  userId?: string;
}

// ── Signal & Conversion ────────────────────────────────────
export interface ConversionSignal {
  signalId: string;
  tenantId: string;
  platform: PlatformId;
  eventName: string;
  eventTime: number;
  value: number;
  currency: string;
  userData: {
    email?: string;
    phone?: string;
    externalId?: string;
    clickId?: string;
    fbc?: string;
    fbp?: string;
    gbraid?: string;
    wbraid?: string;
    ttclid?: string;
  };
  customData: {
    predictedLtv90d?: number;
    ltvSegment?: LtvSegment;
    bidMultiplier?: number;
    contentIds?: string[];
    productId?: string;
    productCategory?: string;
  };
  creativeId?: string;
  adId?: string;
  adsetId?: string;
  campaignId?: string;
}

// ── Creative Attribution ───────────────────────────────────
export interface AttributionRecord {
  id: string;
  tenantId: string;
  signalId: string;
  creativeId: string;
  adId: string;
  adsetId: string;
  campaignId: string;
  platform: PlatformId;
  attributionModel: AttributionModel;
  attributedRevenue: number;
  attributedLtv: number;
  conversionValue: number;
  impressionTime: number;
  conversionTime: number;
  attributionWindow: number;
  createdAt: Date;
}

export interface CreativePerformance {
  creativeId: string;
  creativeName: string;
  platform: PlatformId;
  impressions: number;
  clicks: number;
  conversions: number;
  attributedRevenue: number;
  attributedLtv: number;
  roas: number;
  ctr: number;
  conversionRate: number;
  ltvSegmentDistribution: Record<LtvSegment, number>;
}

// ── Product Margin ─────────────────────────────────────────
export interface ProductMargin {
  id: string;
  tenantId: string;
  sku: string;
  productName: string;
  cogs: number;
  marginPct: number;
  marginAmount: number;
  price: number;
  currency: string;
  lastUpdated: Date;
}

export interface ProfitAdjustedMetrics {
  campaignId: string;
  revenue: number;
  spend: number;
  cogs: number;
  grossProfit: number;
  profitRoas: number;
  profitMarginPct: number;
  marginAdjustedLtv: number;
  profitAdjustedCac: number;
}

// ── Competitive Intelligence ───────────────────────────────
export interface CompetitorTrack {
  id: string;
  tenantId: string;
  name: string;
  domain: string;
  platforms: PlatformId[];
  trackingSince: Date;
  lastChecked: Date;
}

export interface CompetitorAd {
  id: string;
  competitorId: string;
  platform: PlatformId;
  adId: string;
  creativeType: CreativeType;
  headline: string;
  body: string;
  imageUrl?: string;
  callToAction?: string;
  firstSeen: Date;
  lastSeen: Date;
  estimatedImpressions?: number;
  estimatedSpend?: number;
}

export interface CpmBenchmark {
  platform: PlatformId;
  industry: string;
  period: string;
  p50: number;
  p75: number;
  p90: number;
  sampleSize: number;
}

// ── Influencer ─────────────────────────────────────────────
export interface InfluencerCreator {
  id: string;
  tenantId: string;
  name: string;
  handle: string;
  platform: PlatformId;
  promoCode: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  totalConversions: number;
  totalRevenue: number;
  totalLtv: number;
  cac: number;
  roi: number;
  registeredAt: Date;
}

export interface InfluencerConversion {
  id: string;
  creatorId: string;
  tenantId: string;
  mechanism: "promo_code" | "utm" | "referrer";
  orderId: string;
  revenue: number;
  predictedLtv: number;
  ltvSegment: LtvSegment;
  attributedAt: Date;
}

// ── MMM ────────────────────────────────────────────────────
export interface MmmRun {
  id: string;
  tenantId: string;
  status: "pending" | "running" | "completed" | "failed";
  weeksOfData: number;
  channelContributions: ChannelContribution[];
  saturationCurves: SaturationCurve[];
  budgetRecommendations: BudgetRecommendation[];
  modelFit: { rSquared: number; adjRSquared: number; algorithm: string };
  startedAt: Date;
  completedAt?: Date;
}

export interface ChannelContribution {
  channel: PlatformId | string;
  contributionPct: number;
  spend: number;
  revenue: number;
  efficiency: number;
  marginalRoas: number;
  saturationPoint: number;
}

export interface SaturationCurve {
  channel: string;
  points: Array<{ spend: number; revenue: number; marginalReturn: number }>;
}

export interface BudgetRecommendation {
  channel: string;
  currentSpend: number;
  recommendedSpend: number;
  expectedChange: number;
  confidence: number;
  reason: string;
}

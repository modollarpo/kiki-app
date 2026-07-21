// ============================================================
// KIKI Agent™ — Kafka Event Definitions
// 82 events across 14 topics
// ============================================================

import { PlatformId, LtvSegment, AttributionModel } from "./types";

// ── Event Base ─────────────────────────────────────────────
export interface KafkaEvent<T = unknown> {
  eventId: string;
  eventType: string;
  topic: string;
  tenantId: string;
  timestamp: number;
  version: string;
  payload: T;
}

// ── Topic: attribution ─────────────────────────────────────
export interface AttributionRecordedPayload {
  signalId: string;
  creativeId: string;
  adId: string;
  campaignId: string;
  platform: PlatformId;
  model: AttributionModel;
  attributedRevenue: number;
  attributedLtv: number;
  conversionValue: number;
}

export interface AttributionModelChangedPayload {
  tenantId: string;
  oldModel: AttributionModel;
  newModel: AttributionModel;
}

// ── Topic: nl-analytics ────────────────────────────────────
export interface NlQueryAnsweredPayload {
  queryId: string;
  question: string;
  intent: string;
  answerLength: number;
  groundedInData: boolean;
  responseTimeMs: number;
}

export interface NlQueryFailedPayload {
  queryId: string;
  question: string;
  error: string;
}

// ── Topic: integration ─────────────────────────────────────
export interface IntegrationAmazonConnectedPayload {
  tenantId: string;
  accountId: string;
  accountName: string;
}

export interface IntegrationCtvConnectedPayload {
  tenantId: string;
  provider: "roku" | "thed trade desk";
  accountId: string;
}

// ── Topic: mmm ─────────────────────────────────────────────
export interface MmmRunCompletedPayload {
  runId: string;
  weeksOfData: number;
  rSquared: number;
  bestChannel: string;
  totalChannels: number;
}

export interface MmmRecommendationGeneratedPayload {
  runId: string;
  channel: string;
  currentSpend: number;
  recommendedSpend: number;
  confidence: number;
}

// ── Topic: margin ──────────────────────────────────────────
export interface MarginUpdatedPayload {
  tenantId: string;
  sku: string;
  oldMarginPct: number;
  newMarginPct: number;
}

export interface MarginThresholdBreachedPayload {
  tenantId: string;
  sku: string;
  marginPct: number;
  threshold: number;
  direction: "below" | "above";
}

// ── Topic: competitor ──────────────────────────────────────
export interface CompetitorAdDetectedPayload {
  competitorId: string;
  platform: PlatformId;
  adId: string;
  headline: string;
  creativeType: string;
}

export interface CompetitorBenchmarkUpdatedPayload {
  platform: PlatformId;
  industry: string;
  oldCpm: number;
  newCpm: number;
  changePct: number;
}

// ── Topic: influencer ──────────────────────────────────────
export interface InfluencerConversionAttributedPayload {
  creatorId: string;
  tenantId: string;
  mechanism: "promo_code" | "utm" | "referrer";
  orderId: string;
  revenue: number;
  predictedLtv: number;
  ltvSegment: LtvSegment;
}

export interface InfluencerCreatorRegisteredPayload {
  creatorId: string;
  tenantId: string;
  name: string;
  handle: string;
  platform: PlatformId;
}

// ── Topic: approvals ───────────────────────────────────────
// Emitted by the bidding circuit breaker when a high-impact
// decision requires human sign-off before being pushed to the
// ad platform connectors.
export interface BiddingApprovalRequestedPayload {
  approvalId: string;       // Unique ID for this pending action
  tenantId: string;
  campaignId: string;
  campaignName: string;
  platform: string;         // e.g. "meta", "google", "tiktok"
  currentBid: number;
  newBid: number;
  changePercent: number;
  reason: string;           // AI's human-readable reasoning
  confidence: number;       // 0.0 – 1.0
  ltvRatio: number;
  stopLossTriggered: boolean;
  expiresAt: number;        // unix ms — auto-reject after this
}

export interface BiddingApprovalResolvedPayload {
  approvalId: string;
  tenantId: string;
  campaignId: string;
  resolution: "approved" | "rejected" | "expired";
  resolvedBy: string;       // "slack" | "api" | "system"
  resolvedAt: number;
}

// ── Topic: creative ────────────────────────────────────────
// Emitted when the creative generation engine produces new
// ad assets or detects creative fatigue on a campaign.
export interface CreativeFatigueDetectedPayload {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  platform: string;
  consecutiveLowRoasDays: number;
  currentRoas: number;
  targetRoas: number;
}

export interface CreativeGeneratedPayload {
  tenantId: string;
  campaignId: string;
  creativeId: string;
  platform: string;
  type: "image" | "video" | "copy";
  assetUrl?: string;
  copyText?: string;
}

// ── Topic: competitor ──────────────────────────────────────
export interface CompetitorPriceDropPayload {
  tenantId: string;
  competitorDomain: string;
  productCategory: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  detectedAt: number;
  affectedPlatforms: string[];
}

// ── All Topics ─────────────────────────────────────────────
export const KAFKA_TOPICS = {
  ATTRIBUTION: "kiki.attribution",
  NL_ANALYTICS: "kiki.nl.analytics",
  INTEGRATION: "kiki.integration",
  MMM: "kiki.mmm",
  MARGIN: "kiki.margin",
  COMPETITOR: "kiki.competitor",
  INFLUENCER: "kiki.influencer",
  APPROVALS: "kiki.approvals",
  CREATIVE: "kiki.creative",
  // Existing topics
  SIGNAL: "kiki.signal",
  CAMPAIGN: "kiki.campaign",
  AGENT: "kiki.agent",
  LTV: "kiki.ltv",
  FRAUD: "kiki.fraud",
  WALLET: "kiki.wallet",
  SYSTEM: "kiki.system",
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

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

// ── All Topics ─────────────────────────────────────────────
export const KAFKA_TOPICS = {
  ATTRIBUTION: "kiki.attribution",
  NL_ANALYTICS: "kiki.nl.analytics",
  INTEGRATION: "kiki.integration",
  MMM: "kiki.mmm",
  MARGIN: "kiki.margin",
  COMPETITOR: "kiki.competitor",
  INFLUENCER: "kiki.influencer",
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

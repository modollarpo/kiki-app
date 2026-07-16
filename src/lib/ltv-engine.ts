// ============================================================
// LTV Prediction Engine — Predicts 90-day customer lifetime value
// Uses Azure OpenAI for intelligent prediction + heuristic fallback
// ============================================================

import { AZURE_OPENAI_CONFIG, buildAzureOpenAIUrl, buildAzureOpenAIHeaders, SYSTEM_PROMPTS } from "./azure-openai";
import { getDb } from "./db";

export interface SignalData {
  platform: string;
  eventType: string;
  eventId?: string;
  userId?: string;
  value: number;
  // Enrichment features
  device?: string;
  browser?: string;
  country?: string;
  referrer?: string;
  sessionDuration?: number;
  pagesViewed?: number;
  previousPurchases?: number;
  accountAge?: number;
  emailDomain?: string;
}

export interface LTVPrediction {
  predictedLTV: number;
  confidence: number;
  horizonDays: number;
  factors: string[];
  segment: "high" | "mid" | "low" | "churn_risk";
  recommendedBidMultiplier: number;
}

// ── Heuristic LTV prediction (always works, no API needed) ─
function heuristicPredict(signal: SignalData, historicalAvg?: number, trainedWeights?: {
  intercept: number;
  platformWeights: Record<string, number>;
  eventWeights: Record<string, number>;
  deviceWeights: Record<string, number>;
  engagementWeights: { sessionDuration: number; pagesViewed: number; repeatPurchase: number };
  segmentThresholds: { high: number; mid: number; low: number };
}): LTVPrediction {
  const baseLTV = trainedWeights?.intercept || historicalAvg || 250;
  let multiplier = 1.0;
  const factors: string[] = [];

  // Platform signal quality
  const platformQuality: Record<string, number> = trainedWeights?.platformWeights || {
    meta: 1.0,
    google: 1.1,
    tiktok: 0.85,
    youtube: 0.9,
    linkedin: 1.3,
    pinterest: 0.95,
    snapchat: 0.8,
    display: 0.7,
  };
  const pq = platformQuality[signal.platform] || 0.8;
  multiplier *= pq;
  factors.push(`platform:${signal.platform}(${pq.toFixed(2)})`);

  // Event type value
  const eventValue: Record<string, number> = trainedWeights?.eventWeights || {
    purchase: 2.5,
    signup: 1.8,
    add_to_cart: 1.4,
    view_content: 1.0,
    lead: 2.0,
    complete_registration: 1.6,
  };
  const ev = eventValue[signal.eventType] || 1.0;
  multiplier *= ev;
  factors.push(`event:${signal.eventType}(${ev.toFixed(2)})`);

  // Device signal
  const deviceWeights: Record<string, number> = trainedWeights?.deviceWeights || { desktop: 1.15, mobile: 0.9, tablet: 1.05 };
  if (signal.device && deviceWeights[signal.device]) {
    const dw = deviceWeights[signal.device];
    multiplier *= dw;
    factors.push(`device:${signal.device}(${dw >= 1 ? "+" : ""}${((dw - 1) * 100).toFixed(0)}%)`);
  }

  // Session engagement
  if (signal.sessionDuration && signal.sessionDuration > 300) {
    multiplier *= 1.3; factors.push("engagement:high(+30%)");
  } else if (signal.sessionDuration && signal.sessionDuration < 30) {
    multiplier *= 0.7; factors.push("engagement:low(-30%)");
  }

  // Repeat behavior
  const repeatCoeff = trainedWeights?.engagementWeights?.repeatPurchase || 0.2;
  if (signal.previousPurchases && signal.previousPurchases > 0) {
    multiplier *= 1.0 + (signal.previousPurchases * repeatCoeff);
    factors.push(`repeat:${signal.previousPurchases}x(+${signal.previousPurchases * 20}%)`);
  }

  // Email domain quality (B2B signals higher LTV)
  const b2bDomains = ["corp", "inc", "com", "org", "edu"];
  if (signal.emailDomain && b2bDomains.some(d => signal.emailDomain!.includes(d))) {
    multiplier *= 1.25; factors.push("b2b:domain(+25%)");
  }

  const predictedLTV = Math.round(baseLTV * multiplier * 100) / 100;
  const confidence = Math.min(0.95, 0.6 + (signal.sessionDuration ? 0.1 : 0) + (signal.previousPurchases ? 0.15 : 0));

  const thresholds = trainedWeights?.segmentThresholds || { high: 500, mid: 200, low: 80 };
  let segment: LTVPrediction["segment"] = "mid";
  if (predictedLTV > thresholds.high) segment = "high";
  else if (predictedLTV > thresholds.mid) segment = "mid";
  else if (predictedLTV > thresholds.low) segment = "low";
  else segment = "churn_risk";

  const bidMultiplier = segment === "high" ? 2.0 : segment === "mid" ? 1.2 : segment === "low" ? 0.8 : 0.4;

  return { predictedLTV, confidence, horizonDays: 90, factors, segment, recommendedBidMultiplier: bidMultiplier };
}

// ── AI-enhanced LTV prediction (uses Azure OpenAI) ────────
export async function predictLTV(signal: SignalData, tenantId?: string): Promise<LTVPrediction> {
  // Attempt to load trained weights from the active model version
  let trainedWeights: {
    intercept: number;
    platformWeights: Record<string, number>;
    eventWeights: Record<string, number>;
    deviceWeights: Record<string, number>;
    engagementWeights: { sessionDuration: number; pagesViewed: number; repeatPurchase: number };
    segmentThresholds: { high: number; mid: number; low: number };
  } | undefined;

  if (tenantId) {
    try {
      const db = await getDb();
      const activeModel = await db.prepare(`
        SELECT weights FROM ltv_models
        WHERE tenant_id = ? AND status = 'active'
        ORDER BY trained_at DESC LIMIT 1
      `).get(tenantId) as { weights: string } | undefined;
      if (activeModel) {
        trainedWeights = JSON.parse(activeModel.weights);
      }
    } catch {
      // No trained model available — fall back to defaults below
    }
  }

  const creds = (() => {
    try {
      return buildAzureOpenAIHeaders() ? { endpoint: process.env.AZURE_OPENAI_ENDPOINT!, apiKey: process.env.AZURE_OPENAI_API_KEY! } : null;
    } catch { return null; }
  })();

  // If no Azure OpenAI configured, use heuristic (with trained weights if available)
  if (!creds) return heuristicPredict(signal, undefined, trainedWeights);

  try {
    const url = buildAzureOpenAIUrl(AZURE_OPENAI_CONFIG.mini.deploymentName);
    const headers = buildAzureOpenAIHeaders();

    const prompt = `Predict the 90-day lifetime value (LTV) for this ad conversion signal. Return ONLY a JSON object.

Signal:
- Platform: ${signal.platform}
- Event: ${signal.eventType}
- Value: $${signal.value}
- Device: ${signal.device || "unknown"}
- Country: ${signal.country || "unknown"}
- Session duration: ${signal.sessionDuration || 0}s
- Pages viewed: ${signal.pagesViewed || 0}
- Previous purchases: ${signal.previousPurchases || 0}
- Account age: ${signal.accountAge || 0} days

Return JSON: {"ltv": number, "confidence": 0.0-1.0, "factors": ["reason1", "reason2"], "segment": "high|mid|low|churn_risk", "bidMultiplier": number}`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an LTV prediction engine for an advertising platform. Return ONLY valid JSON. No markdown." },
          { role: "user", content: prompt },
        ],
        max_tokens: 256,
        temperature: 0.1,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      return {
        predictedLTV: Math.round(parsed.ltv * 100) / 100,
        confidence: parsed.confidence || 0.8,
        horizonDays: 90,
        factors: parsed.factors || [],
        segment: parsed.segment || "mid",
        recommendedBidMultiplier: parsed.bidMultiplier || 1.0,
      };
    }
  } catch (e) {
    console.warn("[LTV] AI prediction failed, using heuristic:", e);
  }

  return heuristicPredict(signal, undefined, trainedWeights);
}

// ── Batch predict ─────────────────────────────────────────
export async function predictLTVBatch(signals: SignalData[], tenantId?: string): Promise<LTVPrediction[]> {
  return Promise.all(signals.map(s => predictLTV(s, tenantId)));
}

// ── Per-Tenant LTV Model Training ──────────────────────────

export interface LTVTrainingResult {
  tenantId: string;
  sampleCount: number;
  avgActual: number;
  avgPredicted: number;
  rmse: number;
  mape: number;
  segmentAccuracy: Record<string, number>;
  trainedAt: string;
}

export async function trainTenantLTVModel(tenantId: string): Promise<LTVTrainingResult> {
  const { getDb } = require("./db");
  const db = await getDb();

  // Get historical predictions with actual values
  const historicalData = await db.prepare(`
    SELECT
      predicted_ltv,
      segment,
      factors,
      created_at
    FROM ltv_predictions
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 1000
  `).all(tenantId) as any[];

  if (historicalData.length < 10) {
    return {
      tenantId,
      sampleCount: historicalData.length,
      avgActual: 0,
      avgPredicted: 0,
      rmse: 0,
      mape: 0,
      segmentAccuracy: {},
      trainedAt: new Date().toISOString(),
    };
  }

  // Calculate actual LTV from wallet transactions (ground truth)
  const wallet = await db.prepare(`
    SELECT id FROM wallets WHERE tenant_id = ?
  `).get(tenantId) as any;

  let actualRevenue = 0;
  if (wallet) {
    const txData = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM wallet_transactions
      WHERE wallet_id = ? AND type = 'credit'
    `).get(wallet.id) as any;
    actualRevenue = txData?.total_revenue || 0;
  }

  // Calculate average predicted vs actual
  const avgPredicted = historicalData.reduce((s, d) => s + d.predicted_ltv, 0) / historicalData.length;
  const avgActual = actualRevenue / Math.max(historicalData.length, 1);

  // Calculate RMSE
  const errors = historicalData.map(d => d.predicted_ltv - avgActual);
  const mse = errors.reduce((s, e) => s + e * e, 0) / errors.length;
  const rmse = Math.sqrt(mse);

  // Calculate MAPE
  const absPercErrors = errors.map((e, i) => {
    const actual = avgActual || 1;
    return Math.abs(e / actual) * 100;
  });
  const mape = absPercErrors.reduce((s, e) => s + e, 0) / absPercErrors.length;

  // Segment accuracy
  const segmentCounts: Record<string, number> = {};
  const segmentCorrect: Record<string, number> = {};
  for (const d of historicalData) {
    segmentCounts[d.segment] = (segmentCounts[d.segment] || 0) + 1;
    // Check if segment matches actual revenue tier
    const actualTier = avgActual > 500 ? "high" : avgActual > 200 ? "mid" : avgActual > 80 ? "low" : "churn_risk";
    if (d.segment === actualTier) {
      segmentCorrect[d.segment] = (segmentCorrect[d.segment] || 0) + 1;
    }
  }

  const segmentAccuracy: Record<string, number> = {};
  for (const seg of Object.keys(segmentCounts)) {
    segmentAccuracy[seg] = (segmentCorrect[seg] || 0) / segmentCounts[seg];
  }

  // Store model metrics
  await db.prepare(`
    INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
    VALUES (?, 'ltv.model_trained', ?, ?, datetime('now'))
  `).run(tenantId, rmse, JSON.stringify({
    sampleCount: historicalData.length,
    avgPredicted: Math.round(avgPredicted * 100) / 100,
    avgActual: Math.round(avgActual * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    mape: Math.round(mape * 100) / 100,
  }));

  return {
    tenantId,
    sampleCount: historicalData.length,
    avgActual: Math.round(avgActual * 100) / 100,
    avgPredicted: Math.round(avgPredicted * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    mape: Math.round(mape * 100) / 100,
    segmentAccuracy,
    trainedAt: new Date().toISOString(),
  };
}

// ── Get Model Performance History ───────────────────────────

export async function getModelPerformance(tenantId: string): Promise<Array<{
  trainedAt: string;
  rmse: number;
  mape: number;
  sampleCount: number;
}>> {
  const { getDb } = require("./db");
  const db = await getDb();

  const metrics = await db.prepare(`
    SELECT metric_value, tags, created_at
    FROM system_metrics
    WHERE tenant_id = ? AND metric_name = 'ltv.model_trained'
    ORDER BY created_at DESC
    LIMIT 10
  `).all(tenantId) as any[];

  return metrics.map(m => {
    const tags = JSON.parse(m.tags || "{}");
    return {
      trainedAt: m.created_at,
      rmse: tags.rmse || 0,
      mape: tags.mape || 0,
      sampleCount: tags.sampleCount || 0,
    };
  });
}

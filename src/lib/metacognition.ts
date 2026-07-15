// ============================================================
// KIKI Agent Platform — Metacognition Layer
// Self-reflection, confidence calibration, adaptive learning
// ============================================================

import { getDb } from "./db";
import { eventBus } from "./events";

// ── Types ──────────────────────────────────────────────────

export interface MetacognitionEvent {
  id: number;
  tenantId: string;
  modelId?: string;
  eventType: "drift_detected" | "miscalibrated" | "improvement" | "degradation" | "factor_shift" | "anomaly_pattern" | "strategy_adapted";
  insight: string;
  confidenceBefore?: number;
  confidenceAfter?: number;
  actionTaken?: string;
  factorsAffected: string[];
  metadata: Record<string, any>;
  createdAt: string;
}

export interface ConfidenceCalibration {
  bucket: number;
  predictedMean: number;
  actualMean: number;
  count: number;
  calibrationError: number;
  isOverconfident: boolean;
}

export interface FactorAttribution {
  factor: string;
  importance: number;
  direction: "positive" | "negative" | "neutral";
  confidence: number;
  samplesUsed: number;
  recentTrend: "increasing" | "decreasing" | "stable";
}

export interface AdaptiveStrategy {
  tenantId: string;
  currentStrategy: string;
  triggerEvent: string;
  adjustments: Array<{
    parameter: string;
    oldValue: any;
    newValue: any;
    reason: string;
  }>;
  appliedAt: string;
}

// ── Confidence Calibration Analysis ────────────────────────

export async function analyzeConfidenceCalibration(tenantId: string): Promise<ConfidenceCalibration[]> {
  const db = await getDb();

  const feedback = await db.prepare(`
    SELECT predicted_ltv, actual_ltv, error_pct
    FROM prediction_feedback
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 1000
  `).all(tenantId) as Array<{ predicted_ltv: number; actual_ltv: number; error_pct: number }>;

  if (feedback.length < 10) return [];

  // Bucket predictions by value ranges
  const buckets: Record<number, { predicted: number[]; actual: number[] }> = {};
  for (const fb of feedback) {
    const bucket = Math.floor(fb.predicted_ltv / 100) * 100;
    if (!buckets[bucket]) buckets[bucket] = { predicted: [], actual: [] };
    buckets[bucket].predicted.push(fb.predicted_ltv);
    buckets[bucket].actual.push(fb.actual_ltv);
  }

  const calibrations: ConfidenceCalibration[] = [];
  for (const [bucketStr, data] of Object.entries(buckets)) {
    const bucket = parseInt(bucketStr);
    const n = data.predicted.length;
    if (n < 3) continue;

    const predictedMean = data.predicted.reduce((s, v) => s + v, 0) / n;
    const actualMean = data.actual.reduce((s, v) => s + v, 0) / n;
    const calibrationError = Math.abs(predictedMean - actualMean) / Math.max(actualMean, 1);

    calibrations.push({
      bucket,
      predictedMean: Math.round(predictedMean * 100) / 100,
      actualMean: Math.round(actualMean * 100) / 100,
      count: n,
      calibrationError: Math.round(calibrationError * 1000) / 1000,
      isOverconfident: predictedMean > actualMean * 1.1,
    });
  }

  return calibrations.sort((a, b) => a.bucket - b.bucket);
}

// ── Factor Attribution Analysis ────────────────────────────

export async function analyzeFactorAttribution(tenantId: string): Promise<FactorAttribution[]> {
  const db = await getDb();

  const feedback = await db.prepare(`
    SELECT factors_at_prediction, error_pct, predicted_ltv, actual_ltv, created_at
    FROM prediction_feedback
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 500
  `).all(tenantId) as any[];

  if (feedback.length < 10) return [];

  // Analyze each factor's contribution to accuracy
  const factorStats: Record<string, {
    errors: number[];
    appearances: number;
    recentAppearances: number;
    recentErrors: number[];
  }> = {};

  const oneWeekAgo = Date.now() - 7 * 86400000;

  for (const fb of feedback) {
    try {
      const factors = JSON.parse(fb.factorsof_prediction || "[]");
      for (const factor of factors) {
        const fname = String(factor).split(":")[0] || String(factor);
        if (!factorStats[fname]) factorStats[fname] = { errors: [], appearances: 0, recentAppearances: 0, recentErrors: [] };
        factorStats[fname].appearances++;
        factorStats[fname].errors.push(fb.error_pct);

        const fbTime = new Date(fb.created_at).getTime();
        if (fbTime > oneWeekAgo) {
          factorStats[fname].recentAppearances++;
          factorStats[fname].recentErrors.push(fb.error_pct);
        }
      }
    } catch { /* skip */ }
  }

  const attributions: FactorAttribution[] = [];

  for (const [factor, stats] of Object.entries(factorStats)) {
    if (stats.appearances < 5) continue;

    const overallError = stats.errors.reduce((s, e) => s + e, 0) / stats.errors.length;
    const recentError = stats.recentErrors.length > 0
      ? stats.recentErrors.reduce((s, e) => s + e, 0) / stats.recentErrors.length
      : overallError;

    // Importance = inverse of average error (lower error = more important)
    const importance = 1 / Math.max(overallError, 1);

    // Direction: negative correlation with error means positive factor
    const direction: FactorAttribution["direction"] = overallError < 15 ? "positive" : overallError > 30 ? "negative" : "neutral";

    // Trend: is this factor getting better or worse?
    const trendDiff = recentError - overallError;
    const recentTrend: FactorAttribution["recentTrend"] =
      trendDiff < -5 ? "increasing" : trendDiff > 5 ? "decreasing" : "stable";

    attributions.push({
      factor,
      importance: Math.round(importance * 1000) / 1000,
      direction,
      confidence: Math.min(1, stats.appearances / 50),
      samplesUsed: stats.appearances,
      recentTrend,
    });
  }

  return attributions.sort((a, b) => b.importance - a.importance);
}

// ── Self-Reflection: Identify Patterns ─────────────────────

export async function runSelfReflection(tenantId: string): Promise<{
  patterns: Array<{ pattern: string; frequency: number; impact: string; recommendation: string }>;
  overallHealth: number;
  confidenceScore: number;
  adaptationNeeded: boolean;
}> {
  const db = await getDb();

  // Get recent metacognition events
  const events = await db.prepare(`
    SELECT event_type, insight, metadata, created_at
    FROM metacognition_log
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(tenantId) as any[];

  // Get recent feedback
  const feedback = await db.prepare(`
    SELECT error_pct, segment_predicted, predicted_ltv, actual_ltv, created_at
    FROM prediction_feedback
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 200
  `).all(tenantId) as any[];

  const patterns: Array<{ pattern: string; frequency: number; impact: string; recommendation: string }> = [];

  // Pattern 1: Consistent over/under prediction
  if (feedback.length >= 20) {
    const overPredictions = feedback.filter(f => f.predicted_ltv > f.actual_ltv * 1.2);
    const underPredictions = feedback.filter(f => f.predicted_ltv < f.actual_ltv * 0.8);

    if (overPredictions.length > feedback.length * 0.3) {
      patterns.push({
        pattern: "Systematic over-prediction",
        frequency: overPredictions.length,
        impact: "high",
        recommendation: "Reduce intercept weight and lower platform multipliers by 10-15%",
      });
    }

    if (underPredictions.length > feedback.length * 0.3) {
      patterns.push({
        pattern: "Systematic under-prediction",
        frequency: underPredictions.length,
        impact: "high",
        recommendation: "Increase intercept weight and raise platform multipliers by 10-15%",
      });
    }
  }

  // Pattern 2: High error on specific segments
  const segmentErrors: Record<string, number[]> = {};
  for (const fb of feedback) {
    const seg = fb.segment_predicted || "unknown";
    if (!segmentErrors[seg]) segmentErrors[seg] = [];
    segmentErrors[seg].push(fb.error_pct);
  }

  for (const [seg, errors] of Object.entries(segmentErrors)) {
    const avgError = errors.reduce((s, e) => s + e, 0) / errors.length;
    if (avgError > 30 && errors.length >= 5) {
      patterns.push({
        pattern: `High error on ${seg} segment`,
        frequency: errors.length,
        impact: "medium",
        recommendation: `Review ${seg} segment thresholds and factor weights`,
      });
    }
  }

  // Pattern 3: Temporal patterns (time-of-day effects)
  const hourlyErrors: Record<number, number[]> = {};
  for (const fb of feedback) {
    const hour = new Date(fb.created_at).getHours();
    if (!hourlyErrors[hour]) hourlyErrors[hour] = [];
    hourlyErrors[hour].push(fb.error_pct);
  }

  for (const [hourStr, errors] of Object.entries(hourlyErrors)) {
    const hour = parseInt(hourStr);
    const avgError = errors.reduce((s, e) => s + e, 0) / errors.length;
    if (avgError > 25 && errors.length >= 3) {
      patterns.push({
        pattern: `High error at hour ${hour}:00`,
        frequency: errors.length,
        impact: "low",
        recommendation: `Consider time-of-day weight adjustment for ${hour}:00`,
      });
    }
  }

  // Pattern 4: Drift events
  const driftEvents = events.filter(e => e.event_type === "drift_detected");
  if (driftEvents.length >= 3) {
    patterns.push({
      pattern: "Frequent distribution drift",
      frequency: driftEvents.length,
      impact: "high",
      recommendation: "Increase retraining frequency and widen feature importance window",
    });
  }

  // Overall health score
  const recentFeedback = feedback.slice(0, 50);
  const avgError = recentFeedback.length > 0
    ? recentFeedback.reduce((s, f) => s + f.error_pct, 0) / recentFeedback.length
    : 50;
  const overallHealth = Math.max(0, 1 - avgError / 100);

  // Confidence score (based on recent calibration)
  const recentEvents = events.slice(0, 20);
  const calibrationEvents = recentEvents.filter(e => e.event_type === "miscalibrated");
  const confidenceScore = Math.max(0, 1 - calibrationEvents.length * 0.15);

  // Adaptation needed?
  const adaptationNeeded = patterns.some(p => p.impact === "high") || overallHealth < 0.6;

  return { patterns, overallHealth, confidenceScore, adaptationNeeded };
}

// ── Adaptive Strategy Adjustment ───────────────────────────

export async function adaptStrategy(tenantId: string): Promise<AdaptiveStrategy | null> {
  const db = await getDb();
  const reflection = await runSelfReflection(tenantId);

  if (!reflection.adaptationNeeded) return null;

  const adjustments: AdaptiveStrategy["adjustments"] = [];
  const activeModel = await db.prepare(`
    SELECT * FROM ltv_models WHERE tenant_id = ? AND status = 'active' LIMIT 1
  `).get(tenantId) as any;

  if (!activeModel) return null;

  const weights = JSON.parse(activeModel.weights);

  // Adjust based on patterns
  for (const pattern of reflection.patterns) {
    if (pattern.pattern === "Systematic over-prediction") {
      weights.intercept *= 0.9;
      adjustments.push({
        parameter: "intercept",
        oldValue: weights.intercept / 0.9,
        newValue: weights.intercept,
        reason: "Correcting systematic over-prediction",
      });
    }

    if (pattern.pattern === "Systematic under-prediction") {
      weights.intercept *= 1.1;
      adjustments.push({
        parameter: "intercept",
        oldValue: weights.intercept / 1.1,
        newValue: weights.intercept,
        reason: "Correcting systematic under-prediction",
      });
    }
  }

  if (adjustments.length === 0) return null;

  // Store adapted weights
  await db.prepare(`
    UPDATE ltv_models SET weights = ? WHERE id = ?
  `).run(JSON.stringify(weights), activeModel.id);

  // Log the adaptation
  const strategy: AdaptiveStrategy = {
    tenantId,
    currentStrategy: "adaptive_continuous",
    triggerEvent: reflection.patterns[0]?.pattern || "health_threshold",
    adjustments,
    appliedAt: new Date().toISOString(),
  };

  await db.prepare(`
    INSERT INTO metacognition_log (tenant_id, model_id, event_type, insight, action_taken, factors_affected, metadata, created_at)
    VALUES (?, ?, 'strategy_adapted', ?, ?, ?, ?, datetime('now'))
  `).run(
    tenantId,
    activeModel.id,
    `Adapted strategy: ${adjustments.map(a => a.reason).join("; ")}`,
    "adaptive_weights",
    JSON.stringify(adjustments.map(a => a.parameter)),
    JSON.stringify(strategy)
  );

  eventBus.emit("metacognition.strategy_adapted", {
    tenantId,
    adjustments: adjustments.length,
    triggerEvent: strategy.triggerEvent,
  });

  return strategy;
}

// ── Metacognition Dashboard Data ───────────────────────────

export async function getMetacognitionDashboard(tenantId: string): Promise<{
  overallHealth: number;
  confidenceScore: number;
  adaptationNeeded: boolean;
  patterns: any[];
  calibration: ConfidenceCalibration[];
  factorAttributions: FactorAttribution[];
  recentEvents: MetacognitionEvent[];
  feedbackSummary: {
    totalFeedback: number;
    avgError: number;
    medianError: number;
  };
}> {
  const db = await getDb();
  const reflection = await runSelfReflection(tenantId);
  const calibration = await analyzeConfidenceCalibration(tenantId);
  const factorAttributions = await analyzeFactorAttribution(tenantId);
  const recentEvents = await db.prepare(`
    SELECT * FROM metacognition_log
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(tenantId) as any[];

  const feedback = await db.prepare(`
    SELECT error_pct FROM prediction_feedback WHERE tenant_id = ?
  `).all(tenantId) as any[];

  const totalFeedback = feedback.length;
  const avgError = totalFeedback > 0 ? feedback.reduce((s: number, f: any) => s + f.error_pct, 0) / totalFeedback : 0;
  const sorted = [...feedback].sort((a: any, b: any) => a.error_pct - b.error_pct);
  const medianError = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)].error_pct : 0;

  return {
    overallHealth: reflection.overallHealth,
    confidenceScore: reflection.confidenceScore,
    adaptationNeeded: reflection.adaptationNeeded,
    patterns: reflection.patterns,
    calibration,
    factorAttributions,
    recentEvents,
    feedbackSummary: { totalFeedback, avgError, medianError },
  };
}

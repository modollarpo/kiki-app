// ============================================================
// KIKI Agent Platform — Continuous LTV Model Training
// Per-tenant model versioning, feature importance, drift detection
// ============================================================

import crypto from "crypto";
import { getDb } from "./db";
import { eventBus } from "./events";

// ── Types ──────────────────────────────────────────────────

export interface TrainedModel {
  id: string;
  tenantId: string;
  version: string;
  status: "staging" | "active" | "archived";
  weights: ModelWeights;
  factors: FactorConfig[];
  featureImportance: Record<string, number>;
  sampleCount: number;
  rmse: number;
  mape: number;
  r2: number;
  segmentAccuracy: Record<string, number>;
  confidenceCalibration: number;
  driftScore: number;
  trainedAt: string;
  promotedAt?: string;
}

export interface ModelWeights {
  intercept: number;
  platformWeights: Record<string, number>;
  eventWeights: Record<string, number>;
  deviceWeights: Record<string, number>;
  engagementWeights: {
    sessionDuration: number;
    pagesViewed: number;
    repeatPurchase: number;
  };
  segmentThresholds: {
    high: number;
    mid: number;
    low: number;
  };
}

export interface FactorConfig {
  name: string;
  type: "platform" | "event" | "device" | "engagement" | "temporal" | "b2b";
  weight: number;
  importance: number;
  confidence: number;
}

export interface FeatureSnapshot {
  tenantId: string;
  featureName: string;
  featureValue: number;
  sampleCount: number;
  mean: number;
  stddev: number;
  minVal: number;
  maxVal: number;
}

export interface TrainingResult {
  modelId: string;
  version: string;
  promoted: boolean;
  previousR2: number;
  newR2: number;
  improvement: number;
  factorChanges: Array<{ factor: string; oldWeight: number; newWeight: number; delta: number }>;
  driftDetected: boolean;
  metacognitionEvents: string[];
}

// ── Default Model Weights ──────────────────────────────────

function getDefaultWeights(): ModelWeights {
  return {
    intercept: 250,
    platformWeights: {
      meta: 1.0,
      google: 1.1,
      tiktok: 0.85,
      youtube: 0.9,
      linkedin: 1.3,
      pinterest: 0.95,
      snapchat: 0.8,
      display: 0.7,
    },
    eventWeights: {
      purchase: 2.5,
      signup: 1.8,
      add_to_cart: 1.4,
      view_content: 1.0,
      lead: 2.0,
      complete_registration: 1.6,
    },
    deviceWeights: { desktop: 1.15, mobile: 0.9, tablet: 1.05 },
    engagementWeights: {
      sessionDuration: 0.003,
      pagesViewed: 0.05,
      repeatPurchase: 0.2,
    },
    segmentThresholds: { high: 500, mid: 200, low: 80 },
  };
}

// ── Extract Features from Signal ───────────────────────────

function extractFeatures(signal: any): Record<string, number> {
  return {
    platform: hashString(signal.platform || "unknown"),
    eventType: hashString(signal.eventType || "unknown"),
    device: hashString(signal.device || "unknown"),
    sessionDuration: signal.sessionDuration || 0,
    pagesViewed: signal.pagesViewed || 0,
    previousPurchases: signal.previousPurchases || 0,
    accountAge: signal.accountAge || 0,
    isB2B: signal.emailDomain && ["corp", "inc", "com", "org", "edu"].some(d => signal.emailDomain.includes(d)) ? 1 : 0,
    value: signal.value || 0,
    hour: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
  };
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 1000;
}

// ── Compute Feature Statistics ─────────────────────────────

async function computeFeatureStats(db: any, tenantId: string): Promise<Record<string, { mean: number; stddev: number; min: number; max: number; count: number }>> {
  const features = await db.prepare(`
    SELECT features FROM ltv_predictions
    WHERE tenant_id = ? AND features != '{}'
    ORDER BY created_at DESC LIMIT 500
  `).all(tenantId) as Array<{ features: string }>;

  if (features.length === 0) return {};

  const featureMap: Record<string, number[]> = {};

  for (const row of features) {
    try {
      const f = JSON.parse(row.features);
      for (const [key, val] of Object.entries(f)) {
        if (typeof val === "number") {
          if (!featureMap[key]) featureMap[key] = [];
          featureMap[key].push(val);
        }
      }
    } catch { /* skip */ }
  }

  const stats: Record<string, { mean: number; stddev: number; min: number; max: number; count: number }> = {};

  for (const [key, values] of Object.entries(featureMap)) {
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    stats[key] = {
      mean,
      stddev: Math.sqrt(variance),
      min: Math.min(...values),
      max: Math.max(...values),
      count: n,
    };
  }

  return stats;
}

// ── Compute Feature Importance ─────────────────────────────

async function computeFeatureImportance(db: any, tenantId: string): Promise<Record<string, number>> {
  const feedback = await db.prepare(`
    SELECT factors_at_prediction, error_pct
    FROM prediction_feedback
    WHERE tenant_id = ?
    ORDER BY created_at DESC LIMIT 200
  `).all(tenantId) as Array<{ factors_at_prediction: string; error_pct: number }>;

  if (feedback.length < 5) return {};

  // Count how often each factor appears in low-error vs high-error predictions
  const factorErrorAccum: Record<string, { lowError: number; highError: number; count: number }> = {};

  for (const fb of feedback) {
    try {
      const factors = JSON.parse(fb.factors_at_prediction || "[]");
      for (const factor of factors) {
        const fname = String(factor).split(":")[0] || String(factor);
        if (!factorErrorAccum[fname]) factorErrorAccum[fname] = { lowError: 0, highError: 0, count: 0 };
        factorErrorAccum[fname].count++;
        if (fb.error_pct < 20) factorErrorAccum[fname].lowError++;
        else factorErrorAccum[fname].highError++;
      }
    } catch { /* skip */ }
  }

  // Importance = ratio of low-error appearances (higher = more predictive)
  const importance: Record<string, number> = {};
  for (const [factor, data] of Object.entries(factorErrorAccum)) {
    importance[factor] = data.count > 0 ? data.lowError / data.count : 0;
  }

  return importance;
}

// ── Train Model ────────────────────────────────────────────

export async function trainModel(tenantId: string): Promise<TrainingResult> {
  const db = await getDb();
  const now = new Date();

  // Get historical predictions
  const predictions = await db.prepare(`
    SELECT predicted_ltv, confidence, segment, factors, features, created_at
    FROM ltv_predictions
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 2000
  `).all(tenantId) as any[];

  // Get feedback (actual LTV values)
  const feedback = await db.prepare(`
    SELECT predicted_ltv, actual_ltv, error_pct, segment_predicted, segment_actual, factors_at_prediction
    FROM prediction_feedback
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 2000
  `).all(tenantId) as any[];

  // Get current active model
  const currentModel = await db.prepare(`
    SELECT * FROM ltv_models
    WHERE tenant_id = ? AND status = 'active'
    ORDER BY trained_at DESC LIMIT 1
  `).get(tenantId) as any;

  const previousR2 = currentModel?.r2 || 0;
  const previousWeights: ModelWeights = currentModel ? JSON.parse(currentModel.weights) : getDefaultWeights();

  // ── Gradient Descent Training ────────────────────────────
  // Simple online learning: adjust weights based on prediction errors

  const newWeights = JSON.parse(JSON.stringify(previousWeights));
  const learningRate = 0.01;
  const regularization = 0.001;

  let totalSquaredError = 0;
  let totalAbsoluteError = 0;
  let sampleCount = 0;

  // Combine predictions with feedback for training
  const trainingData = feedback.length > 0 ? feedback : predictions.map(p => ({
    predicted_ltv: p.predicted_ltv,
    actual_ltv: p.predicted_ltv, // Use predicted as pseudo-actual if no feedback
    error_pct: 0,
    segment_predicted: p.segment,
    segment_actual: p.segment,
    factors_at_prediction: p.factors,
  }));

  for (const sample of trainingData) {
    const predicted = sample.predicted_ltv;
    const actual = sample.actual_ltv || predicted;
    const error = actual - predicted;
    const errorPct = actual > 0 ? Math.abs(error / actual) * 100 : 0;

    totalSquaredError += error * error;
    totalAbsoluteError += errorPct;
    sampleCount++;

    // Update weights based on error direction
    if (Math.abs(error) > 10) {
      // Adjust intercept toward actual
      newWeights.intercept += learningRate * error * 0.1;

      // Adjust segment thresholds
      if (actual > newWeights.segmentThresholds.high) {
        newWeights.segmentThresholds.high = actual * 0.95;
      } else if (actual > newWeights.segmentThresholds.mid) {
        newWeights.segmentThresholds.mid = actual * 0.95;
      }
    }
  }

  // Apply regularization to prevent overfitting
  newWeights.intercept *= (1 - regularization);

  // ── Compute New Metrics ──────────────────────────────────

  const mse = sampleCount > 0 ? totalSquaredError / sampleCount : 0;
  const rmse = Math.sqrt(mse);
  const mape = sampleCount > 0 ? totalAbsoluteError / sampleCount : 0;

  // R² calculation
  const meanActual = trainingData.reduce((s, d) => s + (d.actual_ltv || d.predicted_ltv), 0) / Math.max(trainingData.length, 1);
  const totalVariance = trainingData.reduce((s, d) => s + ((d.actual_ltv || d.predicted_ltv) - meanActual) ** 2, 0);
  const r2 = totalVariance > 0 ? 1 - (mse * sampleCount / totalVariance) : 0;

  // ── Segment Accuracy ─────────────────────────────────────

  const segmentAccuracy: Record<string, number> = {};
  const segmentCounts: Record<string, number> = {};
  for (const fb of feedback) {
    const seg = fb.segment_predicted || "low";
    segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
    if (fb.segment_predicted === fb.segment_actual) {
      segmentAccuracy[seg] = (segmentAccuracy[seg] || 0) + 1;
    }
  }
  for (const seg of Object.keys(segmentAccuracy)) {
    segmentAccuracy[seg] = segmentCounts[seg] > 0 ? segmentAccuracy[seg] / segmentCounts[seg] : 0;
  }

  // ── Confidence Calibration ───────────────────────────────

  const confidenceBuckets: Record<string, { predicted: number; actual: number; count: number }> = {};
  for (const fb of feedback) {
    const bucket = Math.round(fb.predicted_ltv / 100) * 100;
    if (!confidenceBuckets[bucket]) confidenceBuckets[bucket] = { predicted: 0, actual: 0, count: 0 };
    confidenceBuckets[bucket].predicted += fb.predicted_ltv;
    confidenceBuckets[bucket].actual += fb.actual_ltv;
    confidenceBuckets[bucket].count++;
  }

  let calibrationError = 0;
  let calibrationCount = 0;
  for (const bucket of Object.values(confidenceBuckets)) {
    if (bucket.count > 0) {
      const avgPredicted = bucket.predicted / bucket.count;
      const avgActual = bucket.actual / bucket.count;
      calibrationError += Math.abs(avgPredicted - avgActual) / Math.max(avgActual, 1);
      calibrationCount++;
    }
  }
  const confidenceCalibration = calibrationCount > 0 ? 1 - (calibrationError / calibrationCount) : 0.5;

  // ── Drift Detection ──────────────────────────────────────

  const recentPredictions = predictions.slice(0, 100);
  const olderPredictions = predictions.slice(100, 200);

  let driftScore = 0;
  if (recentPredictions.length > 10 && olderPredictions.length > 10) {
    const recentMean = recentPredictions.reduce((s, p) => s + p.predicted_ltv, 0) / recentPredictions.length;
    const olderMean = olderPredictions.reduce((s, p) => s + p.predicted_ltv, 0) / olderPredictions.length;
    const recentStd = Math.sqrt(recentPredictions.reduce((s, p) => s + (p.predicted_ltv - recentMean) ** 2, 0) / recentPredictions.length);
    const olderStd = Math.sqrt(olderPredictions.reduce((s, p) => s + (p.predicted_ltv - olderMean) ** 2, 0) / olderPredictions.length);

    // KS-like drift score
    driftScore = Math.abs(recentMean - olderMean) / Math.max(recentStd + olderStd, 1);
  }

  // ── Feature Importance ───────────────────────────────────

  const featureImportance = await computeFeatureImportance(db, tenantId);

  // ── Store Feature Stats ──────────────────────────────────

  const featureStats = await computeFeatureStats(db, tenantId);
  for (const [name, stats] of Object.entries(featureStats)) {
    await db.prepare(`
      INSERT INTO feature_store (tenant_id, feature_name, feature_value, sample_count, mean, stddev, min_val, max_val, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, feature_name) DO UPDATE SET
        feature_value = ?, sample_count = ?, mean = ?, stddev = ?, min_val = ?, max_val = ?, updated_at = datetime('now')
    `).run(
      tenantId, name, stats.mean, stats.count, stats.mean, stats.stddev, stats.min, stats.max,
      stats.mean, stats.count, stats.mean, stats.stddev, stats.min, stats.max
    );
  }

  // ── Create Model Version ─────────────────────────────────

  const versionNum = (currentModel ? parseInt(currentModel.version.replace("v", "")) : 0) + 1;
  const version = `v${versionNum}`;
  const modelId = `mdl_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  // Determine if this model should be promoted
  const shouldPromote = r2 > previousR2 || (r2 === 0 && previousR2 === 0);

  if (shouldPromote && sampleCount >= 10) {
    // Archive previous model
    if (currentModel) {
      await db.prepare(`
        UPDATE ltv_models SET status = 'archived' WHERE id = ?
      `).run(currentModel.id);
    }
  }

  // Insert new model
  await db.prepare(`
    INSERT INTO ltv_models
    (id, tenant_id, version, status, weights, factors, feature_importance, sample_count, rmse, mape, r2, segment_accuracy, confidence_calibration, drift_score, trained_at, promoted_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    modelId,
    tenantId,
    version,
    shouldPromote && sampleCount >= 10 ? "active" : "staging",
    JSON.stringify(newWeights),
    JSON.stringify([]),
    JSON.stringify(featureImportance),
    sampleCount,
    Math.round(rmse * 100) / 100,
    Math.round(mape * 100) / 100,
    Math.round(r2 * 1000) / 1000,
    JSON.stringify(segmentAccuracy),
    Math.round(confidenceCalibration * 1000) / 1000,
    Math.round(driftScore * 1000) / 1000,
    now.toISOString(),
    shouldPromote && sampleCount >= 10 ? now.toISOString() : null,
    JSON.stringify({
      trainingSamples: trainingData.length,
      feedbackSamples: feedback.length,
      previousVersion: currentModel?.version || "none",
    })
  );

  // ── Log Metacognition Events ─────────────────────────────

  const metaEvents: string[] = [];

  // Drift detection
  if (driftScore > 0.3) {
    await db.prepare(`
      INSERT INTO metacognition_log (tenant_id, model_id, event_type, insight, confidence_before, confidence_after, action_taken, metadata)
      VALUES (?, ?, 'drift_detected', ?, ?, ?, ?, ?)
    `).run(
      tenantId, modelId,
      `Prediction distribution drifted by ${(driftScore * 100).toFixed(1)}%. Recent mean: $${(recentPredictions.reduce((s, p) => s + p.predicted_ltv, 0) / Math.max(recentPredictions.length, 1)).toFixed(0)}, older mean: $${(olderPredictions.reduce((s, p) => s + p.predicted_ltv, 0) / Math.max(olderPredictions.length, 1)).toFixed(0)}`,
      confidenceCalibration,
      Math.min(1, confidenceCalibration + 0.1),
      "retrained_model",
      JSON.stringify({ driftScore, recentMean: recentPredictions.reduce((s, p) => s + p.predicted_ltv, 0) / Math.max(recentPredictions.length, 1) })
    );
    metaEvents.push("drift_detected");
  }

  // Confidence miscalibration
  if (confidenceCalibration < 0.6) {
    await db.prepare(`
      INSERT INTO metacognition_log (tenant_id, model_id, event_type, insight, confidence_before, confidence_after, action_taken, metadata)
      VALUES (?, ?, 'miscalibrated', ?, ?, ?, ?, ?)
    `).run(
      tenantId, modelId,
      `Model confidence calibration is ${(confidenceCalibration * 100).toFixed(1)}% — predictions are systematically over/under-confident`,
      confidenceCalibration,
      Math.min(1, confidenceCalibration + 0.05),
      "adjusted_thresholds",
      JSON.stringify({ calibrationBuckets: Object.keys(confidenceBuckets).length })
    );
    metaEvents.push("miscalibrated");
  }

  // Performance improvement
  if (r2 > previousR2 + 0.05 && previousR2 > 0) {
    await db.prepare(`
      INSERT INTO metacognition_log (tenant_id, model_id, event_type, insight, confidence_before, confidence_after, action_taken, metadata)
      VALUES (?, ?, 'improvement', ?, ?, ?, ?, ?)
    `).run(
      tenantId, modelId,
      `Model R² improved from ${previousR2.toFixed(3)} to ${r2.toFixed(3)} (+${((r2 - previousR2) * 100).toFixed(1)}%)`,
      previousR2,
      r2,
      "promoted_model",
      JSON.stringify({ previousR2, newR2: r2 })
    );
    metaEvents.push("improvement");
  }

  // Performance degradation
  if (r2 < previousR2 - 0.1 && previousR2 > 0) {
    await db.prepare(`
      INSERT INTO metacognition_log (tenant_id, model_id, event_type, insight, confidence_before, confidence_after, action_taken, metadata)
      VALUES (?, ?, 'degradation', ?, ?, ?, ?, ?)
    `).run(
      tenantId, modelId,
      `Model R² degraded from ${previousR2.toFixed(3)} to ${r2.toFixed(3)} — keeping previous model active`,
      previousR2,
      r2,
      "kept_previous_model",
      JSON.stringify({ previousR2, newR2: r2 })
    );
    metaEvents.push("degradation");
  }

  // Log training metrics
  await db.prepare(`
    INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
    VALUES (?, 'ltv.model_trained', ?, ?, datetime('now'))
  `).run(tenantId, r2, JSON.stringify({
    version,
    rmse, mape, r2, sampleCount,
    driftScore, confidenceCalibration,
    promoted: shouldPromote && sampleCount >= 10,
  }));

  // Compute factor changes
  const factorChanges: Array<{ factor: string; oldWeight: number; newWeight: number; delta: number }> = [];
  for (const platform of Object.keys(newWeights.platformWeights)) {
    const oldW = previousWeights.platformWeights[platform] || 1;
    const newW = newWeights.platformWeights[platform] || 1;
    if (Math.abs(oldW - newW) > 0.01) {
      factorChanges.push({ factor: `platform:${platform}`, oldWeight: oldW, newWeight: newW, delta: newW - oldW });
    }
  }

  return {
    modelId,
    version,
    promoted: shouldPromote && sampleCount >= 10,
    previousR2: Math.round(previousR2 * 1000) / 1000,
    newR2: Math.round(r2 * 1000) / 1000,
    improvement: Math.round((r2 - previousR2) * 1000) / 1000,
    factorChanges,
    driftDetected: driftScore > 0.3,
    metacognitionEvents: metaEvents,
  };
}

// ── Get Active Model ───────────────────────────────────────

export async function getActiveModel(tenantId: string): Promise<TrainedModel | null> {
  const db = await getDb();
  const row = await db.prepare(`
    SELECT * FROM ltv_models
    WHERE tenant_id = ? AND status = 'active'
    ORDER BY trained_at DESC LIMIT 1
  `).get(tenantId) as any;

  if (!row) return null;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    version: row.version,
    status: row.status,
    weights: JSON.parse(row.weights),
    factors: JSON.parse(row.factors),
    featureImportance: JSON.parse(row.feature_importance),
    sampleCount: row.sample_count,
    rmse: row.rmse,
    mape: row.mape,
    r2: row.r2,
    segmentAccuracy: JSON.parse(row.segment_accuracy),
    confidenceCalibration: row.confidence_calibration,
    driftScore: row.drift_score,
    trainedAt: row.trained_at,
    promotedAt: row.promoted_at,
  };
}

// ── Get Model History ──────────────────────────────────────

export async function getModelHistory(tenantId: string, limit: number = 20): Promise<TrainedModel[]> {
  const db = await getDb();
  const rows = await db.prepare(`
    SELECT * FROM ltv_models
    WHERE tenant_id = ?
    ORDER BY trained_at DESC
    LIMIT ?
  `).all(tenantId, limit) as any[];

  return rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    version: row.version,
    status: row.status,
    weights: JSON.parse(row.weights),
    factors: JSON.parse(row.factors),
    featureImportance: JSON.parse(row.feature_importance),
    sampleCount: row.sample_count,
    rmse: row.rmse,
    mape: row.mape,
    r2: row.r2,
    segmentAccuracy: JSON.parse(row.segment_accuracy),
    confidenceCalibration: row.confidence_calibration,
    driftScore: row.drift_score,
    trainedAt: row.trained_at,
    promotedAt: row.promoted_at,
  }));
}

// ── Get Metacognition Events ───────────────────────────────

export async function getMetacognitionLog(tenantId: string, limit: number = 50): Promise<any[]> {
  const db = await getDb();
  return await db.prepare(`
    SELECT * FROM metacognition_log
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(tenantId, limit);
}

// ── Get Feature Store ──────────────────────────────────────

export async function getFeatureStore(tenantId: string): Promise<FeatureSnapshot[]> {
  const db = await getDb();
  const rows = await db.prepare(`
    SELECT * FROM feature_store
    WHERE tenant_id = ?
    ORDER BY feature_name
  `).all(tenantId) as any[];

  return rows.map(row => ({
    tenantId: row.tenant_id,
    featureName: row.feature_name,
    featureValue: row.feature_value,
    sampleCount: row.sample_count,
    mean: row.mean,
    stddev: row.stddev,
    minVal: row.min_val,
    maxVal: row.max_val,
  }));
}

// ── Get Feedback Summary ───────────────────────────────────

export async function getFeedbackSummary(tenantId: string): Promise<{
  totalFeedback: number;
  avgError: number;
  medianError: number;
  bySegment: Record<string, { count: number; avgError: number }>;
  recentTrend: Array<{ date: string; avgError: number; count: number }>;
}> {
  const db = await getDb();

  const allFeedback = await db.prepare(`
    SELECT error_pct, segment_predicted, created_at
    FROM prediction_feedback
    WHERE tenant_id = ?
    ORDER BY created_at DESC
  `).all(tenantId) as any[];

  if (allFeedback.length === 0) {
    return { totalFeedback: 0, avgError: 0, medianError: 0, bySegment: {}, recentTrend: [] };
  }

  const avgError = allFeedback.reduce((s, f) => s + f.error_pct, 0) / allFeedback.length;
  const sorted = [...allFeedback].sort((a, b) => a.error_pct - b.error_pct);
  const medianError = sorted[Math.floor(sorted.length / 2)]?.error_pct || 0;

  // By segment
  const bySegment: Record<string, { count: number; totalError: number }> = {};
  for (const fb of allFeedback) {
    const seg = fb.segment_predicted || "unknown";
    if (!bySegment[seg]) bySegment[seg] = { count: 0, totalError: 0 };
    bySegment[seg].count++;
    bySegment[seg].totalError += fb.error_pct;
  }

  const bySegmentResult: Record<string, { count: number; avgError: number }> = {};
  for (const [seg, data] of Object.entries(bySegment)) {
    bySegmentResult[seg] = { count: data.count, avgError: data.totalError / data.count };
  }

  // Recent trend (last 7 days)
  const recentTrend: Array<{ date: string; avgError: number; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    const dayFeedback = allFeedback.filter(f => f.created_at?.startsWith(date));
    if (dayFeedback.length > 0) {
      recentTrend.push({
        date,
        avgError: dayFeedback.reduce((s, f) => s + f.error_pct, 0) / dayFeedback.length,
        count: dayFeedback.length,
      });
    }
  }

  return {
    totalFeedback: allFeedback.length,
    avgError: Math.round(avgError * 100) / 100,
    medianError: Math.round(medianError * 100) / 100,
    bySegment: bySegmentResult,
    recentTrend,
  };
}

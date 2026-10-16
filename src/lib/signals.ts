// ============================================================
// Signal Processing Pipeline — Enriches conversion signals with LTV
// Processes events from ad platforms, predicts LTV, dispatches
// ============================================================

import { getDb, genId } from "./db";
import { predictLTV, type SignalData } from "./ltv-engine";
import { resolveCustomer } from "./identity";

export interface ProcessedSignal {
  id: string;
  platform: string;
  eventType: string;
  value: number;
  ltvPredicted: number;
  ltvConfidence: number;
  segment: string;
  bidMultiplier: number;
  enriched: boolean;
}

// ── Ingest a single signal ────────────────────────────────
export async function ingestSignal(tenantId: string, signal: SignalData): Promise<ProcessedSignal> {
  const db = await getDb();
  const id = genId("sig");

  // Resolve identity from signal (email/phone may be on the signal itself
  // or nested in raw_data) so signals/predictions link to a customer profile.
  const rawEmail = signal.email ?? (signal as { rawData?: { email?: string } }).rawData?.email;
  const rawPhone = signal.phone ?? (signal as { rawData?: { phone?: string } }).rawData?.phone;
  const resolved = await resolveCustomer(tenantId, rawEmail, rawPhone);
  const customerId = resolved.customerId;

  // Predict LTV
  const prediction = await predictLTV(signal, tenantId);

  // Store signal
  await db.prepare(`
    INSERT INTO signals (id, tenant_id, campaign_id, platform, event_type, event_id, user_id, value, ltv_predicted, ltv_confidence, segment, bid_multiplier, enriched, customer_id, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id, tenantId, null, signal.platform, signal.eventType,
    signal.eventId || "", signal.userId || "", signal.value,
    prediction.predictedLTV, prediction.confidence,
    prediction.segment, prediction.recommendedBidMultiplier, customerId,
    JSON.stringify(signal)
  );

  // Store prediction
  await db.prepare(`
    INSERT INTO ltv_predictions (id, tenant_id, signal_id, predicted_ltv, confidence, horizon_days, features, customer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    genId("ltv"), tenantId, id, prediction.predictedLTV,
    prediction.confidence, prediction.horizonDays,
    JSON.stringify(prediction.factors), customerId
  );

  // Log metric
  await db.prepare("INSERT INTO system_metrics (metric_name, metric_value, tags) VALUES (?, ?, ?)")
    .run("signal.ingested", signal.value, JSON.stringify({ platform: signal.platform, segment: prediction.segment }));

  return {
    id,
    platform: signal.platform,
    eventType: signal.eventType,
    value: signal.value,
    ltvPredicted: prediction.predictedLTV,
    ltvConfidence: prediction.confidence,
    segment: prediction.segment,
    bidMultiplier: prediction.recommendedBidMultiplier,
    enriched: true,
  };
}

// ── Batch ingest ──────────────────────────────────────────
export async function ingestSignalBatch(tenantId: string, signals: SignalData[]): Promise<ProcessedSignal[]> {
  const results: ProcessedSignal[] = [];
  for (const signal of signals) {
    results.push(await ingestSignal(tenantId, signal));
  }
  return results;
}

// ── Get signal stats for a tenant ─────────────────────────
export interface RecentSignal {
  id: string;
  platform: string;
  eventType: string;
  value: number;
  ltvPredicted: number;
  ltvConfidence: number;
  segment: string;
  bidMultiplier: number;
  enriched: boolean;
  timestamp: string;
}

export interface SignalStats {
  totalSignals: number;
  todaySignals: number;
  processedSignals: number;
  avgPredictedLTV: number;
  avgConfidence: number;
  segmentBreakdown: { high: number; mid: number; low: number };
  platformBreakdown: Record<string, number>;
  recentSignals: RecentSignal[];
  processingRate: string;
}

export async function getSignalStats(tenantId: string): Promise<SignalStats> {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];

  const total = (await db.prepare("SELECT COUNT(*) as c FROM signals WHERE tenant_id = ?").get(tenantId) as { c: number }).c;
  const todayCount = (await db.prepare("SELECT COUNT(*) as c FROM signals WHERE tenant_id = ? AND created_at >= ?").get(tenantId, today) as { c: number }).c;
  const processed = (await db.prepare("SELECT COUNT(*) as c FROM signals WHERE tenant_id = ? AND enriched = 1").get(tenantId) as { c: number }).c;
  const avgLTV = (await db.prepare("SELECT AVG(ltv_predicted) as avg FROM signals WHERE tenant_id = ?").get(tenantId) as { avg: number }).avg || 0;
  const avgConf = (await db.prepare("SELECT AVG(ltv_confidence) as avg FROM signals WHERE tenant_id = ?").get(tenantId) as { avg: number }).avg || 0;

  const platformRows = await db.prepare(
    "SELECT platform, COUNT(*) as c FROM signals WHERE tenant_id = ? GROUP BY platform ORDER BY c DESC"
  ).all<{ platform: string; c: number }>(tenantId);
  const platformBreakdown: Record<string, number> = {};
  for (const r of platformRows) platformBreakdown[r.platform] = r.c;

  const segments = await db.prepare("SELECT ltv_predicted, ltv_confidence FROM signals WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100").all(tenantId) as Array<{ ltv_predicted: number; ltv_confidence: number }>;

  const high = segments.filter(s => s.ltv_predicted > 500).length;
  const mid = segments.filter(s => s.ltv_predicted > 200 && s.ltv_predicted <= 500).length;
  const low = segments.filter(s => s.ltv_predicted <= 200).length;

  const rows = await db.prepare(`
    SELECT id, platform, event_type, value, ltv_predicted, ltv_confidence, segment, bid_multiplier, enriched, created_at
    FROM signals WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 12
  `).all<{
    id: string; platform: string; event_type: string; value: number; ltv_predicted: number;
    ltv_confidence: number; segment: string; bid_multiplier: number; enriched: number; created_at: string;
  }>(tenantId);

  const recentSignals: RecentSignal[] = rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    eventType: r.event_type,
    value: r.value,
    ltvPredicted: r.ltv_predicted,
    ltvConfidence: r.ltv_confidence,
    segment: r.segment,
    bidMultiplier: r.bid_multiplier,
    enriched: Boolean(r.enriched),
    timestamp: r.created_at,
  }));

  return {
    totalSignals: total,
    todaySignals: todayCount,
    processedSignals: processed,
    avgPredictedLTV: Math.round(avgLTV * 100) / 100,
    avgConfidence: Math.round(avgConf * 1000) / 1000,
    segmentBreakdown: { high, mid, low },
    platformBreakdown,
    recentSignals,
    processingRate: `${Math.round(todayCount / Math.max(1, new Date().getHours() + 1))} sig/hr`,
  };
}

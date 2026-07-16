import crypto from "crypto";
import { getDb } from "./db";
import { logger } from "./logger";

export interface IncrementalityExperiment {
  id: string;
  campaignId: string;
  name: string;
  status: "active" | "paused" | "completed";
  holdoutPercentage: number;
  treatmentConversions: number;
  treatmentImpressions: number;
  treatmentSpend: number;
  treatmentRevenue: number;
  controlConversions: number;
  controlImpressions: number;
  controlSpend: number;
  controlRevenue: number;
  incrementalRoas: number;
  incrementalConversions: number;
  confidenceLevel: number;
}

export async function createExperiment(
  tenantId: string,
  campaignId: string,
  name: string,
  holdoutPercentage: number = 0.10
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO incrementality_experiments
    (id, tenant_id, campaign_id, name, holdout_percentage)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, tenantId, campaignId, name, holdoutPercentage);

  logger.info(`Created incrementality experiment`, { tenantId, campaignId, name, holdout: holdoutPercentage });
  return id;
}

export async function shouldHoldout(
  tenantId: string,
  campaignId: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();
  const experiment = await db.prepare(`
    SELECT id, holdout_percentage FROM incrementality_experiments
    WHERE tenant_id = ? AND campaign_id = ? AND status = 'active'
    LIMIT 1
  `).get(tenantId, campaignId) as { id: string; holdout_percentage: number } | undefined;

  if (!experiment) return false;

  const hash = crypto.createHash("sha256").update(`${experiment.id}:${userId}`).digest("hex");
  const bucket = parseInt(hash.slice(0, 8), 16) / 0xFFFFFFFF;
  return bucket < experiment.holdout_percentage;
}

export async function recordImpression(
  tenantId: string,
  experimentId: string,
  group: "treatment" | "control",
  impressions: number = 1
): Promise<void> {
  const db = await getDb();
  const field = group === "treatment" ? "treatment_impressions" : "control_impressions";
  await db.prepare(`
    UPDATE incrementality_experiments
    SET ${field} = ${field} + ?
    WHERE id = ? AND tenant_id = ?
  `).run(impressions, experimentId, tenantId);
}

export async function recordConversion(
  tenantId: string,
  experimentId: string,
  group: "treatment" | "control",
  revenue: number = 0
): Promise<void> {
  const db = await getDb();
  const convField = group === "treatment" ? "treatment_conversions" : "control_conversions";
  const revField = group === "treatment" ? "treatment_revenue" : "control_revenue";
  await db.prepare(`
    UPDATE incrementality_experiments
    SET ${convField} = ${convField} + 1, ${revField} = ${revField} + ?
    WHERE id = ? AND tenant_id = ?
  `).run(revenue, experimentId, tenantId);
}

export async function calculateIncrementality(
  tenantId: string,
  experimentId: string
): Promise<IncrementalityExperiment> {
  const db = await getDb();
  const exp = await db.prepare(`
    SELECT * FROM incrementality_experiments WHERE id = ? AND tenant_id = ?
  `).get(experimentId, tenantId) as any;

  if (!exp) throw new Error(`Experiment ${experimentId} not found`);

  const treatmentCpa = exp.treatment_conversions > 0 ? exp.treatment_spend / exp.treatment_conversions : 0;
  const controlCpa = exp.control_conversions > 0 ? exp.control_spend / exp.control_conversions : 0;

  const incrementalConversions = exp.treatment_conversions - (exp.control_conversions * (exp.holdout_percentage / (1 - exp.holdout_percentage)));
  const incrementalRevenue = exp.treatment_revenue - (exp.control_revenue * (exp.holdout_percentage / (1 - exp.holdout_percentage)));
  const incrementalRoas = exp.treatment_spend > 0 ? incrementalRevenue / exp.treatment_spend : 0;

  // Simple confidence calculation based on sample size
  const totalSamples = exp.treatment_conversions + exp.control_conversions;
  const confidenceLevel = Math.min(0.99, totalSamples / (totalSamples + 100));

  await db.prepare(`
    UPDATE incrementality_experiments
    SET incremental_roas = ?, incremental_conversions = ?, confidence_level = ?
    WHERE id = ?
  `).run(incrementalRoas, incrementalConversions, confidenceLevel, experimentId);

  return {
    id: exp.id,
    campaignId: exp.campaign_id,
    name: exp.name,
    status: exp.status,
    holdoutPercentage: exp.holdout_percentage,
    treatmentConversions: exp.treatment_conversions,
    treatmentImpressions: exp.treatment_impressions,
    treatmentSpend: exp.treatment_spend,
    treatmentRevenue: exp.treatment_revenue,
    controlConversions: exp.control_conversions,
    controlImpressions: exp.control_impressions,
    controlSpend: exp.control_spend,
    controlRevenue: exp.control_revenue,
    incrementalRoas,
    incrementalConversions,
    confidenceLevel,
  };
}

export async function getExperimentResults(
  tenantId: string,
  campaignId?: string
): Promise<IncrementalityExperiment[]> {
  const db = await getDb();
  const query = campaignId
    ? "SELECT * FROM incrementality_experiments WHERE tenant_id = ? AND campaign_id = ? ORDER BY created_at DESC"
    : "SELECT * FROM incrementality_experiments WHERE tenant_id = ? ORDER BY created_at DESC";
  const params = campaignId ? [tenantId, campaignId] : [tenantId];

  const rows = await db.prepare(query).all(...params) as any[];
  return rows.map(r => ({
    id: r.id,
    campaignId: r.campaign_id,
    name: r.name,
    status: r.status,
    holdoutPercentage: r.holdout_percentage,
    treatmentConversions: r.treatment_conversions,
    treatmentImpressions: r.treatment_impressions,
    treatmentSpend: r.treatment_spend,
    treatmentRevenue: r.treatment_revenue,
    controlConversions: r.control_conversions,
    controlImpressions: r.control_impressions,
    controlSpend: r.control_spend,
    controlRevenue: r.control_revenue,
    incrementalRoas: r.incremental_roas,
    incrementalConversions: r.incremental_conversions,
    confidenceLevel: r.confidence_level,
  }));
}

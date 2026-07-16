// ============================================================
// KIKI Agent Platform — LTV Feedback Loop
// Collects actual LTV from wallet transactions, updates predictions
// ============================================================

import { getDb } from "./db";
import { eventBus } from "./events";

// ── Collect Feedback from Wallet Transactions ──────────────

export async function collectWalletFeedback(tenantId: string): Promise<{
  newFeedbackCount: number;
  updatedPredictions: number;
  avgActualLtv: number;
}> {
  const db = await getDb();

  // Get wallet transactions (ground truth for LTV)
  const wallet = await db.prepare(`
    SELECT id FROM wallets WHERE tenant_id = ?
  `).get(tenantId) as any;

  if (!wallet) return { newFeedbackCount: 0, updatedPredictions: 0, avgActualLtv: 0 };

  // Get credit transactions (actual revenue per user)
  const transactions = await db.prepare(`
    SELECT
      campaign,
      SUM(amount) as total_revenue,
      MIN(created_at) as first_transaction,
      MAX(created_at) as last_transaction,
      COUNT(*) as transaction_count
    FROM wallet_transactions
    WHERE wallet_id = ? AND type = 'credit'
    GROUP BY campaign
  `).all(wallet.id) as any[];

  let newFeedbackCount = 0;
  let updatedPredictions = 0;
  let totalActualLtv = 0;

  for (const tx of transactions) {
    const actualLtv = tx.total_revenue;
    totalActualLtv += actualLtv;

    // Find predictions that match this campaign's timeframe
    const predictions = await db.prepare(`
      SELECT id, predicted_ltv, confidence, segment, factors
      FROM ltv_predictions
      WHERE tenant_id = ?
      AND created_at BETWEEN ? AND ?
      AND actual_ltv IS NULL
    `).all(
      tenantId,
      tx.first_transaction,
      tx.last_transaction
    ) as any[];

    for (const pred of predictions) {
      // Check if feedback already exists
      const existingFeedback = await db.prepare(`
        SELECT id FROM prediction_feedback
        WHERE prediction_id = ?
      `).get(pred.id) as any;

      if (existingFeedback) continue;

      // Calculate error
      const errorPct = pred.predicted_ltv > 0
        ? Math.abs(pred.predicted_ltv - actualLtv) / actualLtv * 100
        : 100;

      // Determine actual segment
      let actualSegment = "low";
      if (actualLtv > 500) actualSegment = "high";
      else if (actualLtv > 200) actualSegment = "mid";
      else if (actualLtv > 80) actualSegment = "low";
      else actualSegment = "churn_risk";

      // Store feedback
      const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.prepare(`
        INSERT INTO prediction_feedback
        (id, tenant_id, prediction_id, predicted_ltv, actual_ltv, error_pct, segment_predicted, segment_actual, factors_at_prediction, feedback_source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'wallet', datetime('now'))
      `).run(
        feedbackId,
        tenantId,
        pred.id,
        pred.predicted_ltv,
        actualLtv,
        Math.round(errorPct * 100) / 100,
        pred.segment,
        actualSegment,
        pred.factors
      );

      // Update the original prediction with actual LTV
      await db.prepare(`
        UPDATE ltv_predictions
        SET actual_ltv = ?, feedback_at = datetime('now')
        WHERE id = ?
      `).run(actualLtv, pred.id);

      newFeedbackCount++;
      updatedPredictions++;
    }
  }

  // Log feedback collection
  if (newFeedbackCount > 0) {
    await db.prepare(`
      INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
      VALUES (?, 'ltv.feedback_collected', ?, ?, datetime('now'))
    `).run(tenantId, newFeedbackCount, JSON.stringify({
      transactions: transactions.length,
      avgActualLtv: transactions.length > 0 ? totalActualLtv / transactions.length : 0,
    }));

    eventBus.emit("ltv.feedback_collected", {
      tenantId,
      newFeedbackCount,
      updatedPredictions,
    });
  }

  return {
    newFeedbackCount,
    updatedPredictions,
    avgActualLtv: transactions.length > 0 ? totalActualLtv / transactions.length : 0,
  };
}

// ── Collect Feedback from Platform Data ────────────────────

export async function collectPlatformFeedback(tenantId: string): Promise<{
  newFeedbackCount: number;
  updatedPredictions: number;
}> {
  const db = await getDb();

  // Get campaigns with revenue data (from platform sync)
  const campaigns = await db.prepare(`
      SELECT id, platform, revenue, conversions, spend
    FROM campaigns
    WHERE tenant_id = ? AND revenue > 0
  `).all(tenantId) as any[];

  let newFeedbackCount = 0;
  let updatedPredictions = 0;

  for (const campaign of campaigns) {
    const actualLtv = campaign.conversions > 0 ? campaign.revenue / campaign.conversions : 0;
    if (actualLtv <= 0) continue;

    // Find predictions for this campaign
    const predictions = await db.prepare(`
      SELECT id, predicted_ltv, confidence, segment, factors, created_at
      FROM ltv_predictions
      WHERE tenant_id = ?
      AND actual_ltv IS NULL
      AND created_at >= datetime('now', '-30 days')
    `).all(tenantId) as any[];

    for (const pred of predictions) {
      const existingFeedback = await db.prepare(`
        SELECT id FROM prediction_feedback WHERE prediction_id = ?
      `).get(pred.id) as any;

      if (existingFeedback) continue;

      const errorPct = pred.predicted_ltv > 0
        ? Math.abs(pred.predicted_ltv - actualLtv) / actualLtv * 100
        : 100;

      let actualSegment = "low";
      if (actualLtv > 500) actualSegment = "high";
      else if (actualLtv > 200) actualSegment = "mid";
      else if (actualLtv > 80) actualSegment = "low";
      else actualSegment = "churn_risk";

      const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.prepare(`
        INSERT INTO prediction_feedback
        (id, tenant_id, prediction_id, predicted_ltv, actual_ltv, error_pct, segment_predicted, segment_actual, factors_at_prediction, feedback_source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'platform', datetime('now'))
      `).run(
        feedbackId,
        tenantId,
        pred.id,
        pred.predicted_ltv,
        actualLtv,
        Math.round(errorPct * 100) / 100,
        pred.segment,
        actualSegment,
        pred.factors
      );

      await db.prepare(`
        UPDATE ltv_predictions SET actual_ltv = ?, feedback_at = datetime('now') WHERE id = ?
      `).run(actualLtv, pred.id);

      newFeedbackCount++;
      updatedPredictions++;
    }
  }

  return { newFeedbackCount, updatedPredictions };
}

// ── Collect Feedback from Commerce Realized LTV ─────────────

export async function collectCommerceFeedback(tenantId: string): Promise<{
  newFeedbackCount: number;
  updatedPredictions: number;
  avgActualLtv: number;
}> {
  const db = await getDb();

  // Customers whose realized commerce LTV is a usable ground-truth signal:
  // realized revenue recorded within the last 30 days, with associated predictions.
  const customers = await db.prepare(`
    SELECT id, realized_ltv
    FROM customer_profiles
    WHERE tenant_id = ?
    AND realized_ltv > 0
    AND last_commerce_sync_at IS NOT NULL
    AND last_commerce_sync_at >= datetime('now', '-30 days')
  `).all(tenantId) as Array<{ id: string; realized_ltv: number }>;

  let newFeedbackCount = 0;
  let updatedPredictions = 0;
  let totalActualLtv = 0;

  for (const customer of customers) {
    const actualLtv = customer.realized_ltv;
    totalActualLtv += actualLtv;

    // Predictions linked to this customer still awaiting ground truth.
    const predictions = await db.prepare(`
      SELECT id, predicted_ltv, confidence, segment, factors
      FROM ltv_predictions
      WHERE tenant_id = ?
      AND customer_id = ?
      AND actual_ltv IS NULL
    `).all(tenantId, customer.id) as Array<{
      id: string;
      predicted_ltv: number;
      confidence: number;
      segment: string;
      factors: string;
    }>;

    for (const pred of predictions) {
      const existingFeedback = await db.prepare(`
        SELECT id FROM prediction_feedback WHERE prediction_id = ?
      `).get(pred.id);

      if (existingFeedback) continue;

      const errorPct = pred.predicted_ltv > 0
        ? Math.abs(pred.predicted_ltv - actualLtv) / actualLtv * 100
        : 100;

      let actualSegment = "low";
      if (actualLtv > 500) actualSegment = "high";
      else if (actualLtv > 200) actualSegment = "mid";
      else if (actualLtv > 80) actualSegment = "low";
      else actualSegment = "churn_risk";

      const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.prepare(`
        INSERT INTO prediction_feedback
        (id, tenant_id, prediction_id, predicted_ltv, actual_ltv, error_pct, segment_predicted, segment_actual, factors_at_prediction, feedback_source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'commerce', datetime('now'))
      `).run(
        feedbackId,
        tenantId,
        pred.id,
        pred.predicted_ltv,
        actualLtv,
        Math.round(errorPct * 100) / 100,
        pred.segment,
        actualSegment,
        pred.factors
      );

      await db.prepare(`
        UPDATE ltv_predictions
        SET actual_ltv = ?, feedback_at = datetime('now')
        WHERE id = ?
      `).run(actualLtv, pred.id);

      newFeedbackCount++;
      updatedPredictions++;
    }
  }

  if (newFeedbackCount > 0) {
    await db.prepare(`
      INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
      VALUES (?, 'ltv.commerce_feedback_collected', ?, ?, datetime('now'))
    `).run(
      tenantId,
      newFeedbackCount,
      JSON.stringify({
        customers: customers.length,
        avgActualLtv: customers.length > 0 ? totalActualLtv / customers.length : 0,
      })
    );

    eventBus.emit("ltv.commerce_feedback", {
      tenantId,
      newFeedbackCount,
      updatedPredictions,
    });
  }

  return {
    newFeedbackCount,
    updatedPredictions,
    avgActualLtv: customers.length > 0 ? totalActualLtv / customers.length : 0,
  };
}

// ── Feedback Summary ───────────────────────────────────────

export async function getFeedbackStats(tenantId: string): Promise<{
  totalFeedback: number;
  bySource: Record<string, number>;
  avgError: number;
  recentFeedback: number;
  predictionCoverage: number;
}> {
  const db = await getDb();

  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      feedback_source,
      AVG(error_pct) as avg_error
    FROM prediction_feedback
    WHERE tenant_id = ?
    GROUP BY feedback_source
  `).all(tenantId) as any[];

  const totalFeedback = stats.reduce((s, r) => s + r.total, 0);
  const bySource: Record<string, number> = {};
  let totalError = 0;
  for (const row of stats) {
    bySource[row.feedback_source] = row.total;
    totalError += row.avg_error * row.total;
  }

  const avgError = totalFeedback > 0 ? totalError / totalFeedback : 0;

  const recentFeedback = await db.prepare(`
    SELECT COUNT(*) as c FROM prediction_feedback
    WHERE tenant_id = ? AND created_at >= datetime('now', '-7 days')
  `).get(tenantId) as any;

  const totalPredictions = await db.prepare(`
    SELECT COUNT(*) as c FROM ltv_predictions WHERE tenant_id = ?
  `).get(tenantId) as any;

  const feedbackCount = await db.prepare(`
    SELECT COUNT(*) as c FROM prediction_feedback WHERE tenant_id = ?
  `).get(tenantId) as any;

  return {
    totalFeedback,
    bySource,
    avgError: Math.round(avgError * 100) / 100,
    recentFeedback: recentFeedback?.c || 0,
    predictionCoverage: totalPredictions?.c > 0 ? feedbackCount?.c / totalPredictions.c : 0,
  };
}

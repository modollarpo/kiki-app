// ============================================================
// KIKI Agent Platform — GDPR Compliance
// Right to deletion, data export, data retention, consent management
// ============================================================

import { getDb } from "./db";
import { eventBus } from "./events";

// ── Data Export (Right to Portability) ─────────────────────

export async function exportUserData(tenantId: string, userId: string): Promise<{
  exportedAt: string;
  tenantId: string;
  userId: string;
  data: {
    profile: any;
    campaigns: any[];
    signals: any[];
    ltvPredictions: any[];
    walletTransactions: any[];
    agentActions: any[];
    feedback: any[];
    metacognitionEvents: any[];
  };
}> {
  const db = await getDb();

  const profile = await db.prepare(`
    SELECT id, email, name, role, tenant_id, tenant_name, plan, created_at
    FROM users WHERE id = ? AND tenant_id = ?
  `).get(userId, tenantId);

  const campaigns = await db.prepare(`
    SELECT * FROM campaigns WHERE tenant_id = ?
  `).all(tenantId);

  const signals = await db.prepare(`
    SELECT id, tenant_id, platform, event_type, value, created_at
    FROM signals WHERE tenant_id = ?
  `).all(tenantId);

  const ltvPredictions = await db.prepare(`
    SELECT id, tenant_id, predicted_ltv, confidence, segment, created_at
    FROM ltv_predictions WHERE tenant_id = ?
  `).all(tenantId);

  const walletTransactions = await db.prepare(`
    SELECT wt.id, wt.type, wt.amount, wt.description, wt.created_at
    FROM wallet_transactions wt
    JOIN wallets w ON wt.wallet_id = w.id
    WHERE w.tenant_id = ?
  `).all(tenantId);

  const agentActions = await db.prepare(`
    SELECT id, agent_type, action_type, created_at
    FROM agent_actions WHERE tenant_id = ?
  `).all(tenantId);

  const feedback = await db.prepare(`
    SELECT id, predicted_ltv, actual_ltv, error_pct, created_at
    FROM prediction_feedback WHERE tenant_id = ?
  `).all(tenantId);

  const metacognitionEvents = await db.prepare(`
    SELECT id, event_type, insight, created_at
    FROM metacognition_log WHERE tenant_id = ?
  `).all(tenantId);

  // Log the export
  await db.prepare(`
    INSERT INTO agent_actions (id, tenant_id, agent_type, action_type, details, created_at)
    VALUES (?, ?, 'system', 'data_export', ?, datetime('now'))
  `).run(
    `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tenantId,
    JSON.stringify({ userId, exportedAt: new Date().toISOString() })
  );

  return {
    exportedAt: new Date().toISOString(),
    tenantId,
    userId,
    data: {
      profile,
      campaigns,
      signals,
      ltvPredictions,
      walletTransactions,
      agentActions,
      feedback,
      metacognitionEvents,
    },
  };
}

// ── Right to Deletion (Right to Erasure) ───────────────────

export async function deleteUserData(tenantId: string, userId: string, options: {
  deleteCampaigns?: boolean;
  deleteSignals?: boolean;
  deletePredictions?: boolean;
  deleteWallet?: boolean;
  deleteAgentActions?: boolean;
  deleteFeedback?: boolean;
  deleteIntegrations?: boolean;
  anonymizeOnly?: boolean;
} = {}): Promise<{
  deletedAt: string;
  deletedRecords: Record<string, number>;
  anonymizedRecords: Record<string, number>;
}> {
  const db = await getDb();
  const deletedRecords: Record<string, number> = {};
  const anonymizedRecords: Record<string, number> = {};

  const {
    deleteCampaigns = true,
    deleteSignals = true,
    deletePredictions = true,
    deleteWallet = true,
    deleteAgentActions = true,
    deleteFeedback = true,
    deleteIntegrations = true,
    anonymizeOnly = false,
  } = options;

  if (anonymizeOnly) {
    // Anonymize instead of delete (preserves aggregate data)
    const anonEmail = `deleted_${userId}@anonymized.invalid`;
    const anonName = "Deleted User";

    await db.prepare(`
      UPDATE users SET email = ?, name = 'Deleted User', password = 'DELETED'
      WHERE id = ? AND tenant_id = ?
    `).run(anonEmail, userId, tenantId);
    anonymizedRecords.users = 1;

    if (deleteSignals) {
      await db.prepare(`
        UPDATE signals SET user_id = 'ANONYMIZED', raw_data = '{}'
        WHERE tenant_id = ?
      `).run(tenantId);
      const count = await db.prepare(`SELECT changes() as c`).get() as any;
      anonymizedRecords.signals = count?.c || 0;
    }

    if (deletePredictions) {
      await db.prepare(`
        UPDATE ltv_predictions SET user_id = 'ANONYMIZED', factors = '[]'
        WHERE tenant_id = ?
      `).run(tenantId);
      const count = await db.prepare(`SELECT changes() as c`).get() as any;
      anonymizedRecords.predictions = count?.c || 0;
    }
  } else {
    // Hard delete
    if (deleteIntegrations) {
      const count = await db.prepare(`DELETE FROM tenant_integrations WHERE tenant_id = ?`).run(tenantId);
      deletedRecords.integrations = count.changes;
    }

    if (deleteFeedback) {
      const count = await db.prepare(`DELETE FROM prediction_feedback WHERE tenant_id = ?`).run(tenantId);
      deletedRecords.feedback = count.changes;
    }

    if (deleteAgentActions) {
      const count = await db.prepare(`DELETE FROM agent_actions WHERE tenant_id = ?`).run(tenantId);
      deletedRecords.agentActions = count.changes;
    }

    if (deletePredictions) {
      const count = await db.prepare(`DELETE FROM ltv_predictions WHERE tenant_id = ?`).run(tenantId);
      deletedRecords.predictions = count.changes;
    }

    if (deleteSignals) {
      const count = await db.prepare(`DELETE FROM signals WHERE tenant_id = ?`).run(tenantId);
      deletedRecords.signals = count.changes;
    }

    if (deleteCampaigns) {
      const count = await db.prepare(`DELETE FROM campaigns WHERE tenant_id = ?`).run(tenantId);
      deletedRecords.campaigns = count.changes;
    }

    if (deleteWallet) {
      const wallets = await db.prepare(`SELECT id FROM wallets WHERE tenant_id = ?`).all(tenantId) as any[];
      for (const w of wallets) {
        await db.prepare(`DELETE FROM wallet_transactions WHERE wallet_id = ?`).run(w.id);
        await db.prepare(`DELETE FROM wallet_cards WHERE wallet_id = ?`).run(w.id);
      }
      const count = await db.prepare(`DELETE FROM wallets WHERE tenant_id = ?`).run(tenantId);
      deletedRecords.wallets = count.changes;
    }

    // Delete user last
    await db.prepare(`DELETE FROM users WHERE id = ? AND tenant_id = ?`).run(userId, tenantId);
    deletedRecords.users = 1;
  }

  // Log the deletion
  await db.prepare(`
    INSERT INTO agent_actions (id, tenant_id, agent_type, action_type, details, created_at)
    VALUES (?, ?, 'system', ?, ?, datetime('now'))
  `).run(
    `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tenantId,
    anonymizeOnly ? "data_anonymization" : "data_deletion",
    JSON.stringify({ userId, options, deletedRecords, anonymizedRecords })
  );

  eventBus.emit("gdpr.data_deleted" as any, {
    tenantId,
    userId,
    anonymizeOnly,
    deletedRecords,
    anonymizedRecords,
  });

  return {
    deletedAt: new Date().toISOString(),
    deletedRecords,
    anonymizedRecords,
  };
}

// ── Data Retention Cleanup ─────────────────────────────────

export async function enforceDataRetentionPolicy(tenantId: string, policies: {
  signals?: number;      // days to keep signals
  metrics?: number;      // days to keep system_metrics
  predictions?: number;  // days to keep ltv_predictions
  feedback?: number;     // days to keep prediction_feedback
  metacognition?: number; // days to keep metacognition_log
  agentActions?: number; // days to keep agent_actions
} = {}): Promise<{
  cleanedAt: string;
  recordsDeleted: Record<string, number>;
}> {
  const db = await getDb();
  const recordsDeleted: Record<string, number> = {};

  const defaults = {
    signals: 365,
    metrics: 90,
    predictions: 730,    // 2 years
    feedback: 730,
    metacognition: 365,
    agentActions: 180,
  };

  const p = { ...defaults, ...policies };

  // Clean old signals
  const sigCount = await db.prepare(`
    DELETE FROM signals WHERE tenant_id = ? AND created_at < datetime('now', '-${p.signals} days')
  `).run(tenantId);
  recordsDeleted.signals = sigCount.changes;

  // Clean old metrics
  const metCount = await db.prepare(`
    DELETE FROM system_metrics WHERE tenant_id = ? AND created_at < datetime('now', '-${p.metrics} days')
  `).run(tenantId);
  recordsDeleted.metrics = metCount.changes;

  // Clean old predictions (keep model training data)
  const predCount = await db.prepare(`
    DELETE FROM ltv_predictions WHERE tenant_id = ?
    AND created_at < datetime('now', '-${p.predictions} days')
    AND actual_ltv IS NOT NULL
  `).run(tenantId);
  recordsDeleted.predictions = predCount.changes;

  // Clean old feedback
  const fbCount = await db.prepare(`
    DELETE FROM prediction_feedback WHERE tenant_id = ? AND created_at < datetime('now', '-${p.feedback} days')
  `).run(tenantId);
  recordsDeleted.feedback = fbCount.changes;

  // Clean old metacognition logs
  const metaCount = await db.prepare(`
    DELETE FROM metacognition_log WHERE tenant_id = ? AND created_at < datetime('now', '-${p.metacognition} days')
  `).run(tenantId);
  recordsDeleted.metacognition = metaCount.changes;

  // Clean old agent actions
  const actCount = await db.prepare(`
    DELETE FROM agent_actions WHERE tenant_id = ? AND created_at < datetime('now', '-${p.agentActions} days')
  `).run(tenantId);
  recordsDeleted.agentActions = actCount.changes;

  // Log cleanup
  const totalDeleted = Object.values(recordsDeleted).reduce((s, v) => s + v, 0);
  if (totalDeleted > 0) {
    await db.prepare(`
      INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
      VALUES (?, 'gdpr.retention_cleanup', ?, ?, datetime('now'))
    `).run(tenantId, totalDeleted, JSON.stringify(recordsDeleted));
  }

  return { cleanedAt: new Date().toISOString(), recordsDeleted };
}

// ── Consent Management ─────────────────────────────────────

export interface ConsentRecord {
  tenantId: string;
  userId: string;
  consentType: "analytics" | "marketing" | "third_party" | "data_processing";
  granted: boolean;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordConsent(consent: ConsentRecord): Promise<void> {
  const db = await getDb();

  await db.prepare(`
    INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
    VALUES (?, 'gdpr.consent_recorded', ?, ?, datetime('now'))
  `).run(
    consent.tenantId,
    consent.granted ? 1 : 0,
    JSON.stringify({
      userId: consent.userId,
      consentType: consent.consentType,
      granted: consent.granted,
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
    })
  );
}

export async function getConsentStatus(tenantId: string, userId: string): Promise<Record<string, boolean>> {
  const db = await getDb();

  const records = await db.prepare(`
    SELECT tags FROM system_metrics
    WHERE tenant_id = ? AND metric_name = 'gdpr.consent_recorded'
    ORDER BY created_at DESC LIMIT 10
  `).all(tenantId) as any[];

  const consents: Record<string, boolean> = {};
  for (const record of records) {
    try {
      const tags = JSON.parse(record.tags);
      if (tags.userId === userId) {
        consents[tags.consentType] = tags.granted;
      }
    } catch { /* skip */ }
  }

  return consents;
}

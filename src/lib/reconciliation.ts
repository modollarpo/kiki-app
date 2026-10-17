// ============================================================
// KIKI Agent Platform — Wallet / Ledger Reconciliation
// Layer 9 of the financial-safety model: every night, verify that each
// wallet's stored balance matches the signed sum of its transactions
// (credits positive, debits negative). Any drift beyond the tolerance is
// logged and surfaced as a system alert for operators.
// ============================================================

import { getDb } from "./db";
import { logger } from "./logger";
import { eventBus, EVENTS } from "./events";

export interface ReconciliationMismatch {
  walletId: string;
  tenantId: string;
  stored: number;
  computed: number;
  diff: number;
}

export interface ReconciliationResult {
  checked: number;
  mismatches: ReconciliationMismatch[];
  ranAt: string;
}

// Wallets are stored in whole currency units (USD). One cent of drift is the
// threshold below which we treat rounding as benign.
const RECONCILIATION_TOLERANCE = 0.01;

export async function runNightlyReconciliation(): Promise<ReconciliationResult> {
  const db = await getDb();

  const rows = await db.prepare(`
    SELECT w.id AS id, w.tenant_id AS tenant_id, w.balance AS balance,
           COALESCE(SUM(
             CASE WHEN t.type = 'credit' THEN t.amount
                  WHEN t.type = 'debit'  THEN -t.amount
                  ELSE 0 END
           ), 0) AS computed
    FROM wallets w
    LEFT JOIN wallet_transactions t ON t.wallet_id = w.id
    GROUP BY w.id, w.tenant_id, w.balance
  `).all<{ id: string; tenant_id: string; balance: number; computed: number }>();

  const mismatches: ReconciliationMismatch[] = [];
  for (const r of rows) {
    const stored = Number(r.balance ?? 0);
    const computed = Number(r.computed ?? 0);
    const diff = Math.abs(stored - computed);
    if (diff > RECONCILIATION_TOLERANCE) {
      const mismatch: ReconciliationMismatch = {
        walletId: r.id,
        tenantId: r.tenant_id,
        stored,
        computed,
        diff,
      };
      mismatches.push(mismatch);
      logger.error("[Reconciliation] wallet/ledger mismatch", mismatch);
      eventBus.emit(EVENTS.SYSTEM_ALERT, {
        tenantId: r.tenant_id,
        type: "reconciliation_mismatch",
        message: `Wallet ${r.id} balance ${stored} != ledger ${computed}`,
        walletId: r.id,
        stored,
        computed,
        diff,
      });
    }
  }

  const result: ReconciliationResult = {
    checked: rows.length,
    mismatches,
    ranAt: new Date().toISOString(),
  };

  if (mismatches.length === 0) {
    logger.info(`[Reconciliation] ${rows.length} wallets reconciled, no drift detected`);
  } else {
    logger.warn(`[Reconciliation] ${mismatches.length}/${rows.length} wallets out of balance`);
  }

  return result;
}

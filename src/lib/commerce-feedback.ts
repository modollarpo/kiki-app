// ============================================================
// KIKI Agent Platform — Commerce Order Feedback
// Writes realized order revenue into customer_profiles as the
// ground-truth for the LTV feedback loop, then pushes it into
// prediction_feedback via collectCommerceFeedback.
// ============================================================

import { getDb, genId } from "./db";
import { hashEmailIdentity, hashPhoneIdentity } from "./commerce/base";
import type { CommerceOrder } from "./commerce/types";
import { collectCommerceFeedback } from "./ltv-feedback";
import { eventBus } from "./events";

// Recompute derived profile fields from the new realized totals.
function deriveProfileFields(realizedLtv: number, realizedOrders: number) {
  const averageOrderValue = realizedOrders > 0 ? realizedLtv / realizedOrders : 0;

  // Heuristic segment / churn / repeat-probability derived from realized LTV.
  let ltvSegment = "low";
  if (realizedLtv > 500) ltvSegment = "high";
  else if (realizedLtv > 200) ltvSegment = "mid";
  else if (realizedLtv > 80) ltvSegment = "low";
  else ltvSegment = "churn_risk";

  // More realized orders => lower churn risk and higher repeat probability.
  const churnRisk = realizedOrders >= 3 ? 0.15 : realizedOrders === 2 ? 0.35 : 0.6;
  const repeatPurchaseProbability = Math.min(0.95, 0.2 + realizedOrders * 0.2);

  return { averageOrderValue, ltvSegment, churnRisk, repeatPurchaseProbability };
}

export async function recordCommerceOrder(
  tenantId: string,
  order: CommerceOrder
): Promise<{
  customerId: string;
  created: boolean;
  newFeedbackCount: number;
  updatedPredictions: number;
}> {
  const db = await getDb();

  const isRefunded = order.status === "refunded" || order.refunded === true;
  const orderValue = isRefunded ? 0 : order.total;

  const email = order.customerEmail?.trim() || undefined;
  const phone = order.customerPhone?.trim() || undefined;
  const hasIdentity = !!email || !!phone;

  const identityHash = hasIdentity
    ? email
      ? hashEmailIdentity(email)
      : hashPhoneIdentity(phone!)
    : "";

  let customerId: string | null = null;
  let created = false;

  if (hasIdentity) {
    const existing = (await db.prepare(`
      SELECT id FROM customer_profiles
      WHERE tenant_id = ? AND identity_hash = ?
      LIMIT 1
    `).get(tenantId, identityHash)) as { id: string } | undefined;

    if (existing) {
      customerId = existing.id;
    }
  }

  if (customerId) {
    // Update the existing customer with the new realized revenue.
    const current = (await db.prepare(`
      SELECT realized_ltv, realized_orders, ltv_segment, churn_risk,
             repeat_purchase_probability, average_order_value
      FROM customer_profiles WHERE id = ? AND tenant_id = ?
    `).get(customerId, tenantId)) as {
      realized_ltv: number;
      realized_orders: number;
      ltv_segment: string;
      churn_risk: number;
      repeat_purchase_probability: number;
      average_order_value: number;
    };

    const realizedLtv = (current.realized_ltv || 0) + orderValue;
    const realizedOrders = (current.realized_orders || 0) + (isRefunded ? 0 : 1);

    const derived = deriveProfileFields(realizedLtv, realizedOrders);

    await db.prepare(`
      UPDATE customer_profiles
      SET realized_ltv = ?,
          realized_orders = ?,
          last_commerce_sync_at = datetime('now'),
          commerce_platform = ?,
          ltv_segment = ?,
          churn_risk = ?,
          repeat_purchase_probability = ?,
          average_order_value = ?,
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).run(
      realizedLtv,
      realizedOrders,
      order.currency,
      derived.ltvSegment,
      derived.churnRisk,
      derived.repeatPurchaseProbability,
      derived.averageOrderValue,
      customerId,
      tenantId
    );
  } else {
    // No matching customer — create one keyed to this commerce order.
    created = true;
    customerId = genId("cust");

    const realizedLtv = orderValue;
    const realizedOrders = isRefunded ? 0 : 1;
    const derived = deriveProfileFields(realizedLtv, realizedOrders);

    await db.prepare(`
      INSERT INTO customer_profiles (
        id, tenant_id, external_id, email, phone, identity_hash,
        total_orders, total_spent, predicted_ltv, ltv_confidence,
        ltv_segment, repeat_purchase_probability, first_order_at, last_order_at,
        average_order_value, churn_risk, realized_ltv, realized_orders,
        last_commerce_sync_at, commerce_platform, synced_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?, ?, datetime('now'), datetime('now'), ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    `).run(
      customerId,
      tenantId,
      `commerce_${order.orderId}`,
      email ?? null,
      phone ?? null,
      identityHash,
      realizedLtv,
      derived.ltvSegment,
      derived.repeatPurchaseProbability,
      derived.averageOrderValue,
      derived.churnRisk,
      realizedLtv,
      realizedOrders,
      order.currency
    );
  }

  // Push the new realized LTV into prediction_feedback.
  const result = await collectCommerceFeedback(tenantId);

  eventBus.emit("ltv.commerce_feedback", {
    tenantId,
    customerId,
    orderId: order.orderId,
    newFeedbackCount: result.newFeedbackCount,
    updatedPredictions: result.updatedPredictions,
  });

  return {
    customerId: customerId!,
    created,
    newFeedbackCount: result.newFeedbackCount,
    updatedPredictions: result.updatedPredictions,
  };
}

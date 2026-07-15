// ============================================================
// KIKI Agent Platform — Billing Service
// Stripe subscription + metered billing + dunning + OaaS fees
// ============================================================

import crypto from "crypto";
import { getDb } from "./db";
import { getPlanLimits, checkPlanLimit } from "./tenant";
import { eventBus, EVENTS } from "./events";
import { stripe, stripeEnabled, priceIdForPlan } from "./stripe";
import { PLAN_PRICING } from "./plans";

// ── Types ──────────────────────────────────────────────────

export interface Subscription {
  id: string;
  tenantId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: "starter" | "growth" | "enterprise" | "oaas";
  status: "active" | "past_due" | "cancelled" | "trialing";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface UsageRecord {
  id: string;
  tenantId: string;
  type: "ai_tokens" | "signals_sent" | "ad_spend" | "api_calls";
  quantity: number;
  unitCost: number;
  totalCost: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: string;
  tenantId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  periodStart: string;
  periodEnd: string;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  description: string;
  amount: number;
  quantity: number;
  unitPrice: number;
}

// ── Plan Pricing ───────────────────────────────────────────

// Canonical plan pricing lives in ./plans (single source of truth).
export { PLAN_PRICING };

// ── Subscription Management ────────────────────────────────

export async function createSubscription(
  tenantId: string,
  plan: string,
  paymentMethodId: string,
  billingCycle: "monthly" | "annual" = "monthly"
): Promise<Subscription> {
  const db = await getDb();
  const pricing = PLAN_PRICING[plan];
  if (!pricing) throw new Error(`Invalid plan: ${plan}`);

  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === "monthly") {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  let stripeCustomerId = `cus_${crypto.randomBytes(12).toString("hex")}`;
  let stripeSubscriptionId = `sub_stripe_${crypto.randomBytes(12).toString("hex")}`;
  let stripeSubscriptionItemId: string | undefined;
  let stripePriceId: string | undefined;

  // Real Stripe integration — create customer + subscription when configured.
  if (stripe && stripeEnabled) {
    const priceId = priceIdForPlan(plan);
    try {
      const customer = await stripe.customers.create({
        metadata: { tenantId },
        ...(paymentMethodId ? { payment_method: paymentMethodId } : {}),
      });
      stripeCustomerId = customer.id;

      if (priceId) {
        stripePriceId = priceId;
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          ...(paymentMethodId ? { default_payment_method: paymentMethodId } : {}),
          billing_cycle_anchor: Math.floor(Date.now() / 1000),
          expand: ["items.data.id"],
        });
        stripeSubscriptionId = subscription.id;
        const item = (subscription as any).items?.data?.[0];
        stripeSubscriptionItemId = item?.id;
      }
    } catch (err) {
      console.error("[billing] Stripe subscription creation failed, falling back to simulated ids:", err);
    }
  }

  const subscriptionId = `sub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  await db.prepare(`
    INSERT INTO subscriptions
    (id, tenant_id, stripe_customer_id, stripe_subscription_id, plan, status,
     current_period_start, current_period_end, cancel_at_period_end,
     stripe_subscription_item_id, stripe_price_id, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, 0, ?, ?, datetime('now'))
  `).run(
    subscriptionId,
    tenantId,
    stripeCustomerId,
    stripeSubscriptionId,
    plan,
    now.toISOString(),
    periodEnd.toISOString(),
    stripeSubscriptionItemId ?? null,
    stripePriceId ?? null
  );

  eventBus.emit("billing.subscription_created", {
    tenantId,
    plan,
    billingCycle,
    amount: billingCycle === "monthly" ? pricing.monthlyPrice : pricing.annualPrice,
  });

  return {
    id: subscriptionId,
    tenantId,
    stripeCustomerId,
    stripeSubscriptionId,
    plan: plan as any,
    status: "active",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
  };
}

export async function cancelSubscription(tenantId: string): Promise<void> {
  const db = await getDb();

  await db.prepare(`
    UPDATE subscriptions
    SET cancel_at_period_end = 1, updated_at = datetime('now')
    WHERE tenant_id = ? AND status = 'active'
  `).run(tenantId);

  eventBus.emit("billing.subscription_cancelled", { tenantId });
}

// ── Usage Metering (Stripe Metered Billing) ────────────────

export async function recordUsage(
  tenantId: string,
  type: UsageRecord["type"],
  quantity: number,
  metadata?: Record<string, any>
): Promise<UsageRecord> {
  const db = await getDb();

  // Get tenant plan
  const tenant =   await db.prepare("SELECT plan FROM users WHERE tenant_id = ? LIMIT 1").get(tenantId) as any;
  const plan = tenant?.plan || "starter";
  const pricing = PLAN_PRICING[plan];

  // Calculate cost
  let unitCost = 0;
  let totalCost = 0;

  switch (type) {
    case "ai_tokens":
      unitCost = pricing.tokenOverageRate;
      // Check against included amount
      const tokenUsage =   await db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as total FROM usage_records
        WHERE tenant_id = ? AND type = 'ai_tokens'
        AND timestamp >= datetime('now', 'start of month')
      `).get(tenantId) as any;

      const includedTokens = pricing.includedTokens;
      const overageTokens = Math.max(0, (tokenUsage.total + quantity) - includedTokens);
      totalCost = overageTokens * unitCost;
      break;

    case "signals_sent":
      unitCost = pricing.signalOverageRate;
      const signalUsage =   await db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as total FROM usage_records
        WHERE tenant_id = ? AND type = 'signals_sent'
        AND timestamp >= datetime('now', 'start of month')
      `).get(tenantId) as any;

      const includedSignals = pricing.includedSignals;
      const overageSignals = Math.max(0, (signalUsage.total + quantity) - includedSignals);
      totalCost = overageSignals * unitCost;
      break;

    case "ad_spend":
      // OaaS management fee
      if (pricing.managementFeePercent > 0) {
        totalCost = quantity * (pricing.managementFeePercent / 100);
      }
      break;

    case "api_calls":
      // Included in plan, no overage
      break;
  }

  const recordId = `usage_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  await db.prepare(`
    INSERT INTO usage_records (id, tenant_id, type, quantity, unit_cost, total_cost, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `).run(recordId, tenantId, type, quantity, unitCost, totalCost, JSON.stringify(metadata || {}));

  // Send metered usage to Stripe when configured.
  if (stripe && stripeEnabled && (type === "ai_tokens" || type === "signals_sent")) {
    try {
      const sub =   await db.prepare(`
        SELECT stripe_subscription_item_id FROM subscriptions
        WHERE tenant_id = ? AND status IN ('active', 'past_due')
        ORDER BY created_at DESC LIMIT 1
      `).get(tenantId) as any;
      if (sub?.stripe_subscription_item_id) {
        await stripe.subscriptionItems.createUsageRecord(sub.stripe_subscription_item_id, {
          quantity,
          timestamp: Math.floor(Date.now() / 1000),
          action: "increment",
        });
      }
    } catch (err) {
      console.error("[billing] Stripe usage record failed:", err);
    }
  }

  // Check limits
  const limitCheck = await checkPlanLimit(tenantId, type === "ai_tokens" ? "tokens" : type === "signals_sent" ? "signals" : "api_calls", quantity);
  if (!limitCheck.allowed) {
    eventBus.emit("billing.plan_limit_exceeded", {
      tenantId,
      type,
      usage: limitCheck.usage,
      limit: limitCheck.limit,
    });
  }

  return {
    id: recordId,
    tenantId,
    type,
    quantity,
    unitCost,
    totalCost,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

// ── OaaS Revenue Calculation ───────────────────────────────

export async function calculateOaasFees(
  tenantId: string,
  periodStart: string,
  periodEnd: string
): Promise<{
  managementFee: number;
  performanceBonus: number;
  totalRevenue: number;
  baselineRoas: number;
  actualRoas: number;
  upliftPercent: number;
}> {
  const db = await getDb();
  const pricing = PLAN_PRICING.oaas;

  // Get total ad spend from platform data (not self-reported)
  const spendData =   await db.prepare(`
    SELECT SUM(spend) as total_spend, SUM(revenue) as total_revenue
    FROM campaigns
    WHERE tenant_id = ? AND status = 'active'
    AND updated_at BETWEEN ? AND ?
  `).get(tenantId, periodStart, periodEnd) as any;

  const totalSpend = spendData?.total_spend || 0;
  const totalRevenue = spendData?.total_revenue || 0;

  // Management fee (1.2-1.5% of managed spend)
  const managementFee = totalSpend * (pricing.managementFeePercent / 100);

  // Baseline ROAS (last 30 days before this period)
  const baselineData =   await db.prepare(`
    SELECT SUM(revenue) / NULLIF(SUM(spend), 0) as baseline_roas
    FROM campaigns
    WHERE tenant_id = ? AND status = 'active'
    AND updated_at < ?
    AND updated_at >= datetime(?, '-30 days')
  `).get(tenantId, periodStart, periodStart) as any;

  const baselineRoas = baselineData?.baseline_roas || 4.0;
  const actualRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Performance bonus (5% of revenue uplift above baseline)
  const baselineRevenue = totalSpend * baselineRoas;
  const upliftRevenue = Math.max(0, totalRevenue - baselineRevenue);
  const performanceBonus = upliftRevenue * (pricing.performanceBonusPercent / 100);
  const upliftPercent = baselineRevenue > 0 ? ((totalRevenue - baselineRevenue) / baselineRevenue) * 100 : 0;

  return {
    managementFee,
    performanceBonus,
    totalRevenue: managementFee + performanceBonus,
    baselineRoas,
    actualRoas,
    upliftPercent,
  };
}

// ── Invoice Generation ─────────────────────────────────────

export async function generateInvoice(
  tenantId: string,
  periodStart: string,
  periodEnd: string
): Promise<Invoice> {
  const db = await getDb();
  const tenant =   await db.prepare("SELECT plan FROM users WHERE tenant_id = ? LIMIT 1").get(tenantId) as any;
  const plan = tenant?.plan || "starter";
  const pricing = PLAN_PRICING[plan];

  const lineItems: InvoiceLineItem[] = [];

  // Base subscription
  if (pricing.monthlyPrice > 0) {
    lineItems.push({
      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Monthly Subscription`,
      amount: pricing.monthlyPrice,
      quantity: 1,
      unitPrice: pricing.monthlyPrice,
    });
  }

  // AI token overage
  const tokenUsage =   await db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as total, COALESCE(SUM(total_cost), 0) as cost
    FROM usage_records
    WHERE tenant_id = ? AND type = 'ai_tokens'
    AND timestamp BETWEEN ? AND ?
  `).get(tenantId, periodStart, periodEnd) as any;

  if (tokenUsage.cost > 0) {
    lineItems.push({
      description: `AI Token Overage (${(tokenUsage.total / 1000).toFixed(0)}K tokens)`,
      amount: tokenUsage.cost,
      quantity: tokenUsage.total,
      unitPrice: pricing.tokenOverageRate,
    });
  }

  // Signal overage
  const signalUsage =   await db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as total, COALESCE(SUM(total_cost), 0) as cost
    FROM usage_records
    WHERE tenant_id = ? AND type = 'signals_sent'
    AND timestamp BETWEEN ? AND ?
  `).get(tenantId, periodStart, periodEnd) as any;

  if (signalUsage.cost > 0) {
    lineItems.push({
      description: `Signal Overage (${(signalUsage.total / 1000).toFixed(0)}K signals)`,
      amount: signalUsage.cost,
      quantity: signalUsage.total,
      unitPrice: pricing.signalOverageRate,
    });
  }

  // OaaS fees
  if (plan === "oaas") {
    const oaas = await calculateOaasFees(tenantId, periodStart, periodEnd);
    if (oaas.managementFee > 0) {
      lineItems.push({
        description: `OaaS Management Fee (${pricing.managementFeePercent}% of ad spend)`,
        amount: oaas.managementFee,
        quantity: 1,
        unitPrice: oaas.managementFee,
      });
    }
    if (oaas.performanceBonus > 0) {
      lineItems.push({
        description: `OaaS Performance Bonus (${pricing.performanceBonusPercent}% of uplift)`,
        amount: oaas.performanceBonus,
        quantity: 1,
        unitPrice: oaas.performanceBonus,
      });
    }
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  let stripeInvoiceId = `in_stripe_${crypto.randomBytes(12).toString("hex")}`;
  let invoiceStatus: Invoice["status"] = "open";

  // Create a real Stripe invoice draft when configured.
  if (stripe && stripeEnabled) {
    try {
      const sub =   await db.prepare(`
        SELECT stripe_customer_id, stripe_subscription_id FROM subscriptions
        WHERE tenant_id = ? AND status IN ('active', 'past_due')
        ORDER BY created_at DESC LIMIT 1
      `).get(tenantId) as any;
      if (sub?.stripe_customer_id) {
        const customer = sub.stripe_customer_id;
        for (const item of lineItems) {
          await stripe.invoiceItems.create({
            customer,
            amount: Math.round(item.amount * 100),
            currency: "usd",
            description: item.description,
          });
        }
        const invoice = await stripe.invoices.create({
          customer,
          auto_advance: false,
          metadata: { tenantId, periodStart, periodEnd },
        });
        stripeInvoiceId = invoice.id;
        invoiceStatus = invoice.status === "paid" ? "paid" : "open";
      }
    } catch (err) {
      console.error("[billing] Stripe invoice creation failed, storing locally:", err);
    }
  }

  const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  await db.prepare(`
    INSERT INTO invoices
    (id, tenant_id, stripe_invoice_id, amount, currency, status, period_start, period_end, line_items, created_at)
    VALUES (?, ?, ?, ?, 'usd', ?, ?, ?, ?, datetime('now'))
  `).run(invoiceId, tenantId, stripeInvoiceId, totalAmount, invoiceStatus, periodStart, periodEnd, JSON.stringify(lineItems));

  return {
    id: invoiceId,
    tenantId,
    stripeInvoiceId,
    amount: totalAmount,
    currency: "usd",
    status: invoiceStatus,
    periodStart,
    periodEnd,
    lineItems,
  };
}

// ── Dunning Logic ──────────────────────────────────────────

export async function handlePaymentFailure(
  tenantId: string,
  invoiceId: string,
  attemptCount: number
): Promise<void> {
  const db = await getDb();

  switch (attemptCount) {
    case 1:
      // Retry in 3 days, email warning
      await db.prepare(`
        UPDATE subscriptions SET status = 'past_due', updated_at = datetime('now')
        WHERE tenant_id = ?
      `).run(tenantId);
      eventBus.emit("billing.payment_failed", {
        tenantId,
        invoiceId,
        retryIn: "3 days",
        action: "email_warning",
      });
      break;

    case 2:
      // Retry in 5 days, email + in-app banner
      eventBus.emit("billing.payment_failed", {
        tenantId,
        invoiceId,
        retryIn: "5 days",
        action: "email_and_banner",
      });
      break;

    case 3:
      // Subscription past_due, features soft-restricted
      await db.prepare(`
        UPDATE subscriptions SET status = 'past_due', updated_at = datetime('now')
        WHERE tenant_id = ?
      `).run(tenantId);
      eventBus.emit("billing.payment_failed", {
        tenantId,
        invoiceId,
        action: "soft_restrict",
      });
      break;

    case 4:
      // Cancel subscription, suspend tenant
      await db.prepare(`
        UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now')
        WHERE tenant_id = ?
      `).run(tenantId);
      await db.prepare(`
        UPDATE users SET status = 'suspended', updated_at = datetime('now')
        WHERE tenant_id = ?
      `).run(tenantId);
      eventBus.emit("tenant.suspended", {
        tenantId,
        reason: "payment_failure",
        invoiceId,
      });
      break;
  }
}

// ── FX Spread Revenue ──────────────────────────────────────

export function calculateFxSpread(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): { effectiveRate: number; spreadRevenue: number; midRate: number } {
  // In production, fetch from Open Exchange Rates API
  const midRate = getExchangeRate(fromCurrency, toCurrency);
  const spreadBps = 50; // 50 basis points = 0.50%
  const effectiveRate = midRate * (1 - spreadBps / 10000);
  const spreadRevenue = amount * (spreadBps / 10000);

  return { effectiveRate, spreadRevenue, midRate };
}

function getExchangeRate(from: string, to: string): number {
  // Simplified rates — in production, use Open Exchange Rates API
  const rates: Record<string, number> = {
    "USD_EUR": 0.92,
    "USD_GBP": 0.79,
    "USD_NGN": 1550,
    "USD_KES": 153,
    "USD_GHS": 14.8,
    "USD_ZAR": 18.2,
    "USD_AED": 3.67,
    "USD_SAR": 3.75,
  };
  return rates[`${from}_${to}`] || 1;
}

// ── Billing Stats ──────────────────────────────────────────

export async function getBillingStats(tenantId: string) {
  const db = await getDb();

  const subscription =   await db.prepare(`
    SELECT * FROM subscriptions WHERE tenant_id = ? AND status IN ('active', 'past_due')
    ORDER BY created_at DESC LIMIT 1
  `).get(tenantId) as any;

  const currentUsage =   await db.prepare(`
    SELECT type, SUM(quantity) as total_quantity, SUM(total_cost) as total_cost
    FROM usage_records
    WHERE tenant_id = ? AND timestamp >= datetime('now', 'start of month')
    GROUP BY type
  `).all(tenantId) as any[];

  const totalSpend =   await db.prepare(`
    SELECT SUM(spend) as total FROM campaigns WHERE tenant_id = ?
  `).get(tenantId) as any;

  return {
    subscription: subscription ? {
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    } : null,
    usage: currentUsage.reduce((acc: Record<string, any>, row: any) => {
      acc[row.type] = { quantity: row.total_quantity, cost: row.total_cost };
      return acc;
    }, {}),
    totalManagedSpend: totalSpend?.total || 0,
    oaas: subscription?.plan === "oaas"
      ? await calculateOaasFees(tenantId, new Date(Date.now() - 30 * 86400000).toISOString(), new Date().toISOString())
      : null,
  };
}

// ============================================================
// KIKI Agent Platform — Stripe client
// Real SDK initialization with graceful fallback when no key
// is configured (dev/demo mode). Never throws at import time.
// ============================================================

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripeEnabled = Boolean(secretKey);

export const stripe: Stripe | null = secretKey
  ? new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      appInfo: { name: "kiki-agent-platform", version: "2.0.0" },
    })
  : null;

// Price/Product map per plan — set STRIPE_PRICE_<PLAN> in env to enable
// real subscription creation. Falls back to simulated ids when absent.
export function priceIdForPlan(plan: string): string | undefined {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];
}

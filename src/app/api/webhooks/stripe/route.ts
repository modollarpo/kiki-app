export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { confirmTopUp } from "@/lib/wallet";
import { eventBus } from "@/lib/events";
import { logger } from "@/lib/logger";
import { handlePaymentFailure } from "@/lib/billing";

const WEBHOOK_TUNING = {
  // Only process events from this list — unknown event types are acknowledged
  // but not processed to avoid accidental state changes from Stripe's API.
  SUPPORTED_EVENTS: [
    "payment_intent.succeeded",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.trial_will_end",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ] as const,
};

export async function POST(req: NextRequest) {
  if (!stripeEnabled || !stripe) {
    return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!webhookSecret || !sig) {
    return NextResponse.json({ ok: false, error: "Missing webhook secret or signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  // Acknowledge unsupported events without processing
  if (!WEBHOOK_TUNING.SUPPORTED_EVENTS.includes(event.type as any)) {
    return NextResponse.json({ ok: true, received: true, note: `Unhandled event type: ${event.type}` });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as { id: string };
        const result = await confirmTopUp(pi.id);
        if (!result.success) {
          return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const tenantId = sub.metadata?.tenantId;
        if (!tenantId) {
          logger.warn("stripe webhook: subscription event without tenantId metadata", { subId: sub.id });
          break;
        }
        const db = await getDb();
        const plan = mapStripePriceToPlan(sub.items?.data?.[0]?.price?.id);
        const status = mapStripeStatus(sub.status);
        const periodStart = new Date(sub.current_period_start * 1000).toISOString();
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        // Upsert subscription record
        const existing =   await db.prepare(
          "SELECT id FROM subscriptions WHERE stripe_subscription_id = ?"
        ).get(sub.id) as any;

        if (existing) {
          await db.prepare(`
            UPDATE subscriptions
            SET plan = ?, status = ?, current_period_start = ?, current_period_end = ?,
                cancel_at_period_end = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(
            plan || "starter",
            status,
            periodStart,
            periodEnd,
            sub.cancel_at_period_end ? 1 : 0,
            existing.id
          );
        } else {
          const subId = `sub_stripe_${sub.id}`;
          await db.prepare(`
            INSERT INTO subscriptions (id, tenant_id, stripe_subscription_id, plan, status,
              current_period_start, current_period_end, cancel_at_period_end, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).run(subId, tenantId, sub.id, plan || "starter", status, periodStart, periodEnd, sub.cancel_at_period_end ? 1 : 0);
        }

        // Sync user plan
        if (plan && plan !== "enterprise") {
          await db.prepare(`
            UPDATE users SET plan = ?, updated_at = datetime('now')
            WHERE tenant_id = ?
          `).run(plan, tenantId);
        }

        eventBus.emit("billing.subscription_synced", { tenantId, plan, status });
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object as any;
        const tenantId = deletedSub.metadata?.tenantId;
        if (tenantId) {
          const db = await getDb();
          await db.prepare(`
            UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now')
            WHERE stripe_subscription_id = ?
          `).run(deletedSub.id);
          // Downgrade to starter (free tier)
          await db.prepare(`
            UPDATE users SET plan = 'starter', updated_at = datetime('now')
            WHERE tenant_id = ?
          `).run(tenantId);
          eventBus.emit("billing.subscription_cancelled", { tenantId });
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const trialSub = event.data.object as any;
        const trialTenantId = trialSub.metadata?.tenantId;
        if (trialTenantId) {
          eventBus.emit("billing.trial_ending", { tenantId: trialTenantId });
          logger.info("Trial ending soon", { tenantId: trialTenantId });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const invTenantId = invoice.metadata?.tenantId || invoice.subscription_details?.metadata?.tenantId;
        if (invTenantId) {
          const db = await getDb();
          const invId = `inv_stripe_${invoice.id}`;
          await db.prepare(`
            INSERT INTO invoices (id, tenant_id, stripe_invoice_id, amount, currency, status, period_start, period_end, created_at)
            VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, datetime('now'))
          `).run(
            invId,
            invTenantId,
            invoice.id,
            invoice.total / 100,
            invoice.currency.toUpperCase(),
            invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          );
          eventBus.emit("billing.invoice_paid", { tenantId: invTenantId, amount: invoice.total / 100 });
        }
        break;
      }

      case "invoice.payment_failed": {
        const failedInvoice = event.data.object as any;
        const failTenantId = failedInvoice.metadata?.tenantId || failedInvoice.subscription_details?.metadata?.tenantId;
        if (failTenantId) {
          await handlePaymentFailure(failTenantId, failedInvoice.id, 1);
          eventBus.emit("billing.payment_failed", { tenantId: failTenantId, invoiceId: failedInvoice.id });
          logger.warn("Payment failed", { tenantId: failTenantId, invoiceId: failedInvoice.id });
        }
        break;
      }
    }
  } catch (err) {
    logger.error("stripe webhook processing failed", {
      eventType: event.type,
      message: err instanceof Error ? err.message : String(err),
    });
    // Return 200 to acknowledge receipt — we'll retry on next webhook delivery
    return NextResponse.json({ ok: true, received: true, warning: "Processing error, see logs" });
  }

  return NextResponse.json({ ok: true, received: true });
}

function mapStripePriceToPlan(priceId: string | undefined): string | null {
  if (!priceId) return null;
  const envMap = {
    starter: process.env.STRIPE_PRICE_STARTER,
    growth: process.env.STRIPE_PRICE_GROWTH,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  };
  for (const [plan, envPriceId] of Object.entries(envMap)) {
    if (envPriceId && priceId === envPriceId) return plan;
  }
  return null;
}

function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active": return "active";
    case "past_due": return "past_due";
    case "canceled": return "cancelled";
    case "trialing": return "trialing";
    case "incomplete": return "past_due";
    case "incomplete_expired": return "cancelled";
    default: return "past_due";
  }
}

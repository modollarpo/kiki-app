export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { eventBus } from "@/lib/events";
import { stripe, stripeEnabled, priceIdForPlan } from "@/lib/stripe";
import { PLAN_PRICING } from "@/lib/plans";

const VALID_PLANS = ["starter", "growth", "enterprise"] as const;

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`change-plan:${clientKey(req)}`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const enf = await checkEnforcement(user.tenantId);
    if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

    const body = await req.json();
    const { plan } = body;

    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json(
        { ok: false, error: `Invalid plan. Valid options: ${VALID_PLANS.join(", ")}` },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get current subscription
    const sub =   await db.prepare(`
      SELECT * FROM subscriptions
      WHERE tenant_id = ? AND status IN ('active', 'trialing')
      ORDER BY created_at DESC LIMIT 1
    `).get<{ id: string; stripe_subscription_id: string | null; stripe_subscription_item_id: string | null }>(user.tenantId);

    // Update Stripe subscription when configured
    let stripeUpdated = false;
    if (stripe && stripeEnabled) {
      try {
        const newPriceId = priceIdForPlan(plan);
        if (sub?.stripe_subscription_id && sub.stripe_subscription_item_id && newPriceId) {
          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            items: [{
              id: sub.stripe_subscription_item_id,
              price: newPriceId,
            }],
            proration_behavior: "create_prorations",
          });
          stripeUpdated = true;
        } else if (sub?.stripe_subscription_id && newPriceId) {
          const retrieved = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
          if (retrieved.items.data[0]) {
            await stripe.subscriptions.update(sub.stripe_subscription_id, {
              items: [{ id: retrieved.items.data[0].id, price: newPriceId }],
              proration_behavior: "create_prorations",
            });
            stripeUpdated = true;
            if (retrieved.items.data[0].id && !sub.stripe_subscription_item_id) {
              await db.prepare("UPDATE subscriptions SET stripe_subscription_item_id = ? WHERE id = ?").run(retrieved.items.data[0].id, sub.id);
            }
          }
        } else if (newPriceId && user.email) {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: { tenantId: user.tenantId },
          });
          const created = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: newPriceId }],
            proration_behavior: "create_prorations",
          });
          stripeUpdated = true;
          if (sub) {
            await db.prepare("UPDATE subscriptions SET stripe_subscription_id = ?, stripe_subscription_item_id = ? WHERE id = ?")
              .run(created.id, created.items.data[0]?.id || null, sub.id);
          }
        }
      } catch (err) {
        logger.error("change-plan: Stripe update failed", {
          message: err instanceof Error ? err.message : String(err),
        });
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ ok: false, error: "Failed to update subscription in billing provider" }, { status: 502 });
        }
      }
    } else if (process.env.NODE_ENV === "production" && plan !== "starter") {
      return NextResponse.json({ ok: false, error: "Billing provider not configured" }, { status: 503 });
    }

    // Update local subscription
    if (sub) {
      await db.prepare(`
        UPDATE subscriptions
        SET plan = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(plan, sub.id);
    } else {
      // No active subscription — create one
      const subId = `sub_${Date.now()}_sub`;
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await db.prepare(`
        INSERT INTO subscriptions (id, tenant_id, plan, status, current_period_start, current_period_end, cancel_at_period_end, created_at)
        VALUES (?, ?, ?, 'active', datetime('now'), ?, 0, datetime('now'))
      `).run(subId, user.tenantId, plan, periodEnd.toISOString());
    }

    // Update user's plan
    await db.prepare(`
      UPDATE users SET plan = ?, updated_at = datetime('now') WHERE id = ?
    `).run(plan, user.id);

    eventBus.emit("billing.plan_changed", {
      tenantId: user.tenantId,
      userId: user.id,
      previousPlan: user.plan,
      newPlan: plan,
      stripeUpdated,
    });

    return NextResponse.json({
      ok: true,
      data: {
        plan,
        stripeUpdated,
        message: `Plan changed to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
        price: PLAN_PRICING[plan]?.monthlyPrice || 0,
      },
    });
  } catch (error) {
    logger.error("change-plan/POST failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

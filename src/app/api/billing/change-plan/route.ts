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
    `).get(user.tenantId) as any;

    // Update Stripe subscription when configured
    let stripeUpdated = false;
    if (stripe && stripeEnabled && sub?.stripe_subscription_id) {
      try {
        const newPriceId = priceIdForPlan(plan);
        if (newPriceId && sub.stripe_subscription_item_id) {
          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            items: [{
              id: sub.stripe_subscription_item_id,
              price: newPriceId,
            }],
            proration_behavior: "create_prorations",
          });
          stripeUpdated = true;
        }
      } catch (err) {
        logger.error("change-plan: Stripe update failed, proceeding with local update", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
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

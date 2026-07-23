export const dynamic = "force-dynamic";
// ============================================================
// KIKI Agent Platform — Billing API Route
// GET /api/billing — Billing stats and subscription info
// POST /api/billing/usage — Record usage
// POST /api/billing/invoice — Generate invoice
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getBillingStats, recordUsage, generateInvoice, createSubscription } from "@/lib/billing";
import { getUserFromRequest } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getBillingStats(user.tenantId);
    return Response.json({ ok: true, data: stats });
  } catch (error) {
    logger.error("billing/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Abuse protection: 60 billing requests per IP per minute.
    const rl = rateLimit(`billing:${clientKey(req)}`, 60, 60_000);
    if (!rl.ok) {
      return Response.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "record_usage": {
        const { type, quantity, metadata } = body;
        if (!type || !quantity) {
          return Response.json({ ok: false, error: "type and quantity required" }, { status: 400 });
        }
        const record = await recordUsage(user.tenantId, type, quantity, metadata);
        return Response.json({ ok: true, data: record });
      }

      case "generate_invoice": {
        const { periodStart, periodEnd } = body;
        const invoice = await generateInvoice(
          user.tenantId,
          periodStart || new Date(Date.now() - 30 * 86400000).toISOString(),
          periodEnd || new Date().toISOString()
        );
        return Response.json({ ok: true, data: invoice });
      }

      case "create_subscription": {
        const { plan, paymentMethodId, billingCycle } = body;
        if (!plan || !paymentMethodId) {
          return Response.json({ ok: false, error: "plan and paymentMethodId required" }, { status: 400 });
        }
        const subscription = await createSubscription(user.tenantId, plan, paymentMethodId, billingCycle);
        return Response.json({ ok: true, data: subscription });
      }

      default:
        return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    logger.error("billing/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

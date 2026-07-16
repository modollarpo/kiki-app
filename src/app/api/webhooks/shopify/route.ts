// ============================================================
// KIKI Agent Platform — Shopify Webhook Receiver
// POST /api/webhooks/shopify
// Verifies HMAC-SHA256 signature and records realized order revenue.
// No JWT required (called by Shopify). Returns 200 accepted.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCommerceConnector } from "@/lib/commerce";
import { recordCommerceOrder } from "@/lib/commerce-feedback";
import { logger, handleApiError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Shopify-Hmac-Sha256") ?? "";
    const secret =
      req.headers.get("x-kiki-webhook-secret") ??
      req.headers.get("x-webhook-secret") ??
      "";

    const connector = getCommerceConnector("shopify");
    if (!connector.verifyWebhook(rawBody, signature, secret)) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    const tenantId = req.nextUrl.searchParams.get("tenantId") ?? "";
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "tenantId required" }, { status: 400 });
    }

    // Confirm the connection exists for this tenant.
    const db = await getDb();
    const conn = await db.prepare(`
      SELECT id FROM commerce_connections
      WHERE tenant_id = ? AND platform = 'shopify' AND status = 'active'
    `).get(tenantId) as { id: string } | undefined;

    if (!conn) {
      return NextResponse.json({ ok: false, error: "Unknown tenant" }, { status: 404 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: true });
    }

    const order = connector.parseOrderWebhook(parsed);
    // Not an order/paid event — acknowledge to keep Shopify happy.
    if (!order) return NextResponse.json({ ok: true });

    await recordCommerceOrder(tenantId, order);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "webhooks/shopify/POST");
  }
}

// ============================================================
// CRM Sync API — Trigger customer ingestion from Shopify/Stripe/HubSpot
// POST /api/crm/sync — Sync customers from a platform
// GET  /api/crm/sync — Get CRM sync stats
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";
import { syncShopifyCustomers } from "@/lib/crm-sync";
import { syncStripeCustomers } from "@/lib/crm-sync";
import { syncHubspotContacts } from "@/lib/crm-sync";
import { getCrmStats } from "@/lib/crm-sync";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stats = await getCrmStats(user.tenantId);
    return NextResponse.json({ success: true, data: stats });
  } catch (e) {
    return handleApiError(e, "crm/sync/GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { platform, accessToken, shopDomain, stripeApiKey, hubspotApiKey } = body;

    if (!platform) {
      return NextResponse.json({ error: "platform required (shopify | stripe | hubspot)" }, { status: 400 });
    }

    let result: { synced: number; errors: number };

    switch (platform) {
      case "shopify": {
        if (!accessToken || !shopDomain) {
          return NextResponse.json({ error: "accessToken and shopDomain required for Shopify" }, { status: 400 });
        }
        result = await syncShopifyCustomers(user.tenantId, accessToken, shopDomain);
        break;
      }
      case "stripe": {
        if (!stripeApiKey) {
          return NextResponse.json({ error: "stripeApiKey required for Stripe" }, { status: 400 });
        }
        result = await syncStripeCustomers(user.tenantId, stripeApiKey);
        break;
      }
      case "hubspot": {
        if (!hubspotApiKey) {
          return NextResponse.json({ error: "hubspotApiKey required for HubSpot" }, { status: 400 });
        }
        result = await syncHubspotContacts(user.tenantId, hubspotApiKey);
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
    }

    logger.info("CRM sync completed", { tenantId: user.tenantId, platform, ...result });
    return NextResponse.json({ success: true, data: { platform, ...result } });
  } catch (e) {
    return handleApiError(e, "crm/sync/POST");
  }
}

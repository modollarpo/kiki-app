// ============================================================
// Unified Webhook Handler — Routes platform webhooks to CAPI
// ============================================================

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { enrichConversionEvent } from "@/lib/capi";
import { eventBus } from "@/lib/events";

export interface WebhookPayload {
  platform: string;
  eventName: string;
  eventTime: number;
  userData: {
    externalId?: string;
    email?: string;
    phone?: string;
    ipAddress?: string;
    userAgent?: string;
    fbc?: string;
    fbp?: string;
    ttclid?: string;
    lapid?: string;
    snapClickId?: string;
    pinterestClickId?: string;
    gbraid?: string;
    wbraid?: string;
  };
  customData: {
    value?: number;
    currency?: string;
    contents?: Array<{ id: string; quantity: number; price: number }>;
    contentName?: string;
    contentType?: string;
  };
}

// ── Parse Meta Webhook ─────────────────────────────────────

function parseMetaWebhook(body: any): WebhookPayload {
  return {
    platform: "meta",
    eventName: body.event_name || body.event || "Unknown",
    eventTime: body.event_time || Math.floor(Date.now() / 1000),
    userData: {
      externalId: body.user_data?.external_id,
      email: body.user_data?.email,
      phone: body.user_data?.phone,
      ipAddress: body.user_data?.client_ip_address,
      userAgent: body.user_data?.client_user_agent,
      fbc: body.user_data?.fbc,
      fbp: body.user_data?.fbp,
    },
    customData: {
      value: body.custom_data?.value || body.value,
      currency: body.custom_data?.currency || body.currency || "USD",
      contents: body.custom_data?.contents,
      contentName: body.custom_data?.content_name,
      contentType: body.custom_data?.content_type,
    },
  };
}

// ── Parse Google Webhook ───────────────────────────────────

function parseGoogleWebhook(body: any): WebhookPayload {
  return {
    platform: "google",
    eventName: body.conversions?.[0]?.type || "conversion",
    eventTime: body.conversions?.[0]?.conversionDateTime || Math.floor(Date.now() / 1000),
    userData: {
      externalId: body.conversions?.[0]?.userIdentifiers?.[0]?.externalId,
      email: body.conversions?.[0]?.userIdentifiers?.[0]?.addressInfo?.hashedEmail,
      gbraid: body.conversions?.[0]?.userIdentifiers?.[0]?.gclidInfo?.gbraid,
      wbraid: body.conversions?.[0]?.userIdentifiers?.[0]?.gclidInfo?.wbraid,
    },
    customData: {
      value: body.conversions?.[0]?.conversionValue?.monetaryValue || 0,
      currency: body.conversions?.[0]?.conversionValue?.currencyCode || "USD",
    },
  };
}

// ── Parse TikTok Webhook ───────────────────────────────────

function parseTikTokWebhook(body: any): WebhookPayload {
  return {
    platform: "tiktok",
    eventName: body.event || "ViewContent",
    eventTime: body.timestamp || Math.floor(Date.now() / 1000),
    userData: {
      externalId: body.external_id,
      email: body.email,
      ttclid: body.ttclid,
    },
    customData: {
      value: body.value || 0,
      currency: body.currency || "USD",
      contents: body.contents,
    },
  };
}

// ── Parse LinkedIn Webhook ─────────────────────────────────

function parseLinkedInWebhook(body: any): WebhookPayload {
  return {
    platform: "linkedin",
    eventName: body.eventType || "conversion",
    eventTime: body.timestamp || Math.floor(Date.now() / 1000),
    userData: {
      externalId: body.externalId,
      email: body.hashedEmail,
      lapid: body.lapid,
    },
    customData: {
      value: body.conversionValue || 0,
      currency: body.currency || "USD",
    },
  };
}

// ── Parse Snapchat Webhook ─────────────────────────────────

function parseSnapWebhook(body: any): WebhookPayload {
  return {
    platform: "snap",
    eventName: body.event?.event_name || "conversion",
    eventTime: body.event?.timestamp || Math.floor(Date.now() / 1000),
    userData: {
      externalId: body.event?.user?.external_id,
      email: body.event?.user?.email,
      snapClickId: body.event?.user?.snap_click_id,
    },
    customData: {
      value: body.event?.value || 0,
      currency: body.event?.currency || "USD",
    },
  };
}

// ── Parse Pinterest Webhook ─────────────────────────────────

function parsePinterestWebhook(body: any): WebhookPayload {
  return {
    platform: "pinterest",
    eventName: body.event_name || "conversion",
    eventTime: body.event_time || Math.floor(Date.now() / 1000),
    userData: {
      externalId: body.user_data?.external_id,
      email: body.user_data?.email,
      pinterestClickId: body.user_data?.pinterest_click_id,
    },
    customData: {
      value: body.custom_data?.value || 0,
      currency: body.custom_data?.currency || "USD",
    },
  };
}

// ── Main Webhook Handler ───────────────────────────────────

export async function handleWebhook(
  req: NextRequest,
  platform: string
): Promise<NextResponse> {
  try {
    const body = await req.json();

    // Parse platform-specific webhook
    let payload: WebhookPayload;
    switch (platform) {
      case "meta":
        payload = parseMetaWebhook(body);
        break;
      case "google":
        payload = parseGoogleWebhook(body);
        break;
      case "tiktok":
        payload = parseTikTokWebhook(body);
        break;
      case "linkedin":
        payload = parseLinkedInWebhook(body);
        break;
      case "snap":
        payload = parseSnapWebhook(body);
        break;
      case "pinterest":
        payload = parsePinterestWebhook(body);
        break;
      default:
        return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
    }

    // Find tenant by platform integration
    const db = await getDb();
    const integration = await db.prepare(`
      SELECT tenant_id FROM tenant_integrations
      WHERE platform = ? AND status = 'active'
      LIMIT 1
    `).get(platform) as any;

    if (!integration) {
      return NextResponse.json({ error: `No active integration for ${platform}` }, { status: 404 });
    }

    // Process through CAPI enrichment pipeline
    const result = await enrichConversionEvent(integration.tenant_id, {
      platform: platform as any,
      eventName: payload.eventName,
      eventTime: payload.eventTime * 1000,
      userData: payload.userData,
      customData: {
        currency: payload.customData.currency || "USD",
        value: payload.customData.value || 0,
        contentName: payload.customData.contentName,
      },
      consent: {
        gdpr: body.consent?.gdpr ?? body.data_processing_consent ?? true,
        ccpa: body.consent?.ccpa ?? body.do_not_sell !== true,
        gpc: body.consent?.gpc ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      signalId: result.id,
      ltv: result.enriched.predictedLtv90d,
      segment: result.enriched.ltvSegment,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

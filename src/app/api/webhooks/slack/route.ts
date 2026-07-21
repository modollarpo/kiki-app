// ============================================================
// KIKI Agent Platform — Slack Interaction Webhook
//
// Receives button click payloads from Slack Block Kit messages
// (the [Approve] / [Reject] buttons on bid approval messages).
//
// Slack sends a URL-encoded form body with `payload=<JSON>`.
// We verify the request signature using SLACK_SIGNING_SECRET,
// then resolve the pending approval and—if approved—push the
// bid change to the ad platform connector.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { resolveApproval, getApproval } from "@/lib/slack";
import { getDb } from "@/lib/db";
import { decryptToken } from "@/lib/connectors/base";

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? "";

// ── Slack signature verification ───────────────────────────

function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  if (!SIGNING_SECRET) return true; // Skip in mock/dev mode

  // Reject stale requests (older than 5 minutes)
  const reqTime = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - reqTime) > 300) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const computed = "v0=" + crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(baseString)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

// ── Execute approved bid on the ad platform ─────────────────

async function executeBidChange(approvalId: string): Promise<{ ok: boolean; error?: string }> {
  const approval = await getApproval(approvalId);
  if (!approval) return { ok: false, error: "Approval not found" };

  const db = await getDb();

  // Update local campaign record
  await db.prepare(
    `UPDATE campaigns SET bid = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(approval.newBid, approval.campaignId);

  // Push to platform connector if integration exists
  const integration = await db.prepare(
    `SELECT access_token FROM tenant_integrations
     WHERE tenant_id = ? AND platform = ? AND status = 'active'`
  ).get(approval.tenantId, approval.platform) as { access_token: string } | undefined;

  if (integration) {
    try {
      const { getConnector, isPlatformSupported } = await import("@/lib/connectors");
      if (isPlatformSupported(approval.platform)) {
        const connector = getConnector(approval.platform as Parameters<typeof getConnector>[0]);
        const token = decryptToken(integration.access_token);
        if (typeof connector.updateCampaign === "function") {
          const result = await connector.updateCampaign(token, approval.campaignId, {
            dailyBudget: approval.newBid,
          });
          if (!result.success) {
            throw new Error(result.error ?? "updateCampaign failed");
          }
        }
      }
    } catch (err) {
      // Log failure but don't block — the DB is already updated
      console.error("[Slack] Platform push failed after approval:", err);
    }
  }

  // Log in agent_actions
  await db.prepare(`
    INSERT INTO agent_actions (id, tenant_id, agent_type, action_type, details, created_at)
    VALUES (?, ?, 'bidding', 'bid_adjustment', ?, datetime('now'))
  `).run(
    `bid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    approval.tenantId,
    JSON.stringify({
      campaignId: approval.campaignId,
      currentBid: approval.currentBid,
      newBid: approval.newBid,
      changePercent: approval.changePercent,
      reason: `[Slack-approved] ${approval.reason}`,
      approvalId,
    }),
  );

  return { ok: true };
}

// ── POST /api/webhooks/slack ────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";

  if (!verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  // Slack sends URL-encoded form data: payload=<JSON>
  let slackPayload: Record<string, unknown>;
  try {
    const params = new URLSearchParams(rawBody);
    const raw = params.get("payload");
    if (!raw) throw new Error("Missing payload");
    slackPayload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed payload" }, { status: 400 });
  }

  const actions = slackPayload.actions as Array<{ action_id: string; value: string }> | undefined;
  if (!actions?.length) {
    return NextResponse.json({ ok: true }); // Acknowledge non-action payloads
  }

  const action = actions[0];
  const approvalId = action.value;

  if (action.action_id === "bid_approve") {
    const approval = await resolveApproval(approvalId, "approved", "slack");
    if (!approval) {
      return NextResponse.json({ ok: false, error: "Approval not found or already resolved" }, { status: 404 });
    }

    const execResult = await executeBidChange(approvalId);
    if (!execResult.ok) {
      return NextResponse.json({ ok: false, error: execResult.error }, { status: 500 });
    }

    // Respond to Slack with updated message
    return NextResponse.json({
      response_type: "in_channel",
      replace_original: true,
      text: `✅ *Approved* — Bid change for \`${approval.campaignName}\` on *${approval.platform.toUpperCase()}* has been executed. New bid: $${approval.newBid.toFixed(2)}`,
    });
  }

  if (action.action_id === "bid_reject") {
    const approval = await resolveApproval(approvalId, "rejected", "slack");
    if (!approval) {
      return NextResponse.json({ ok: false, error: "Approval not found or already resolved" }, { status: 404 });
    }

    return NextResponse.json({
      response_type: "in_channel",
      replace_original: true,
      text: `❌ *Rejected* — Bid change for \`${approval.campaignName}\` was cancelled. No changes made.`,
    });
  }

  // Unknown action — acknowledge without error
  return NextResponse.json({ ok: true });
}

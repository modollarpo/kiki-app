// ============================================================
// KIKI Agent Platform — Slack Approval Dispatcher
//
// Sends rich Block Kit messages to a Slack channel whenever the
// bidding circuit breaker holds a decision for human review.
//
// Required env vars:
//   SLACK_BOT_TOKEN   — xoxb-... from Slack App OAuth settings
//   SLACK_CHANNEL_ID  — Channel ID to post approvals into
//   NEXT_PUBLIC_APP_URL — Public base URL for webhook callbacks
//
// Without SLACK_BOT_TOKEN the dispatcher silently auto-approves
// (mock mode) so local dev works without credentials.
// ============================================================

import type { BiddingApprovalRequestedPayload } from "../../packages/shared/src/events";
import { getDb } from "./db";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID ?? "C_GENERAL";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const APPROVAL_TTL_MS = 30 * 60 * 1000; // 30 minutes before auto-expire

// ── Platform label helpers ─────────────────────────────────

const PLATFORM_EMOJI: Record<string, string> = {
  meta: "🟦",
  google: "🔴",
  tiktok: "⬛",
  snap: "🟡",
  pinterest: "🔴",
  linkedin: "🔵",
};

function platformEmoji(platform: string): string {
  return PLATFORM_EMOJI[platform.toLowerCase()] ?? "📢";
}

function changeColor(pct: number): "danger" | "warning" | "good" {
  if (Math.abs(pct) >= 30) return "danger";
  if (Math.abs(pct) >= 15) return "warning";
  return "good";
}

// ── Pending approval store ─────────────────────────────────

export interface PendingApproval {
  approvalId: string;
  tenantId: string;
  campaignId: string;
  campaignName: string;
  platform: string;
  currentBid: number;
  newBid: number;
  changePercent: number;
  reason: string;
  confidence: number;
  ltvRatio: number;
  stopLossTriggered: boolean;
  expiresAt: number;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: number;
}

/** Persist a pending approval to the database. */
export async function savePendingApproval(approval: PendingApproval): Promise<void> {
  const db = await getDb();
  await db.prepare(`
    INSERT OR REPLACE INTO bid_approvals
      (id, tenant_id, campaign_id, campaign_name, platform,
       current_bid, new_bid, change_percent, reason, confidence,
       ltv_ratio, stop_loss_triggered, expires_at, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    approval.approvalId,
    approval.tenantId,
    approval.campaignId,
    approval.campaignName,
    approval.platform,
    approval.currentBid,
    approval.newBid,
    approval.changePercent,
    approval.reason,
    approval.confidence,
    approval.ltvRatio,
    approval.stopLossTriggered ? 1 : 0,
    approval.expiresAt,
    approval.status,
    approval.createdAt,
  );
}

/** Resolve an approval (approve / reject / expire). */
export async function resolveApproval(
  approvalId: string,
  resolution: "approved" | "rejected" | "expired",
  resolvedBy: string = "system",
): Promise<PendingApproval | null> {
  const db = await getDb();

  const row = await db.prepare(
    `SELECT * FROM bid_approvals WHERE id = ?`
  ).get(approvalId) as Record<string, unknown> | undefined;

  if (!row) return null;
  if ((row.status as string) !== "pending") {
    // Already resolved — idempotent
    return rowToApproval(row);
  }

  await db.prepare(
    `UPDATE bid_approvals SET status = ?, resolved_at = ? WHERE id = ?`
  ).run(resolution, Date.now(), approvalId);

  return { ...rowToApproval(row), status: resolution };
}

/** Fetch a pending approval by ID. */
export async function getApproval(approvalId: string): Promise<PendingApproval | null> {
  const db = await getDb();
  const row = await db.prepare(
    `SELECT * FROM bid_approvals WHERE id = ?`
  ).get(approvalId) as Record<string, unknown> | undefined;
  return row ? rowToApproval(row) : null;
}

/** Fetch all pending approvals for a tenant. */
export async function getPendingApprovals(tenantId: string): Promise<PendingApproval[]> {
  const db = await getDb();
  const rows = await db.prepare(
    `SELECT * FROM bid_approvals WHERE tenant_id = ? AND status = 'pending' ORDER BY created_at DESC`
  ).all(tenantId) as Record<string, unknown>[];
  return rows.map(rowToApproval);
}

function rowToApproval(row: Record<string, unknown>): PendingApproval {
  return {
    approvalId: row.id as string,
    tenantId: row.tenant_id as string,
    campaignId: row.campaign_id as string,
    campaignName: row.campaign_name as string,
    platform: row.platform as string,
    currentBid: row.current_bid as number,
    newBid: row.new_bid as number,
    changePercent: row.change_percent as number,
    reason: row.reason as string,
    confidence: row.confidence as number,
    ltvRatio: row.ltv_ratio as number,
    stopLossTriggered: Boolean(row.stop_loss_triggered),
    expiresAt: row.expires_at as number,
    status: row.status as PendingApproval["status"],
    createdAt: row.created_at as number,
  };
}

// ── Slack Block Kit message builder ───────────────────────

function buildSlackBlocks(a: BiddingApprovalRequestedPayload): object[] {
  const sign = a.changePercent >= 0 ? "+" : "";
  const emoji = platformEmoji(a.platform);
  const color = changeColor(a.changePercent);
  const pctLabel = `${sign}${a.changePercent.toFixed(1)}%`;
  const expiry = new Date(a.expiresAt).toISOString();

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: a.stopLossTriggered
          ? `🚨 STOP-LOSS TRIGGERED — ${a.campaignName}`
          : `🤖 KIKI Bid Decision — ${a.campaignName}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Platform*\n${emoji} ${a.platform.toUpperCase()}` },
        { type: "mrkdwn", text: `*Campaign*\n${a.campaignName}` },
        { type: "mrkdwn", text: `*Current Bid*\n$${a.currentBid.toFixed(2)}` },
        { type: "mrkdwn", text: `*Proposed Bid*\n$${a.newBid.toFixed(2)} (${pctLabel})` },
        { type: "mrkdwn", text: `*LTV/CAC Ratio*\n${a.ltvRatio.toFixed(1)}×` },
        { type: "mrkdwn", text: `*AI Confidence*\n${(a.confidence * 100).toFixed(0)}%` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🧠 AI Reasoning*\n>${a.reason}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⏱ Auto-expires at ${expiry} · Approval ID: \`${a.approvalId}\``,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ Approve", emoji: true },
          style: "primary",
          action_id: "bid_approve",
          value: a.approvalId,
          confirm: {
            title: { type: "plain_text", text: "Confirm Approval" },
            text: { type: "mrkdwn", text: `Push bid change of *${pctLabel}* to ${a.platform.toUpperCase()}?` },
            confirm: { type: "plain_text", text: "Yes, execute" },
            deny: { type: "plain_text", text: "Cancel" },
          },
        },
        {
          type: "button",
          text: { type: "plain_text", text: "❌ Reject", emoji: true },
          style: "danger",
          action_id: "bid_reject",
          value: a.approvalId,
        },
      ],
    },
    { type: "divider" },
  ];
}

// ── Main dispatcher ────────────────────────────────────────

export interface DispatchResult {
  sent: boolean;
  mock: boolean;
  slackTs?: string;
  error?: string;
}

/**
 * Sends a Slack approval message for a pending bid decision.
 * Falls back to console logging when SLACK_BOT_TOKEN is absent.
 */
export async function dispatchApprovalRequest(
  payload: BiddingApprovalRequestedPayload
): Promise<DispatchResult> {
  // Persist the pending approval first (regardless of Slack status)
  const approval: PendingApproval = {
    approvalId: payload.approvalId,
    tenantId: payload.tenantId,
    campaignId: payload.campaignId,
    campaignName: payload.campaignName,
    platform: payload.platform,
    currentBid: payload.currentBid,
    newBid: payload.newBid,
    changePercent: payload.changePercent,
    reason: payload.reason,
    confidence: payload.confidence,
    ltvRatio: payload.ltvRatio,
    stopLossTriggered: payload.stopLossTriggered,
    expiresAt: payload.expiresAt,
    status: "pending",
    createdAt: Date.now(),
  };
  await savePendingApproval(approval);

  // ── Mock mode: no Slack token ──────────────────────────
  if (!SLACK_BOT_TOKEN) {
    const sign = payload.changePercent >= 0 ? "+" : "";
    console.warn(
      `[KIKI Slack] MOCK — Approval ${payload.approvalId}: ` +
      `${payload.campaignName} bid ${sign}${payload.changePercent.toFixed(1)}% ` +
      `on ${payload.platform}. Set SLACK_BOT_TOKEN to send real messages.`
    );
    return { sent: false, mock: true };
  }

  // ── Real Slack delivery ────────────────────────────────
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `KIKI bid decision pending approval for *${payload.campaignName}*`,
        blocks: buildSlackBlocks(payload),
      }),
    });

    const data = await res.json() as { ok: boolean; ts?: string; error?: string };
    if (!data.ok) {
      throw new Error(data.error ?? "Unknown Slack API error");
    }

    return { sent: true, mock: false, slackTs: data.ts };
  } catch (err) {
    return { sent: false, mock: false, error: (err as Error).message };
  }
}

export { APPROVAL_TTL_MS };

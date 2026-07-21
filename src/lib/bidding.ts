// ============================================================
// KIKI Agent Platform — Autonomous Bidding Orchestrator
// Runs on configurable interval (default 5 min), evaluates
// LTV/CAC, day-parting, stop-loss, and cross-platform budget
// arbitrage. Uses Groq for fast batch scoring with heuristic
// fallback.
// ============================================================

import { getDb } from "./db";
import { predictLTV } from "./ltv-engine";
import { eventBus, EVENTS } from "./events";
import { getTenantContext } from "./tenant";
import { scoreBidsBatch, isGroqConfigured, type GroqBidInput } from "./groq";
import { decryptToken } from "./connectors/base";
import { dispatchApprovalRequest, APPROVAL_TTL_MS } from "./slack";
import { detectCreativeFatigue } from "./creative";

// ── Circuit-breaker threshold ──────────────────────────────
// Any bid change beyond this % (or any stop-loss) is sent to
// Slack for human approval before hitting the ad platform.
const APPROVAL_THRESHOLD_PCT = 20;

// ── Types ──────────────────────────────────────────────────

export interface BidDecision {
  campaignId: string;
  campaignName: string;
  platform: string;
  currentBid: number;
  newBid: number;
  changePercent: number;
  reason: string;
  confidence: number;
  ltvRatio: number;
  dayPartWeight: number;
  stopLossTriggered: boolean;
}

export interface DayPartWeight {
  hour: number;
  dayOfWeek: number;
  weight: number; // 0.0 - 2.0 (1.0 = baseline)
}

export interface CampaignMetrics {
  campaignId: string;
  tenantId: string;
  platform: string;
  dailyBudget: number;
  currentSpend: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
  targetCpa: number;
  targetRoas: number;
  ltvCacRatio: number;
  bidAmount: number;
  status: string;
}

// ── Day-Parting Weights ────────────────────────────────────
// 24 hourly weights × 7 daily weights = 168 weight values

const HOURLY_WEIGHTS: number[] = [
  0.4, 0.3, 0.2, 0.2, 0.3, 0.5,  // 00-05: night (low)
  0.7, 0.9, 1.1, 1.3, 1.4, 1.5,  // 06-11: morning (rising)
  1.6, 1.5, 1.4, 1.3, 1.4, 1.5,  // 12-17: afternoon (peak)
  1.6, 1.5, 1.3, 1.1, 0.8, 0.5,  // 18-23: evening (falling)
];

const DAILY_WEIGHTS: number[] = [
  1.0,  // Sunday
  1.1,  // Monday
  1.15, // Tuesday
  1.2,  // Wednesday (peak)
  1.15, // Thursday
  1.1,  // Friday
  0.9,  // Saturday
];

export function getDayPartWeight(date: Date = new Date()): number {
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  return HOURLY_WEIGHTS[hour] * DAILY_WEIGHTS[dayOfWeek];
}

// ── LTV/CAC Ratio Evaluation ──────────────────────────────

function evaluateLtvCacRatio(
  campaign: CampaignMetrics,
  avgLtv: number
): { ratio: number; signal: "increase" | "decrease" | "maintain"; confidence: number } {
  const cpa = campaign.cpa || campaign.targetCpa;
  const ratio = cpa > 0 ? avgLtv / cpa : 0;

  if (ratio >= 3.0) {
    return { ratio, signal: "increase", confidence: 0.9 };
  } else if (ratio >= 2.0) {
    return { ratio, signal: "maintain", confidence: 0.8 };
  } else if (ratio >= 1.5) {
    return { ratio, signal: "decrease", confidence: 0.7 };
  } else {
    return { ratio, signal: "decrease", confidence: 0.9 };
  }
}

// ── Stop-Loss Evaluation ──────────────────────────────────

function evaluateStopLoss(
  campaign: CampaignMetrics,
  currentHour: number
): { triggered: boolean; reason: string; action: "freeze_card" | "pause_campaign" | "reduce_bid" } {
  const spendRatio = campaign.dailyBudget > 0 ? campaign.currentSpend / campaign.dailyBudget : 0;
  const timeRatio = currentHour / 24;

  // Trigger 1: Spend exceeding time ratio by 50%+
  if (spendRatio > timeRatio * 1.5 && spendRatio > 0.5) {
    return {
      triggered: true,
      reason: `Spend ${(spendRatio * 100).toFixed(0)}% exceeds time ratio ${(timeRatio * 100).toFixed(0)}% by >50%`,
      action: "reduce_bid",
    };
  }

  // Trigger 2: CPA exceeds 2.5× target
  if (campaign.cpa > campaign.targetCpa * 2.5) {
    return {
      triggered: true,
      reason: `CPA $${campaign.cpa.toFixed(2)} exceeds 2.5× target $${campaign.targetCpa.toFixed(2)}`,
      action: "freeze_card",
    };
  }

  // Trigger 3: ROAS below 0.5× target
  if (campaign.roas < campaign.targetRoas * 0.5 && campaign.conversions > 10) {
    return {
      triggered: true,
      reason: `ROAS ${campaign.roas.toFixed(2)}× below 0.5× target ${campaign.targetRoas.toFixed(2)}×`,
      action: "pause_campaign",
    };
  }

  // Trigger 4: LTV/CAC ratio below 1.0
  if (campaign.ltvCacRatio < 1.0 && campaign.conversions > 5) {
    return {
      triggered: true,
      reason: `LTV/CAC ratio ${campaign.ltvCacRatio.toFixed(2)} below 1.0 — losing money`,
      action: "freeze_card",
    };
  }

  return { triggered: false, reason: "", action: "reduce_bid" };
}

// ── Cross-Platform Budget Arbitrage ────────────────────────

function evaluateBudgetArbitrage(
  campaigns: CampaignMetrics[]
): { campaignId: string; action: "increase" | "decrease"; amount: number; reason: string }[] {
  const decisions: { campaignId: string; action: "increase" | "decrease"; amount: number; reason: string }[] = [];

  // Find best and worst performing campaigns
  const sorted = [...campaigns]
    .filter(c => c.status === "active" && c.conversions > 5)
    .sort((a, b) => b.roas - a.roas);

  if (sorted.length < 2) return decisions;

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // If best ROAS is 2×+ worse than worst, reallocate
  if (best.roas > worst.roas * 2 && best.platform !== worst.platform) {
    const shiftAmount = Math.min(
      worst.dailyBudget * 0.2, // Max 20% shift
      best.dailyBudget * 0.3   // Max 30% increase
    );

    if (shiftAmount > 10) {
      decisions.push({
        campaignId: best.campaignId,
        action: "increase",
        amount: shiftAmount,
        reason: `Best performer (${best.platform}) ROAS ${best.roas.toFixed(1)}× vs worst ${worst.roas.toFixed(1)}×`,
      });
      decisions.push({
        campaignId: worst.campaignId,
        action: "decrease",
        amount: shiftAmount,
        reason: `Worst performer (${worst.platform}) ROAS ${worst.roas.toFixed(1)}× — shifting budget`,
      });
    }
  }

  return decisions;
}

// ── Main Bidding Cycle ─────────────────────────────────────

const PROFIT_MARGIN_URL = process.env.PROFIT_MARGIN_URL || "http://localhost:3024";

async function fetchPortfolioMargin(tenantId: string): Promise<number> {
  try {
    const res = await fetch(`${PROFIT_MARGIN_URL}/api/margins/portfolio?tenantId=${tenantId}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return 50;
    const data = await res.json();
    return parseFloat(data.data?.summary?.avg_margin || "50");
  } catch {
    return 50;
  }
}

// ── Heuristic bid scoring (fallback when Groq unavailable) ─
function heuristicScoreBid(
  metrics: CampaignMetrics,
  avgLtv: number,
  dayPartWeight: number,
  now: Date
): { newBid: number; changePercent: number; reason: string; confidence: number } {
  const ltvEvaluation = evaluateLtvCacRatio(metrics, avgLtv);
  const stopLoss = evaluateStopLoss(metrics, now.getHours());

  let adjustedBid = metrics.bidAmount * dayPartWeight;

  if (ltvEvaluation.signal === "increase") {
    adjustedBid *= 1.2;
  } else if (ltvEvaluation.signal === "decrease") {
    adjustedBid *= 0.7;
  }

  let finalBid = adjustedBid;
  let reason = `LTV/CAC ${ltvEvaluation.ratio.toFixed(1)}× (${ltvEvaluation.signal}) + day-part ${dayPartWeight.toFixed(2)}`;

  if (stopLoss.triggered) {
    finalBid = adjustedBid * 0.3;
    reason = `STOP-LOSS: ${stopLoss.reason}`;

    eventBus.emit("bidding.stop_loss", {
      tenantId: metrics.tenantId,
      campaignId: metrics.campaignId,
      reason: stopLoss.reason,
      action: stopLoss.action,
    });
  }

  const changePercent = metrics.bidAmount > 0
    ? ((finalBid - metrics.bidAmount) / metrics.bidAmount) * 100
    : 0;

  return { newBid: finalBid, changePercent, reason, confidence: ltvEvaluation.confidence };
}

export async function runBiddingCycle(tenantId: string): Promise<BidDecision[]> {
  const db = await getDb();
  const decisions: BidDecision[] = [];
  const now = new Date();
  const dayPartWeight = getDayPartWeight(now);

  // Fetch portfolio margin from profit-margin-service
  const avgMarginPct = await fetchPortfolioMargin(tenantId);
  const marginFactor = avgMarginPct / 100;

  // 1. Get all active campaigns for this tenant
  const campaigns = await db.prepare(`
    SELECT * FROM campaigns WHERE tenant_id = ? AND status = 'active'
  `).all(tenantId) as any[];

  // 2. Get LTV predictions for each campaign's audience
  const campaignMetrics: CampaignMetrics[] = [];

  for (const campaign of campaigns) {
    // Get average LTV for this campaign's audience
    const ltvData = await db.prepare(`
      SELECT AVG(predicted_ltv) as avg_ltv, COUNT(*) as count
      FROM ltv_predictions
      WHERE tenant_id = ? AND created_at >= datetime('now', '-7 days')
    `).get(tenantId) as any;

    const avgLtv = ltvData?.avg_ltv || 100;
    const spend = campaign.spend || 0;
    const conversions = campaign.conversions || 0;
    const revenue = campaign.revenue || 0;
    const cpa = conversions > 0 ? spend / conversions : campaign.budget || 100;
    const roas = spend > 0 ? (revenue * marginFactor) / spend : 0;
    const ltvCacRatio = cpa > 0 ? avgLtv / cpa : 0;

    campaignMetrics.push({
      campaignId: campaign.id,
      tenantId,
      platform: campaign.platform || "meta",
      dailyBudget: campaign.budget / 30 || 100,
      currentSpend: spend / 30,
      conversions,
      revenue,
      roas,
      cpa,
      targetCpa: campaign.target_cpa || cpa,
      targetRoas: campaign.target_roas || 4.0,
      ltvCacRatio,
      bidAmount: campaign.bid || cpa * 0.8,
      status: campaign.status,
    });
  }

  // 3. Score bids — Groq batch (fast path) or heuristic (fallback)
  const useGroq = isGroqConfigured() && campaignMetrics.length > 0;
  let groqResults: Awaited<ReturnType<typeof scoreBidsBatch>> = [];

  if (useGroq) {
    // Build Groq batch input
    const ltvData = await db.prepare(`
      SELECT AVG(predicted_ltv) as avg FROM ltv_predictions
      WHERE tenant_id = ? AND created_at >= datetime('now', '-7 days')
    `).get(tenantId) as any;
    const avgLtv = ltvData?.avg || 100;

    const groqInput: GroqBidInput[] = campaignMetrics.map(m => ({
      campaignId: m.campaignId,
      name: `Campaign ${m.campaignId}`,
      platform: m.platform,
      roas: m.roas,
      spend: m.currentSpend * 30,
      budget: m.dailyBudget * 30,
      cpa: m.cpa,
      targetCpa: m.targetCpa,
      targetRoas: m.targetRoas,
      ltvCacRatio: m.ltvCacRatio,
      currentBid: m.bidAmount,
      dayPartWeight,
    }));

    groqResults = await scoreBidsBatch(groqInput);
  }

  // 4. Build decisions — use Groq results where available, fallback to heuristic
  for (const metrics of campaignMetrics) {
    const groqResult = groqResults.find(r => r.campaignId === metrics.campaignId);

    if (groqResult) {
      // Groq fast path — apply result with stop-loss safety net
      const stopLoss = evaluateStopLoss(metrics, now.getHours());
      let finalBid = groqResult.newBid;
      let reason = groqResult.reason;
      let confidence = groqResult.confidence;

      if (stopLoss.triggered) {
        finalBid = groqResult.newBid * 0.3;
        reason = `STOP-LOSS: ${stopLoss.reason}`;
        confidence = 0.9;

        eventBus.emit("bidding.stop_loss", {
          tenantId,
          campaignId: metrics.campaignId,
          reason: stopLoss.reason,
          action: stopLoss.action,
        });
      }

      const changePercent = metrics.bidAmount > 0
        ? ((finalBid - metrics.bidAmount) / metrics.bidAmount) * 100
        : 0;

      decisions.push({
        campaignId: metrics.campaignId,
        campaignName: `Campaign ${metrics.campaignId}`,
        platform: metrics.platform,
        currentBid: metrics.bidAmount,
        newBid: finalBid,
        changePercent,
        reason,
        confidence,
        ltvRatio: metrics.ltvCacRatio,
        dayPartWeight,
        stopLossTriggered: stopLoss.triggered,
      });
    } else {
      // Heuristic fallback
      const ltvData = await db.prepare(`
        SELECT AVG(predicted_ltv) as avg FROM ltv_predictions
        WHERE tenant_id = ? AND created_at >= datetime('now', '-7 days')
      `).get(tenantId) as any;

      const result = heuristicScoreBid(metrics, ltvData?.avg || 100, dayPartWeight, now);

      decisions.push({
        campaignId: metrics.campaignId,
        campaignName: `Campaign ${metrics.campaignId}`,
        platform: metrics.platform,
        currentBid: metrics.bidAmount,
        newBid: result.newBid,
        changePercent: result.changePercent,
        reason: result.reason,
        confidence: result.confidence,
        ltvRatio: metrics.ltvCacRatio,
        dayPartWeight,
        stopLossTriggered: result.reason.startsWith("STOP-LOSS"),
      });
    }
  }

  // 4. Cross-platform budget arbitrage
  const arbitrage = evaluateBudgetArbitrage(campaignMetrics);
  for (const arb of arbitrage) {
    const existing = decisions.find(d => d.campaignId === arb.campaignId);
    if (existing) {
      existing.reason += ` | ARBITRAGE: ${arb.reason}`;
      existing.newBid += arb.action === "increase" ? arb.amount : -arb.amount;
      existing.changePercent = ((existing.newBid - existing.currentBid) / existing.currentBid) * 100;
    }
  }

  // 5. Apply decisions to database AND push to platforms
  const { getConnector, isPlatformSupported } = await import("./connectors");
  const integrations = await db.prepare(`
    SELECT platform, access_token, config FROM tenant_integrations
    WHERE tenant_id = ? AND status = 'active'
  `).all(tenantId) as Array<{ platform: string; access_token: string; config: string }>;

  for (const decision of decisions) {
    // ── Circuit breaker: hold high-impact decisions for human review ──
    const needsApproval =
      Math.abs(decision.changePercent) >= APPROVAL_THRESHOLD_PCT ||
      decision.stopLossTriggered;

    if (needsApproval) {
      const approvalId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await dispatchApprovalRequest({
        approvalId,
        tenantId,
        campaignId: decision.campaignId,
        campaignName: decision.campaignName,
        platform: decision.platform,
        currentBid: decision.currentBid,
        newBid: decision.newBid,
        changePercent: decision.changePercent,
        reason: decision.reason,
        confidence: decision.confidence,
        ltvRatio: decision.ltvRatio,
        stopLossTriggered: decision.stopLossTriggered,
        expiresAt: Date.now() + APPROVAL_TTL_MS,
      });

      // Log the held decision
      await db.prepare(`
        INSERT INTO agent_actions
        (id, tenant_id, agent_type, action_type, details, created_at)
        VALUES (?, ?, 'bidding', 'approval_requested', ?, datetime('now'))
      `).run(
        `bid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tenantId,
        JSON.stringify({ ...decision, status: "awaiting_approval" }),
      );

      // Skip immediate execution — wait for Slack approval webhook
      continue;
    }

    // ── Auto-execute: small / routine bid change ───────────────────
    // Update local database
    await db.prepare(`
      UPDATE campaigns SET bid = ?, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).run(decision.newBid, decision.campaignId, tenantId);

    // Push bid change to real platform (if connector exists)
    const platformInteg = integrations.find(i => i.platform === decision.platform);
    if (platformInteg && isPlatformSupported(decision.platform)) {
      try {
        const connector = getConnector(decision.platform as any);
        const accessToken = decryptToken(platformInteg.access_token);
        if (typeof connector.updateCampaign === "function") {
          const result = await connector.updateCampaign(accessToken, decision.campaignId, {
            dailyBudget: decision.newBid,
          });
          if (result.success) {
            await db.prepare(`
              INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
              VALUES (?, 'bidding.platform_push_success', ?, ?, datetime('now'))
            `).run(tenantId, decision.newBid, JSON.stringify({
              platform: decision.platform,
              campaignId: decision.campaignId,
              currentBid: decision.currentBid,
              newBid: decision.newBid,
              reason: decision.reason,
            }));
          } else {
            throw new Error(result.error || "updateCampaign returned success=false");
          }
        }
      } catch (e) {
        await db.prepare(`
          INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
          VALUES (?, 'bidding.platform_push_failed', 1, ?, datetime('now'))
        `).run(tenantId, JSON.stringify({ platform: decision.platform, error: String(e) }));
      }
    }

    // Log the decision
    await db.prepare(`
      INSERT INTO agent_actions
      (id, tenant_id, agent_type, action_type, details, created_at)
      VALUES (?, ?, 'bidding', ?, ?, datetime('now'))
    `).run(
      `bid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      decision.stopLossTriggered ? "stop_loss" : "bid_adjustment",
      JSON.stringify({
        campaignId: decision.campaignId,
        currentBid: decision.currentBid,
        newBid: decision.newBid,
        changePercent: decision.changePercent,
        reason: decision.reason,
        ltvRatio: decision.ltvRatio,
        dayPartWeight: decision.dayPartWeight,
      })
    );
  }

  // 6. Detect creative fatigue and emit events for any fatigued campaigns
  try {
    const fatigued = await detectCreativeFatigue(tenantId);
    for (const ctx of fatigued) {
      eventBus.emit("creative.fatigue_detected", {
        tenantId,
        campaignId: ctx.campaignId,
        campaignName: ctx.campaignName,
        platform: ctx.platform,
        consecutiveLowRoasDays: ctx.consecutiveLowRoasDays,
        currentRoas: ctx.currentRoas,
        targetRoas: ctx.targetRoas,
      });
      await db.prepare(`
        INSERT INTO agent_actions (id, tenant_id, agent_type, action_type, details, created_at)
        VALUES (?,?,'bidding','creative_fatigue_detected',?,datetime('now'))
      `).run(
        `fat_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        tenantId,
        JSON.stringify({ campaignId: ctx.campaignId, consecutiveDays: ctx.consecutiveLowRoasDays }),
      );
    }
  } catch {
    // Non-fatal — don't break the bidding cycle
  }

  // 7. Emit cycle complete event
  eventBus.emit("bidding.cycle_complete", {
    tenantId,
    campaignCount: campaigns.length,
    decisions: decisions.length,
    stopLosses: decisions.filter(d => d.stopLossTriggered).length,
    groqScoring: useGroq,
    timestamp: now.toISOString(),
  });

  return decisions;
}

// ── Bidding Stats ──────────────────────────────────────────

export async function getBiddingStats(tenantId: string) {
  const db = await getDb();

  const recentDecisions = await db.prepare(`
    SELECT * FROM agent_actions
    WHERE tenant_id = ? AND agent_type = 'bidding'
    ORDER BY created_at DESC LIMIT 50
  `).all(tenantId) as any[];

  const stopLosses = recentDecisions.filter(d => d.action_type === "stop_loss");
  const adjustments = recentDecisions.filter(d => d.action_type === "bid_adjustment");

  return {
    totalDecisions: recentDecisions.length,
    stopLosses: stopLosses.length,
    adjustments: adjustments.length,
    lastCycleAt: recentDecisions[0]?.created_at || null,
    avgConfidence: adjustments.length > 0
      ? adjustments.reduce((s: number, d: any) => {
          const details = JSON.parse(d.details || "{}");
          return s + (details.confidence || 0);
        }, 0) / adjustments.length
      : 0,
  };
}

// ── Day-Parting Analysis ───────────────────────────────────

export function getDayPartingWeights(): { hour: number; dayOfWeek: number; weight: number }[] {
  const weights: { hour: number; dayOfWeek: number; weight: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      weights.push({
        hour,
        dayOfWeek: day,
        weight: HOURLY_WEIGHTS[hour] * DAILY_WEIGHTS[day],
      });
    }
  }
  return weights;
}

// ── Event Wiring (Phase 2 & 3 Loop) ────────────────────────

export function initBiddingEventWiring() {
  // Listen for Competitor Pricing Arbitrage signals
  eventBus.on("competitor.price_drop", async (payload: any) => {
    console.log(`[BiddingEngine] Competitor price drop detected (${payload.dropPercent}%). Triggering aggressive arbitrage cycle...`);
    try {
      await runBiddingCycle(payload.tenantId);
    } catch (e) {
      console.error("[BiddingEngine] Arbitrage cycle failed", e);
    }
  });

  // Listen for Creative Fatigue signals
  eventBus.on("creative.fatigue_detected", async (payload: any) => {
    console.log(`[BiddingEngine] Creative fatigue detected on ${payload.platform}. Triggering GenAI creative replacement...`);
    // Phase 2 implementation: Hook into the GPT-4o + DALL-E pipeline
    // For now, emit a task to the oaas queue to generate new creatives
    try {
      const db = await getDb();
      await db.prepare(`
        INSERT INTO agent_actions (id, tenant_id, agent_role, action_type, description, confidence, timestamp)
        VALUES (?, ?, 'creative', 'generate_replacement', ?, 0.95, datetime('now'))
      `).run(
        `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        payload.tenantId,
        `Generate new DALL-E 3 creative for fatigued ad ${payload.creativeId} on ${payload.platform}`
      );
    } catch (e) {
      console.error("[BiddingEngine] Failed to dispatch creative generation task", e);
    }
  });
}

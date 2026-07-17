import { logger } from "./logger";
// ============================================================
// Background Scheduler — Runs agents on intervals
// Bidding: configurable via BIDDING_INTERVAL_MS (default 5 min)
// Continuous LTV training: every 6 hours
// Feedback collection: every 1 hour
// Metacognition: every 4 hours
// ============================================================

import { runAllAgents, runAgent, type AgentType } from "./agents";
import { runBiddingCycle } from "./bidding";
import { startAutoFreezeMonitor } from "./wallet";
import { startAutoSync } from "./platform-sync";
import { trainModel } from "./ltv-training";
import { collectWalletFeedback, collectPlatformFeedback, collectCommerceFeedback } from "./ltv-feedback";
import { adaptStrategy, runSelfReflection } from "./metacognition";
import { enforceDataRetentionPolicy } from "./gdpr";
import { validateEnvironment } from "./env";
import { eventBus, EVENTS } from "./events";
import { getDb } from "./db";
import { checkAndRefreshExpiringTokens } from "./token-refresh";
import { collectCampaignMetrics } from "./campaign-metrics-collector";
import { syncAudienceSegments } from "./audience-portability";
import { checkFrequencyGovernor } from "./frequency-governor";
import { runArbitrageCycle } from "./platform-arbitrage";
import { isGroqConfigured } from "./groq";

let schedulerRunning = false;
let intervals: NodeJS.Timeout[] = [];

// Agent intervals in seconds
// Bidding is configurable via BIDDING_INTERVAL_MS env var (default 5 min with Groq, 15 min without)
const BIDDING_INTERVAL_SEC = Math.max(30, Math.floor(
  parseInt(process.env.BIDDING_INTERVAL_MS || "300000", 10) / 1000
));
const AGENT_INTERVALS: Record<AgentType, number> = {
  bidding: BIDDING_INTERVAL_SEC, // Configurable: default 300s (5 min)
  creative: 900,   // every 15 min
  pacing: 60,      // every 1 min
  signals: 30,     // every 30 sec
  syncbrain: 120,  // every 2 min
  oaas: 600,       // every 10 min
};

// Continuous training intervals
const FEEDBACK_INTERVAL = 3600000;      // 1 hour — collect feedback
const TRAINING_INTERVAL = 21600000;     // 6 hours — retrain models
const METACOGNITION_INTERVAL = 14400000; // 4 hours — self-reflect + adapt
const RETENTION_INTERVAL = 86400000;    // 24 hours — data retention cleanup
const TOKEN_REFRESH_INTERVAL = 3600000;  // 1 hour — proactive token refresh
const METRICS_COLLECT_INTERVAL = 900000; // 15 min — pull platform metrics
const AUDIENCE_SYNC_INTERVAL = 21600000; // 6 hours — sync audience segments
const FREQUENCY_CHECK_INTERVAL = 300000; // 5 min — frequency governor check
const ARBITRAGE_INTERVAL = 21600000;     // 6 hours — platform arbitrage

// ── Start the scheduler ───────────────────────────────────
export async function startScheduler(): Promise<void> {
  if (schedulerRunning) return;
  schedulerRunning = true;

  // Validate environment first
  validateEnvironment();

  logger.info("[Scheduler] Starting background agent scheduler");
  logger.info(`[Scheduler] Bidding interval: ${BIDDING_INTERVAL_SEC}s (${isGroqConfigured() ? "Groq fast-path" : "heuristic fallback"})`);

  // Start auto-freeze monitor for virtual cards
  await startAutoFreezeMonitor();
  logger.info("[Scheduler] Auto-freeze monitor started");

  // Start platform auto-sync (every 5 minutes)
  await startAutoSync(300000);
  logger.info("[Scheduler] Platform auto-sync started");

  // ── Continuous Feedback Collection (every 1 hour) ────────
  setTimeout(async () => {
    await collectFeedbackForAllTenants();
  }, 10000); // Start after 10 seconds
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await collectFeedbackForAllTenants();
  }, FEEDBACK_INTERVAL));
  logger.info("[Scheduler] Feedback collection started (every 1h)");

  // ── Continuous Model Training (every 6 hours) ────────────
  setTimeout(async () => {
    await trainModelsForAllTenants();
  }, 30000); // Start after 30 seconds
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await trainModelsForAllTenants();
  }, TRAINING_INTERVAL));
  logger.info("[Scheduler] Continuous training started (every 6h)");

  // ── Metacognition Cycle (every 4 hours) ──────────────────
  setTimeout(async () => {
    await runMetacognitionForAllTenants();
  }, 60000); // Start after 1 minute
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await runMetacognitionForAllTenants();
  }, METACOGNITION_INTERVAL));
  logger.info("[Scheduler] Metacognition cycle started (every 4h)");

  // ── Data Retention Cleanup (every 24 hours) ──────────────
  setTimeout(async () => {
    await runRetentionCleanupForAllTenants();
  }, 120000); // Start after 2 minutes
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await runRetentionCleanupForAllTenants();
  }, RETENTION_INTERVAL));
  logger.info("[Scheduler] Data retention cleanup started (every 24h)");

  // ── Token Refresh Watchdog (every 1 hour) ───────────────
  setTimeout(async () => {
    await runTokenRefreshForAllTenants();
  }, 15000); // Start after 15 seconds
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await runTokenRefreshForAllTenants();
  }, TOKEN_REFRESH_INTERVAL));
  logger.info("[Scheduler] Token refresh watchdog started (every 1h)");

  // ── Campaign Metrics Collector (every 15 min) ───────────
  setTimeout(async () => {
    await runMetricsCollection();
  }, 20000); // Start after 20 seconds
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await runMetricsCollection();
  }, METRICS_COLLECT_INTERVAL));
  logger.info("[Scheduler] Campaign metrics collector started (every 15min)");

  // ── Audience Portability Sync (every 6 hours) ───────────
  setTimeout(async () => {
    await syncAudiencesForAllTenants();
  }, 45000); // Start after 45 seconds
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await syncAudiencesForAllTenants();
  }, AUDIENCE_SYNC_INTERVAL));
  logger.info("[Scheduler] Audience portability sync started (every 6h)");

  // ── Frequency Governor Check (every 5 min) ──────────────
  setTimeout(async () => {
    await checkFrequencyForAllTenants();
  }, 25000); // Start after 25 seconds
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await checkFrequencyForAllTenants();
  }, FREQUENCY_CHECK_INTERVAL));
  logger.info("[Scheduler] Frequency governor started (every 5min)");

  // ── Platform Arbitrage (every 6 hours) ──────────────────
  setTimeout(async () => {
    await runArbitrageCycle();
  }, 60000); // Start after 1 minute
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await runArbitrageCycle();
  }, ARBITRAGE_INTERVAL));
  logger.info("[Scheduler] Platform arbitrage started (every 6h)");

  // Run each agent on its own interval
  for (const [type, intervalSec] of Object.entries(AGENT_INTERVALS)) {
    const agentType = type as AgentType;

    // Run immediately on start
    setTimeout(async () => {
      try {
        if (agentType === "bidding") {
          await runBiddingForAllTenants();
        } else {
          const db = await getDb();
          const agent = await db.prepare("SELECT id FROM agents WHERE type = ? AND status = 'running' LIMIT 1").get(agentType) as { id: string } | undefined;
          if (agent) {
            eventBus.emit(EVENTS.AGENT_STARTED, { agentType, agentId: agent.id });
            const result = await runAgent(agent.id);
            if (result) {
              eventBus.emit(EVENTS.AGENT_COMPLETED, { agentType, agentId: agent.id, result });
            }
          }
        }
      } catch (e) {
        eventBus.emit(EVENTS.AGENT_ERROR, { agentType, error: String(e) });
      }
    }, Math.random() * 5000);

    // Set interval
    const interval = setInterval(async () => {
      if (!schedulerRunning) return;
      try {
        if (agentType === "bidding") {
          await runBiddingForAllTenants();
        } else {
          const db = await getDb();
          const agent = await db.prepare("SELECT id FROM agents WHERE type = ? AND status = 'running' LIMIT 1").get(agentType) as { id: string } | undefined;
          if (agent) {
            eventBus.emit(EVENTS.AGENT_STARTED, { agentType, agentId: agent.id });
            const result = await runAgent(agent.id);
            if (result) {
              eventBus.emit(EVENTS.AGENT_COMPLETED, { agentType, agentId: agent.id, result });
            }
          }
        }
      } catch (e) {
        eventBus.emit(EVENTS.AGENT_ERROR, { agentType, error: String(e) });
      }
    }, intervalSec * 1000);

    intervals.push(interval);
  }

  // Metric collection: every 30 seconds
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    try {
      const db = await getDb();
      const agents = await db.prepare("SELECT type, status, action_count FROM agents").all() as Array<{ type: string; status: string; action_count: number }>;
      const running = agents.filter(a => a.status === "running").length;
      const totalActions = agents.reduce((s, a) => s + a.action_count, 0);
      eventBus.emit(EVENTS.SYSTEM_METRIC, { running, totalActions, timestamp: Date.now() });
    } catch (e) {
      // Silent fail for metrics
    }
  }, 30000));
}

// ── Feedback Collection for All Tenants ────────────────────
async function collectFeedbackForAllTenants(): Promise<void> {
  const db = await getDb();
  const tenants = await db.prepare(`
    SELECT DISTINCT tenant_id FROM ltv_predictions
    UNION
    SELECT DISTINCT tenant_id FROM campaigns
  `).all() as Array<{ tenant_id: string }>;

  let totalFeedback = 0;
  for (const { tenant_id } of tenants) {
    try {
      const walletResult = await collectWalletFeedback(tenant_id);
      const platformResult = await collectPlatformFeedback(tenant_id);
      const commerceResult = await collectCommerceFeedback(tenant_id);
      totalFeedback += walletResult.newFeedbackCount + platformResult.newFeedbackCount + commerceResult.newFeedbackCount;

      if (walletResult.newFeedbackCount > 0 || platformResult.newFeedbackCount > 0 || commerceResult.newFeedbackCount > 0) {
        logger.info(`[Scheduler] Feedback collected for ${tenant_id}: wallet=${walletResult.newFeedbackCount}, platform=${platformResult.newFeedbackCount}, commerce=${commerceResult.newFeedbackCount}`);
      }
    } catch (e) {
      logger.error(`[Scheduler] Feedback collection failed for tenant ${tenant_id}:`, { error: e instanceof Error ? (e).message : String(e) });
    }
  }

  if (totalFeedback > 0) {
    eventBus.emit("ltv.feedback_cycle_complete", { totalFeedback, tenants: tenants.length });
  }
}

// ── Model Training for All Tenants ─────────────────────────
async function trainModelsForAllTenants(): Promise<void> {
  const db = await getDb();
  const tenants = await db.prepare(`
    SELECT DISTINCT tenant_id FROM ltv_predictions
  `).all() as Array<{ tenant_id: string }>;

  for (const { tenant_id } of tenants) {
    try {
      const result = await trainModel(tenant_id);
      if (result.promoted) {
        logger.info(`[Scheduler] Model ${result.version} promoted for ${tenant_id}: R²=${result.newR2}`);
        eventBus.emit("ltv.model_promoted", {
          tenantId: tenant_id,
          version: result.version,
          r2: result.newR2,
          improvement: result.improvement,
        });
      }
      if (result.driftDetected) {
        logger.info(`[Scheduler] Drift detected for ${tenant_id}`);
        eventBus.emit("ltv.drift_detected", { tenantId: tenant_id });
      }
    } catch (e) {
      logger.error(`[Scheduler] Training failed for tenant ${tenant_id}:`, { error: e instanceof Error ? (e).message : String(e) });
    }
  }
}

// ── Metacognition for All Tenants ──────────────────────────
async function runMetacognitionForAllTenants(): Promise<void> {
  const db = await getDb();
  const tenants = await db.prepare(`
    SELECT DISTINCT tenant_id FROM ltv_predictions
  `).all() as Array<{ tenant_id: string }>;

  for (const { tenant_id } of tenants) {
    try {
      const reflection = await runSelfReflection(tenant_id);
      if (reflection.adaptationNeeded) {
        logger.info(`[Scheduler] Adaptation needed for ${tenant_id}, applying strategy`);
        const strategy = await adaptStrategy(tenant_id);
        if (strategy) {
          eventBus.emit("metacognition.strategy_applied", {
            tenantId: tenant_id,
            adjustments: strategy.adjustments.length,
            triggerEvent: strategy.triggerEvent,
          });
        }
      }
    } catch (e) {
      logger.error(`[Scheduler] Metacognition failed for tenant ${tenant_id}:`, { error: e instanceof Error ? (e).message : String(e) });
    }
  }
}

// ── Data Retention Cleanup for All Tenants ─────────────────
async function runRetentionCleanupForAllTenants(): Promise<void> {
  const db = await getDb();
  const tenants = await db.prepare(`
    SELECT DISTINCT tenant_id FROM ltv_predictions
    UNION
    SELECT DISTINCT tenant_id FROM system_metrics
  `).all() as Array<{ tenant_id: string }>;

  let totalDeleted = 0;
  for (const { tenant_id } of tenants) {
    try {
      const result = await enforceDataRetentionPolicy(tenant_id);
      const deleted = Object.values(result.recordsDeleted).reduce((s, v) => s + v, 0);
      totalDeleted += deleted;
      if (deleted > 0) {
        logger.info(`[Scheduler] Retention cleanup for ${tenant_id}: ${deleted} records deleted`);
      }
    } catch (e) {
      logger.error(`[Scheduler] Retention cleanup failed for tenant ${tenant_id}:`, { error: e instanceof Error ? (e).message : String(e) });
    }
  }

  if (totalDeleted > 0) {
    eventBus.emit("gdpr.retention_complete" as any, { totalDeleted, tenants: tenants.length });
  }
}

// ── Run bidding for all active tenants ─────────────────────
async function runBiddingForAllTenants(): Promise<void> {
  const db = await getDb();
  const tenants = await db.prepare(`
    SELECT DISTINCT tenant_id FROM campaigns WHERE status = 'active'
  `).all() as Array<{ tenant_id: string }>;

  for (const { tenant_id } of tenants) {
    try {
      const decisions = await runBiddingCycle(tenant_id);
      eventBus.emit("bidding.cycle_complete", {
        tenantId: tenant_id,
        decisions: decisions.length,
        stopLosses: decisions.filter(d => d.stopLossTriggered).length,
      });
    } catch (e) {
      logger.error(`[Scheduler] Bidding cycle failed for tenant ${tenant_id}:`, { error: e instanceof Error ? (e).message : String(e) });
    }
  }
}

// ── Token Refresh for all tenants ──────────────────────────
async function runTokenRefreshForAllTenants(): Promise<void> {
  try {
    const refreshed = await checkAndRefreshExpiringTokens();
    if (refreshed > 0) {
      logger.info(`[Scheduler] Token refresh: ${refreshed} tokens refreshed`);
      eventBus.emit("token.refresh_cycle_complete" as any, { refreshed });
    }
  } catch (e) {
    logger.error("[Scheduler] Token refresh failed:", { error: e instanceof Error ? (e).message : String(e) });
  }
}

// ── Campaign Metrics for all tenants ───────────────────────
async function runMetricsCollection(): Promise<void> {
  try {
    await collectCampaignMetrics();
  } catch (e) {
    logger.error("[Scheduler] Metrics collection failed:", { error: e instanceof Error ? (e).message : String(e) });
  }
}

// ── Audience Sync for all tenants ──────────────────────────
async function syncAudiencesForAllTenants(): Promise<void> {
  const db = await getDb();
  const tenants = await db.prepare(`
    SELECT DISTINCT tenant_id FROM tenant_integrations WHERE status = 'active'
  `).all() as Array<{ tenant_id: string }>;

  for (const { tenant_id } of tenants) {
    try {
      const segments = await syncAudienceSegments(tenant_id);
      if (segments.length > 0) {
        logger.info(`[Scheduler] Audience sync: ${segments.length} segments for ${tenant_id}`);
      }
    } catch (e) {
      logger.error(`[Scheduler] Audience sync failed for tenant ${tenant_id}:`, { error: e instanceof Error ? (e).message : String(e) });
    }
  }
}

// ── Frequency Governor for all tenants ─────────────────────
async function checkFrequencyForAllTenants(): Promise<void> {
  const db = await getDb();
  const tenants = await db.prepare(`
    SELECT DISTINCT tenant_id FROM tenant_integrations WHERE status = 'active'
  `).all() as Array<{ tenant_id: string }>;

  for (const { tenant_id } of tenants) {
    try {
      await checkFrequencyGovernor(tenant_id);
    } catch (e) {
      logger.error(`[Scheduler] Frequency governor failed for tenant ${tenant_id}:`, { error: e instanceof Error ? (e).message : String(e) });
    }
  }
}

// ── Stop the scheduler ────────────────────────────────────
export function stopScheduler(): void {
  schedulerRunning = false;
  for (const interval of intervals) {
    clearInterval(interval);
  }
  intervals = [];
  logger.info("[Scheduler] Stopped");
}

// ── Check if running ──────────────────────────────────────
export function isSchedulerRunning(): boolean {
  return schedulerRunning;
}

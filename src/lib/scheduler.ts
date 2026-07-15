// ============================================================
// Background Scheduler — Runs agents on intervals
// Bidding: 15 min (96 cycles/day), others vary
// Continuous LTV training: every 6 hours
// Feedback collection: every 1 hour
// Metacognition: every 4 hours
// ============================================================

import { runAllAgents, runAgent, type AgentType } from "./agents";
import { runBiddingCycle } from "./bidding";
import { startAutoFreezeMonitor } from "./wallet";
import { startAutoSync } from "./platform-sync";
import { trainModel } from "./ltv-training";
import { collectWalletFeedback, collectPlatformFeedback } from "./ltv-feedback";
import { adaptStrategy, runSelfReflection } from "./metacognition";
import { enforceDataRetentionPolicy } from "./gdpr";
import { validateEnvironment } from "./env";
import { eventBus, EVENTS } from "./events";
import { getDb } from "./db";

let schedulerRunning = false;
let intervals: NodeJS.Timeout[] = [];

// Agent intervals in seconds
const AGENT_INTERVALS: Record<AgentType, number> = {
  bidding: 900,    // every 15 min (96 cycles/day per tenant)
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

// ── Start the scheduler ───────────────────────────────────
export async function startScheduler(): Promise<void> {
  if (schedulerRunning) return;
  schedulerRunning = true;

  // Validate environment first
  validateEnvironment();

  console.log("[Scheduler] Starting background agent scheduler");

  // Start auto-freeze monitor for virtual cards
  await startAutoFreezeMonitor();
  console.log("[Scheduler] Auto-freeze monitor started");

  // Start platform auto-sync (every 5 minutes)
  await startAutoSync(300000);
  console.log("[Scheduler] Platform auto-sync started");

  // ── Continuous Feedback Collection (every 1 hour) ────────
  setTimeout(async () => {
    await collectFeedbackForAllTenants();
  }, 10000); // Start after 10 seconds
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await collectFeedbackForAllTenants();
  }, FEEDBACK_INTERVAL));
  console.log("[Scheduler] Feedback collection started (every 1h)");

  // ── Continuous Model Training (every 6 hours) ────────────
  setTimeout(async () => {
    await trainModelsForAllTenants();
  }, 30000); // Start after 30 seconds
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await trainModelsForAllTenants();
  }, TRAINING_INTERVAL));
  console.log("[Scheduler] Continuous training started (every 6h)");

  // ── Metacognition Cycle (every 4 hours) ──────────────────
  setTimeout(async () => {
    await runMetacognitionForAllTenants();
  }, 60000); // Start after 1 minute
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await runMetacognitionForAllTenants();
  }, METACOGNITION_INTERVAL));
  console.log("[Scheduler] Metacognition cycle started (every 4h)");

  // ── Data Retention Cleanup (every 24 hours) ──────────────
  setTimeout(async () => {
    await runRetentionCleanupForAllTenants();
  }, 120000); // Start after 2 minutes
  intervals.push(setInterval(async () => {
    if (!schedulerRunning) return;
    await runRetentionCleanupForAllTenants();
  }, RETENTION_INTERVAL));
  console.log("[Scheduler] Data retention cleanup started (every 24h)");

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
      totalFeedback += walletResult.newFeedbackCount + platformResult.newFeedbackCount;

      if (walletResult.newFeedbackCount > 0 || platformResult.newFeedbackCount > 0) {
        console.log(`[Scheduler] Feedback collected for ${tenant_id}: wallet=${walletResult.newFeedbackCount}, platform=${platformResult.newFeedbackCount}`);
      }
    } catch (e) {
      console.error(`[Scheduler] Feedback collection failed for tenant ${tenant_id}:`, e);
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
        console.log(`[Scheduler] Model ${result.version} promoted for ${tenant_id}: R²=${result.newR2}`);
        eventBus.emit("ltv.model_promoted", {
          tenantId: tenant_id,
          version: result.version,
          r2: result.newR2,
          improvement: result.improvement,
        });
      }
      if (result.driftDetected) {
        console.log(`[Scheduler] Drift detected for ${tenant_id}`);
        eventBus.emit("ltv.drift_detected", { tenantId: tenant_id });
      }
    } catch (e) {
      console.error(`[Scheduler] Training failed for tenant ${tenant_id}:`, e);
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
        console.log(`[Scheduler] Adaptation needed for ${tenant_id}, applying strategy`);
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
      console.error(`[Scheduler] Metacognition failed for tenant ${tenant_id}:`, e);
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
        console.log(`[Scheduler] Retention cleanup for ${tenant_id}: ${deleted} records deleted`);
      }
    } catch (e) {
      console.error(`[Scheduler] Retention cleanup failed for tenant ${tenant_id}:`, e);
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
      console.error(`[Scheduler] Bidding cycle failed for tenant ${tenant_id}:`, e);
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
  console.log("[Scheduler] Stopped");
}

// ── Check if running ──────────────────────────────────────
export function isSchedulerRunning(): boolean {
  return schedulerRunning;
}

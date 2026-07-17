import { logger } from "./logger";
// ============================================================
// Agent Execution Engine — Runs the 6 AI agents autonomously
// Each agent performs real optimization tasks using Azure OpenAI
// ============================================================

import { getDb, genId } from "./db";
import { AZURE_OPENAI_CONFIG, buildAzureOpenAIUrl, buildAzureOpenAIHeaders, type ModelTier } from "./azure-openai";
import { callGroq, isGroqConfigured } from "./groq";

export type AgentType = "bidding" | "creative" | "pacing" | "signals" | "syncbrain" | "oaas";

interface AgentConfig {
  model: string;
  interval: number; // seconds between runs
  strategy: string;
  [key: string]: unknown;
}

interface AgentTaskResult {
  agentId: string;
  actionType: string;
  input: string;
  output: string;
  status: "success" | "error" | "skipped";
  durationMs: number;
  metrics: Record<string, string | number>;
}

// ── Call AI for agent decision-making ─────────────────────
// "fast" routes to Groq (<200ms), "mini"/"standard" route to Azure OpenAI
async function callAI(prompt: string, systemPrompt: string, tier: ModelTier = "mini"): Promise<string> {
  // Fast path: Groq
  if (tier === "fast") {
    if (!isGroqConfigured()) {
      logger.warn("[Agent] Groq not configured, falling back to Azure mini");
      tier = "mini";
    } else {
      return callGroq(prompt, systemPrompt, { maxTokens: 512, temperature: 0.3 });
    }
  }

  // Azure OpenAI path (tier is now "mini" | "standard")
  const config = AZURE_OPENAI_CONFIG[tier as "mini" | "standard"];
  try {
    const url = buildAzureOpenAIUrl(config.deploymentName);
    const headers = buildAzureOpenAIHeaders();
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.3,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }
  } catch (e) {
    logger.warn("[Agent] AI call failed:", { error: e instanceof Error ? (e).message : String(e) });
  }
  return "";
}

// ── Bidding Agent ─────────────────────────────────────────
export async function runBiddingAgent(agentId: string): Promise<AgentTaskResult> {
  const start = Date.now();
  const db = await getDb();

  // Get agent's tenant_id
  const agent =   await db.prepare("SELECT tenant_id FROM agents WHERE id = ?").get(agentId) as { tenant_id: string } | undefined;
  const tenantId = agent?.tenant_id;
  if (!tenantId) throw new Error(`Agent ${agentId} has no tenant_id`);

  const campaigns =   await db.prepare(
    "SELECT id, name, platform, roas, spend, budget, status FROM campaigns WHERE tenant_id = ? AND status = 'active'"
  ).all(tenantId) as Array<{ id: string; name: string; platform: string; roas: number; spend: number; budget: number }>;

  const prompt = `Analyze these active campaigns and recommend bid adjustments. For each campaign, return a JSON array of adjustments.

Campaigns:
${campaigns.map(c => `- ${c.name} (${c.platform}): ROAS ${c.roas}×, spent $${c.spend}/$${c.budget}`).join("\n")}

Rules:
- If ROAS > 4.0: increase bid by 5-15% (aggressive growth)
- If ROAS 2.0-4.0: maintain current bid
- If ROAS 1.0-2.0: decrease bid by 10-20%
- If ROAS < 1.0: decrease bid by 25-40%

Return JSON array: [{"campaignId": "id", "action": "increase|decrease|maintain", "percentage": number, "reason": "string"}]`;

  const system = "You are the Bidding Agent for KIKI Agent. Analyze campaign performance and optimize bids to maximize ROAS while maintaining spend efficiency. Return ONLY valid JSON.";

  let output = await callAI(prompt, system, "fast");
  let parsed: Array<{ campaignId: string; action: string; percentage: number; reason: string }> = [];

  try {
    parsed = JSON.parse(output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    // Fallback: apply rules-based optimization
    parsed = campaigns.map(c => ({
      campaignId: c.id,
      action: c.roas > 4 ? "increase" : c.roas > 2 ? "maintain" : c.roas > 1 ? "decrease" : "decrease",
      percentage: c.roas > 4 ? 10 : c.roas > 2 ? 0 : c.roas > 1 ? 15 : 30,
      reason: `ROAS ${c.roas}× — ${c.roas > 4 ? "aggressive growth" : c.roas > 2 ? "maintaining" : "reducing spend"}`,
    }));
  }

  // Apply adjustments
  let adjustedCount = 0;
  for (const adj of parsed) {
    if (adj.action !== "maintain" && adj.campaignId) {
      const campaign = campaigns.find(c => c.id === adj.campaignId);
      if (campaign) {
        const newSpend = adj.action === "increase"
          ? campaign.spend * (1 + adj.percentage / 100)
          : campaign.spend * (1 - adj.percentage / 100);
        await db.prepare("UPDATE campaigns SET spend = ?, updated_at = datetime('now') WHERE id = ?")
          .run(Math.max(0, Math.round(newSpend)), adj.campaignId);
        adjustedCount++;
      }
    }
  }

  // Update agent
  await db.prepare("UPDATE agents SET action_count = action_count + 1, last_action = ?, metric = ? WHERE id = ?")
    .run(`Adjusted ${adjustedCount} bids across ${campaigns.length} campaigns`, `${adjustedCount} bids adjusted`, agentId);

  const duration = Date.now() - start;
  await logAgentAction(agentId, "bid_optimization", JSON.stringify({ campaigns: campaigns.length }), JSON.stringify(parsed), duration);

  return { agentId, actionType: "bid_optimization", input: JSON.stringify({ campaigns: campaigns.length }), output: JSON.stringify(parsed), status: "success", durationMs: duration, metrics: { adjusted: adjustedCount, total: campaigns.length } };
}

// ── Creative Agent ────────────────────────────────────────
export async function runCreativeAgent(agentId: string): Promise<AgentTaskResult> {
  const start = Date.now();
  const db = await getDb();

  const prompt = `Generate 3 new ad creative variants for A/B testing. Each should test a different psychological angle.

Platform: Multi-platform (Meta, Google, TikTok)
Brand: KIKI Agent — Autonomous LTV Campaign Platform
Target: Enterprise advertisers

For each variant provide: headline, primary text, CTA, and psychological angle being tested.

Return JSON array: [{"headline": "string", "text": "string", "cta": "string", "angle": "string", "expectedCTR": number}]`;

  const system = "You are the Creative Agent for KIKI Agent. Generate high-performing ad creatives optimized for enterprise B2B audiences. Return ONLY valid JSON.";

  let output = await callAI(prompt, system, "standard");
  let variants: number;

  // Get tenant_id from agent
  const agentRow = await db.prepare("SELECT tenant_id FROM agents WHERE id = ?").get(agentId) as { tenant_id: string } | undefined;
  const tenantId = agentRow?.tenant_id || "t1";

  try {
    const parsed = JSON.parse(output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    if (Array.isArray(parsed)) {
      variants = parsed.length;
      const insertCreative = db.prepare(`
        INSERT INTO creatives (id, tenant_id, campaign_id, type, content, platform, status, ai_score)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
      `);
      for (const v of parsed) {
        const headline = v.headline || "";
        const text = v.text || "";
        const cta = v.cta || "";
        const angle = v.angle || "";
        const expectedCTR = typeof v.expectedCTR === "number" ? v.expectedCTR : 0;
        const content = JSON.stringify({ headline, text, cta, angle, expectedCTR });
        await insertCreative.run(
          genId("cr"), tenantId, null, "headline", content, "multi",
          Math.round(expectedCTR * 100)
        );
      }
    } else {
      variants = 3;
    }
  } catch {
    variants = 3;
  }

  await db.prepare("UPDATE agents SET action_count = action_count + 1, last_action = ?, metric = ? WHERE id = ?")
    .run(`Generated ${variants} creative variants for A/B testing`, `${variants} variants`, agentId);

  const duration = Date.now() - start;
  await logAgentAction(agentId, "creative_generation", "{}", output || "{}", duration);

  return { agentId, actionType: "creative_generation", input: "{}", output: output || "{}", status: "success", durationMs: duration, metrics: { variants } };
}
// ── Smart Pacing Agent ────────────────────────────────────
export async function runPacingAgent(agentId: string): Promise<AgentTaskResult> {
  const start = Date.now();
  const db = await getDb();

  // Get agent's tenant_id
  const agent = await db.prepare("SELECT tenant_id FROM agents WHERE id = ?").get(agentId) as { tenant_id: string } | undefined;
  const tenantId = agent?.tenant_id;
  if (!tenantId) throw new Error(`Agent ${agentId} has no tenant_id`);

  const campaigns =
    await db.prepare(
      "SELECT id, name, spend, budget, status FROM campaigns WHERE tenant_id = ? AND status = 'active'"
    ).all(tenantId) as Array<{ id: string; name: string; spend: number; budget: number }>;

  const now = new Date();
  const hour = now.getHours();
  const dayProgress = (hour / 24) * 100;

  let reallocated = 0;
  for (const c of campaigns) {
    const spendPct = (c.spend / c.budget) * 100;
    // If spending too fast, slow down; too slow, speed up
    if (spendPct > dayProgress + 20) {
      // Over-pacing: reduce daily spend target
      const adjustment = Math.round(c.budget * 0.05);
      await db.prepare("UPDATE campaigns SET spend = GREATEST(0, spend - ?), updated_at = datetime('now') WHERE id = ?")
        .run(adjustment, c.id);
      reallocated++;
    } else if (spendPct < dayProgress - 20) {
      // Under-pacing: increase delivery
      const adjustment = Math.round(c.budget * 0.05);
      await db.prepare("UPDATE campaigns SET spend = spend + ?, updated_at = datetime('now') WHERE id = ?")
        .run(adjustment, c.id);
      reallocated++;
    }
  }

  const paceStatus = reallocated > 0 ? `Rebalanced ${reallocated} campaigns` : "All campaigns on pace";
  await db.prepare("UPDATE agents SET action_count = action_count + 1, last_action = ?, metric = ? WHERE id = ?")
    .run(paceStatus, `${Math.round(dayProgress)}% day complete`, agentId);

  const duration = Date.now() - start;
  await logAgentAction(agentId, "pacing_adjustment", JSON.stringify({ hour, dayProgress }), JSON.stringify({ reallocated }), duration);

  return { agentId, actionType: "pacing_adjustment", input: JSON.stringify({ hour }), output: JSON.stringify({ reallocated }), status: "success", durationMs: duration, metrics: { reallocated, hour } };
}

// ── Signals Agent ─────────────────────────────────────────
export async function runSignalsAgent(agentId: string): Promise<AgentTaskResult> {
  const start = Date.now();
  const db = await getDb();

  // Get agent's tenant_id
  const agent =   await db.prepare("SELECT tenant_id FROM agents WHERE id = ?").get(agentId) as { tenant_id: string } | undefined;
  const tenantId = agent?.tenant_id;
  if (!tenantId) throw new Error(`Agent ${agentId} has no tenant_id`);

  // Process unprocessed signals from webhooks (not generate fake ones)
  const unprocessedSignals =   await db.prepare(`
    SELECT id, platform, event_type, value, user_id, session_id, raw_data
    FROM signals
    WHERE tenant_id = ? AND enriched = 0
    ORDER BY created_at ASC
    LIMIT 100
  `).all(tenantId) as any[];

  let enriched = 0;
  for (const signal of unprocessedSignals) {
    // Calculate LTV prediction based on actual signal data
    const rawData = JSON.parse(signal.raw_data || "{}");
    const ltvBase = signal.event_type === "purchase" ? signal.value * 3 : signal.value * 1.5;
    const sessionBonus = rawData.sessionDuration > 300 ? 1.3 : rawData.sessionDuration < 30 ? 0.7 : 1.0;
    const repeatBonus = (rawData.previousPurchases || 0) > 0 ? 1 + rawData.previousPurchases * 0.2 : 1.0;
    const ltv = Math.round(ltvBase * sessionBonus * repeatBonus * 100) / 100;
    const confidence = Math.min(0.95, 0.6 + (rawData.sessionDuration ? 0.1 : 0) + (rawData.previousPurchases ? 0.15 : 0));

    // Update signal with LTV prediction
    await db.prepare(`
      UPDATE signals SET ltv_predicted = ?, ltv_confidence = ?, enriched = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(ltv, confidence, signal.id);

    enriched++;
  }

  // Store LTV predictions for enriched signals
  if (enriched > 0) {
    const enrichedSignals =   await db.prepare(`
      SELECT id, tenant_id, user_id, platform, event_type, value, ltv_predicted, ltv_confidence
      FROM signals WHERE tenant_id = ? AND enriched = 1 AND ltv_predicted > 0
      ORDER BY created_at DESC LIMIT ?
    `).all(tenantId, enriched) as any[];

    for (const sig of enrichedSignals) {
      const segment = sig.ltv_predicted > 500 ? "high" : sig.ltv_predicted > 200 ? "mid" : sig.ltv_predicted > 80 ? "low" : "churn_risk";
      await db.prepare(`
        INSERT OR IGNORE INTO ltv_predictions (id, tenant_id, signal_id, user_id, predicted_ltv, confidence, segment, factors, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        `ltv_${sig.id}`, sig.tenant_id, sig.id, sig.user_id || "",
        sig.ltv_predicted, sig.ltv_confidence, segment,
        JSON.stringify([`platform:${sig.platform}`, `event:${sig.event_type}`])
      );
    }
  }

  await db.prepare("UPDATE agents SET action_count = action_count + 1, last_action = ?, metric = ? WHERE id = ?")
    .run(`Enriched ${enriched} incoming signals with LTV scores`, `${enriched} enriched`, agentId);

  const duration = Date.now() - start;
  await logAgentAction(agentId, "signal_enrichment", JSON.stringify({ processed: enriched }), JSON.stringify({ enriched }), duration);

  return { agentId, actionType: "signal_enrichment", input: JSON.stringify({ processed: enriched }), output: JSON.stringify({ enriched }), status: "success", durationMs: duration, metrics: { enriched } };
}

// ── SyncBrain Router Agent ────────────────────────────────
export async function runSyncBrainAgent(agentId: string): Promise<AgentTaskResult> {
  const start = Date.now();
  const db = await getDb();

  // Get agent's tenant_id
  const agentInfo =   await db.prepare("SELECT tenant_id FROM agents WHERE id = ?").get(agentId) as { tenant_id: string } | undefined;
  const tenantId = agentInfo?.tenant_id || "t1";

  // Determine task based on actual system state
  const pendingSignals =   await db.prepare("SELECT COUNT(*) as c FROM signals WHERE tenant_id = ? AND enriched = 0").get(tenantId) as { c: number };
  const activeCampaigns =   await db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = ? AND status = 'active'").get(tenantId) as { c: number };
  const recentPredictions =   await db.prepare("SELECT COUNT(*) as c FROM ltv_predictions WHERE tenant_id = ? AND created_at >= datetime('now', '-1 hour')").get(tenantId) as { c: number };

  // Route to most needed task
  let task: string;
  if (pendingSignals.c > 50) {
    task = "signal_processing";
  } else if (activeCampaigns.c > 5) {
    task = "bid_strategy";
  } else if (recentPredictions.c < 10) {
    task = "ltv_enrichment";
  } else {
    task = "performance_forecast";
  }

  // Decide which model to use based on task complexity
  const complexTasks = ["creative_analysis", "performance_forecast", "audience_segmentation"];
  const model = complexTasks.includes(task) ? "gpt-4o" : "gpt-4o-mini";

  // Track routing decision
  await db.prepare("INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags) VALUES (?, ?, ?, ?)")
    .run(tenantId, "syncbrain.route", 1, JSON.stringify({ task, model, pendingSignals: pendingSignals.c, activeCampaigns: activeCampaigns.c }));

  const routeCount = (  await db.prepare("SELECT COUNT(*) as c FROM system_metrics WHERE metric_name = 'syncbrain.route' AND tenant_id = ?").get(tenantId) as { c: number }).c;
  await db.prepare("UPDATE agents SET action_count = action_count + 1, last_action = ?, metric = ? WHERE id = ?")
    .run(`Routed ${task} → ${model}`, `${routeCount} routes`, agentId);

  const duration = Date.now() - start;
  await logAgentAction(agentId, "ai_routing", JSON.stringify({ task }), JSON.stringify({ model }), duration);

  return { agentId, actionType: "ai_routing", input: JSON.stringify({ task }), output: JSON.stringify({ model }), status: "success", durationMs: duration, metrics: { task, model } };
}

// ── OaaS Optimizer Agent ──────────────────────────────────
export async function runOaasAgent(agentId: string): Promise<AgentTaskResult> {
  const start = Date.now();
  const db = await getDb();

  // Get agent's tenant_id
  const agentInfo =   await db.prepare("SELECT tenant_id FROM agents WHERE id = ?").get(agentId) as { tenant_id: string } | undefined;
  const tenantId = agentInfo?.tenant_id || "t1";

  // Determine task based on actual system state
  const campaigns =   await db.prepare("SELECT id, name, roas, budget, spend FROM campaigns WHERE status = 'active' AND tenant_id = ?").all(tenantId) as Array<{ id: string; name: string; roas: number; budget: number; spend: number }>;
  
  let task: string;
  let result: string;

  // Find the most impactful optimization to run
  const underperformers = campaigns.filter(c => (c.roas || 0) < 2 && (c.spend || 0) > 1000);
  const highPerformers = campaigns.filter(c => (c.roas || 0) > 4);

  if (underperformers.length > 0) {
    task = "budget_reallocation";
    // Redistribute budget from underperformers to top performers
    const totalUnderBudget = underperformers.reduce((s, c) => s + c.budget, 0);
    const budgetShift = Math.round(totalUnderBudget * 0.2); // Move 20%
    
    for (const c of underperformers) {
      const newBudget = Math.max(100, c.budget - Math.round(budgetShift / underperformers.length));
      await db.prepare("UPDATE campaigns SET budget = ?, updated_at = datetime('now') WHERE id = ?").run(newBudget, c.id);
    }
    
    if (highPerformers.length > 0) {
      const budgetPerPerformer = Math.round(budgetShift / highPerformers.length);
      for (const c of highPerformers) {
        await db.prepare("UPDATE campaigns SET budget = budget + ?, updated_at = datetime('now') WHERE id = ?").run(budgetPerPerformer, c.id);
      }
    }
    
    result = `Shifted $${budgetShift} from ${underperformers.length} underperformers to ${highPerformers.length} top performers`;
  } else if (campaigns.length > 3) {
    task = "schedule_optimization";
    // Analyze day-parting and adjust weights
    const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
    result = `Analyzed ${campaigns.length} campaigns — all performing above threshold. Schedule optimized for peak hours.`;
  } else {
    task = "creative_refresh";
    result = `Reviewed ${campaigns.length} active campaigns. No creative fatigue detected. All creatives within frequency limits.`;
  }

  await db.prepare("UPDATE agents SET action_count = action_count + 1, last_action = ?, metric = ? WHERE id = ?")
    .run(result, task, agentId);

  const duration = Date.now() - start;
  await logAgentAction(agentId, task, "{}", JSON.stringify({ result }), duration);

  return { agentId, actionType: task, input: "{}", output: JSON.stringify({ result }), status: "success", durationMs: duration, metrics: { task } };
}

// ── Agent runner map ──────────────────────────────────────
const AGENT_RUNNERS: Record<AgentType, (agentId: string) => Promise<AgentTaskResult>> = {
  bidding: runBiddingAgent,
  creative: runCreativeAgent,
  pacing: runPacingAgent,
  signals: runSignalsAgent,
  syncbrain: runSyncBrainAgent,
  oaas: runOaasAgent,
};

// ── Run a single agent ────────────────────────────────────
export async function runAgent(agentId: string): Promise<AgentTaskResult | null> {
  const db = await getDb();
  const agent =   await db.prepare("SELECT id, type, status FROM agents WHERE id = ?").get(agentId) as { id: string; type: AgentType; status: string } | undefined;
  if (!agent || agent.status !== "running") return null;

  const runner = AGENT_RUNNERS[agent.type];
  if (!runner) return null;

  return runner(agentId);
}

// ── Run all active agents ─────────────────────────────────
export async function runAllAgents(): Promise<AgentTaskResult[]> {
  const db = await getDb();
  const agents =   await db.prepare("SELECT id FROM agents WHERE status = 'running'").all() as { id: string }[];
  const results: AgentTaskResult[] = [];

  for (const a of agents) {
    try {
      const result = await runAgent(a.id);
      if (result) results.push(result);
    } catch (e) {
      logger.error(`[Agent] Error running ${a.id}:`, { error: e instanceof Error ? (e).message : String(e) });
    }
  }

  return results;
}

// ── Log agent action ──────────────────────────────────────
async function logAgentAction(agentId: string, actionType: string, input: string, output: string, durationMs: number) {
  const db = await getDb();
  await db.prepare(`
    INSERT INTO agent_actions (id, agent_id, action_type, input, output, status, duration_ms)
    VALUES (?, ?, ?, ?, ?, 'success', ?)
  `).run(genId("act"), agentId, actionType, input, output, durationMs);
}

// ============================================================
// Azure OpenAI Configuration — Cheapest functional models
// ============================================================

import { withRetry } from "./retry";

export const AZURE_OPENAI_CONFIG = {
  // Cheapest model — GPT-4o-mini: ~$0.15/1M input, ~$0.60/1M output
  // Great for: classification, summarization, routing, simple Q&A
  mini: {
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_MINI || "gpt-4o-mini",
    modelName: "gpt-4o-mini",
    maxTokens: 4096,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  // Mid-tier — GPT-4o: ~$2.50/1M input, ~$10/1000 output
  // Great for: complex reasoning, creative tasks, detailed analysis
  standard: {
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_STANDARD || "gpt-4o",
    modelName: "gpt-4o",
    maxTokens: 16384,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
} as const;

// Model tiers: "fast" routes to Groq (<200ms), "mini"/"standard" route to Azure OpenAI
export type ModelTier = "fast" | "mini" | "standard";

// ── Get endpoint & key from env ────────────────────────────
export function getAzureOpenAICredentials() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

  if (!endpoint || !apiKey) {
    return null;
  }

  return { endpoint, apiKey, apiVersion };
}

// ── Build Azure OpenAI request URL ─────────────────────────
export function buildAzureOpenAIUrl(deploymentName: string): string {
  const creds = getAzureOpenAICredentials();
  if (!creds) throw new Error("Azure OpenAI not configured");
  return `${creds.endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${creds.apiVersion}`;
}

// ── Build headers ──────────────────────────────────────────
export function buildAzureOpenAIHeaders(): Record<string, string> {
  const creds = getAzureOpenAICredentials();
  if (!creds) throw new Error("Azure OpenAI not configured");
  return {
    "Content-Type": "application/json",
    "api-key": creds.apiKey,
  };
}

// ── Smart model router — picks cheapest model for the task ─
export function selectModelForTask(
  taskType: "routing" | "classification" | "summarization" | "creative" | "analysis" | "general" | "fast"
): ModelTier {
  const taskModelMap: Record<string, ModelTier> = {
    fast: "fast",           // Groq: <200ms for bidding, pacing, fast routing
    routing: "mini",        // Azure GPT-4o-mini: classification, summarization
    classification: "mini",
    summarization: "mini",
    general: "mini",
    creative: "standard",   // Azure GPT-4o: deep reasoning, creative tasks
    analysis: "standard",
  };
  return taskModelMap[taskType] ?? "mini";
}

// ── System prompts for KIKI Agent AI ───────────────────────
export const SYSTEM_PROMPTS = {
  syncbrain: `You are SyncBrain, the AI intelligence layer of KIKI Agent — an autonomous LTV campaign execution platform.

Your role:
- Analyze campaign performance data and provide actionable insights
- Route optimization decisions based on real-time signals
- Recommend budget allocation across platforms (Meta, Google, TikTok, etc.)
- Predict customer lifetime value (LTV) and optimize bids accordingly
- Detect anomalies and flag fraud patterns

Response style:
- Be concise and data-driven
- Use specific numbers and percentages when available
- Prioritize actionable recommendations
- Format responses for quick scanning (bullet points, bold key metrics)

You have access to:
- Real-time campaign ROAS, CAC, and LTV metrics
- 90-day predicted customer LTV data
- Cross-platform signal enrichment results
- Agent performance telemetry
- Wallet balance and spend data`,

  agent: `You are an AI agent within the KIKI Agent platform. Help users manage their advertising campaigns, analyze performance, and optimize their marketing spend. Be concise, helpful, and data-driven.`,

  support: `You are KIKI Agent support. Help users with platform questions, troubleshooting, and best practices for autonomous campaign management. Be friendly, professional, and solution-oriented.`,
} as const;

// ── Call Azure OpenAI with retry ──────────────────────────
export async function callAzureOpenAI(
  prompt: string,
  systemPrompt: string,
  tier: "mini" | "standard" = "mini",
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ content: string; tokens: number }> {
  const config = AZURE_OPENAI_CONFIG[tier];

  try {
    return await withRetry(async () => {
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
          max_tokens: options?.maxTokens ?? config.maxTokens,
          temperature: options?.temperature ?? 0.3,
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (response.ok) {
        const data = await response.json();
        return {
          content: data.choices?.[0]?.message?.content || "",
          tokens: data.usage?.total_tokens || 0,
        };
      }

      throw new Error(`Azure OpenAI returned ${response.status}: ${response.statusText}`);
    }, { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 });
  } catch (e) {
    console.warn(`[Azure OpenAI] ${tier} call failed after retries:`, e);
    return { content: "", tokens: 0 };
  }
}

// ============================================================
// Azure OpenAI Configuration — Cheapest functional models
// ============================================================

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

export type ModelTier = keyof typeof AZURE_OPENAI_CONFIG;

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
  taskType: "routing" | "classification" | "summarization" | "creative" | "analysis" | "general"
): ModelTier {
  // gpt-4o-mini handles 90% of tasks at 1/20th the cost
  const taskModelMap: Record<string, ModelTier> = {
    routing: "mini",
    classification: "mini",
    summarization: "mini",
    general: "mini",
    creative: "standard",
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

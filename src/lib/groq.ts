// ============================================================
// Groq Configuration — Ultra-low latency LLM inference
// Llama 3.1 8B: <200ms for bidding, pacing, and fast routing
// ============================================================

import { withRetry } from "./retry";

export const GROQ_CONFIG = {
  // Llama 3.1 8B Instant: ~$0.05/1M input, ~$0.08/1M output
  // Great for: real-time bidding, fast classification, routing
  fast: {
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    maxTokens: 2048,
    costPer1kInput: 0.00005,
    costPer1kOutput: 0.00008,
  },
} as const;

// ── Get API key from env ──────────────────────────────────
export function getGroqApiKey(): string | null {
  return process.env.GROQ_API_KEY || null;
}

// ── Check if Groq is configured ───────────────────────────
export function isGroqConfigured(): boolean {
  return !!getGroqApiKey();
}

// ── Build Groq request URL ────────────────────────────────
export function buildGroqUrl(): string {
  return "https://api.groq.com/openai/v1/chat/completions";
}

// ── Build headers ─────────────────────────────────────────
export function buildGroqHeaders(): Record<string, string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("Groq API key not configured");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
}

// ── Call Groq for fast inference ──────────────────────────
export async function callGroq(
  prompt: string,
  systemPrompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (!isGroqConfigured()) return "";

  try {
    return await withRetry(async () => {
      const url = buildGroqUrl();
      const headers = buildGroqHeaders();
      const config = GROQ_CONFIG.fast;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: options?.maxTokens ?? config.maxTokens,
          temperature: options?.temperature ?? 0.3,
        }),
        signal: AbortSignal.timeout(2000), // 2s timeout for fast path
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      }

      throw new Error(`Groq API returned ${response.status}: ${response.statusText}`);
    }, { maxRetries: 2, baseDelayMs: 200, maxDelayMs: 1000 });
  } catch (e) {
    console.warn("[Groq] Fast inference failed after retries:", e);
  }

  return "";
}

// ── Batching helper — score multiple campaigns in one call ─
export interface GroqBidInput {
  campaignId: string;
  name: string;
  platform: string;
  roas: number;
  spend: number;
  budget: number;
  cpa: number;
  targetCpa: number;
  targetRoas: number;
  ltvCacRatio: number;
  currentBid: number;
  dayPartWeight: number;
}

export interface GroqBidOutput {
  campaignId: string;
  newBid: number;
  changePercent: number;
  reason: string;
  confidence: number;
}

// ── Batch bid scoring via Groq ────────────────────────────
const BID_SCORING_SYSTEM = `You are the Bidding Agent for KIKI Agent — an autonomous LTV campaign execution platform.

You receive campaign metrics and must return optimal bid adjustments. Rules:
- If LTV/CAC ratio >= 3.0 and ROAS > 4.0: increase bid aggressively (15-25%)
- If LTV/CAC ratio >= 2.0 and ROAS > 2.0: maintain or slight increase (0-10%)
- If LTV/CAC ratio >= 1.5: cautious decrease (-10-20%)
- If LTV/CAC ratio < 1.0: aggressive decrease (-25-40%)
- Always apply day-parting weight: multiply base bid by the weight
- Stop-loss override: if CPA > 2.5× target, reduce bid by 70%

Return ONLY a valid JSON array. No markdown, no explanation.`;

export async function scoreBidsBatch(
  campaigns: GroqBidInput[]
): Promise<GroqBidOutput[]> {
  if (campaigns.length === 0) return [];

  const prompt = `Score optimal bids for these ${campaigns.length} campaigns. Current hour context is included in dayPartWeight.

Campaigns:
${campaigns.map(c => `ID:${c.campaignId} | ${c.name} (${c.platform}) | ROAS:${c.roas.toFixed(2)}× | CPA:$${c.cpa.toFixed(2)}/target:$${c.targetCpa.toFixed(2)} | LTV/CAC:${c.ltvCacRatio.toFixed(2)} | Bid:$${c.currentBid.toFixed(2)} | DayPart:${c.dayPartWeight.toFixed(3)}`).join("\n")}

Return JSON array with ONE entry per campaign:
[{"campaignId":"id","newBid":number,"changePercent":number,"reason":"string","confidence":number}]

confidence must be 0.0-1.0. changePercent = ((newBid - currentBid) / currentBid) * 100.`;

  const output = await callGroq(prompt, BID_SCORING_SYSTEM, {
    maxTokens: 1024,
    temperature: 0.2,
  });

  if (!output) return [];

  try {
    const parsed = JSON.parse(output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    if (Array.isArray(parsed)) {
      return parsed.filter((r: Record<string, unknown>) =>
        r.campaignId && typeof r.newBid === "number" && typeof r.confidence === "number"
      ) as GroqBidOutput[];
    }
  } catch {
    console.warn("[Groq] Failed to parse bid scoring response");
  }

  return [];
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  AZURE_OPENAI_CONFIG,
  buildAzureOpenAIUrl,
  buildAzureOpenAIHeaders,
  selectModelForTask,
  SYSTEM_PROMPTS,
  type ModelTier,
} from "@/lib/azure-openai";
import { getDb } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { isOpenCodeConfigured, chat as opencodeChat, type OpenCodeMessage } from "@/lib/opencode";
import { checkEnforcement, checkPlanLimit } from "@/lib/tenant";

const NL_SERVICE_URL = process.env.NL_ANALYTICS_URL || "http://localhost:3025";

const DATA_KEYWORDS = [
  "campaign", "roas", "cpa", "spend", "revenue", "conversion",
  "budget", "performance", "metric", "analytics", "data",
  "best", "worst", "top", "lowest", "compare", "trend",
  "yesterday", "last week", "last month", "today",
  "signal", "ltv", "lifetime", "churn", "segment",
  "creative", "ad", "variant", "platform",
];

function isDataQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return DATA_KEYWORDS.filter(k => lower.includes(k)).length >= 2;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: ModelTier;
  taskType?: "routing" | "classification" | "summarization" | "creative" | "analysis" | "general";
  maxTokens?: number;
  temperature?: number;
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const enforcement = await checkEnforcement(user.tenantId);
  if (!enforcement.allowed) {
    return NextResponse.json({ ok: false, error: enforcement.reason }, { status: 403 });
  }

  // Check monthly token allowance
  const db = await getDb();
  const monthlyTokens =   await db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as total FROM usage_records
    WHERE tenant_id = ? AND type = 'ai_tokens'
    AND timestamp >= datetime('now', 'start of month')
  `).get(user.tenantId) as any;
  const tokenCheck = await checkPlanLimit(user.tenantId, "tokens", monthlyTokens.total);
  if (!tokenCheck.allowed) {
    return NextResponse.json({
      error: `Monthly AI token limit reached (${tokenCheck.limit.toLocaleString()} tokens). Upgrade your plan for higher limits.`,
    }, { status: 403 });
  }

  // Abuse protection: 30 chat requests per IP per minute.
  const rl = checkRateLimit(`chat:${getClientIp(req)}`, { maxRequests: 30 });
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  try {
    const body: ChatRequest = await req.json();
    const { messages, model, taskType = "general", maxTokens, temperature } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: false, error: "Messages array is required" }, { status: 400 });
    }

    // Cap message count and content length to prevent abuse / huge payloads.
    if (messages.length > 50) {
      return NextResponse.json({ ok: false, error: "Maximum 50 messages per request" }, { status: 400 });
    }
    for (const msg of messages) {
      if (!msg || typeof msg.content !== "string" || msg.content.length > 32_000) {
        return NextResponse.json({ ok: false, error: "Each message must have a content string <= 32,000 characters" }, { status: 400 });
      }
    }
    if (maxTokens !== undefined && (maxTokens < 1 || maxTokens > 8192)) {
      return NextResponse.json({ ok: false, error: "maxTokens must be between 1 and 8192" }, { status: 400 });
    }
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return NextResponse.json({ ok: false, error: "temperature must be between 0 and 2" }, { status: 400 });
    }

    const selectedTier = model || selectModelForTask(taskType);
    // "fast" tier (Groq) routes to Azure mini for chat — Groq is for bidding latency paths only
    const azureTier = selectedTier === "fast" ? "mini" : selectedTier;
    const config = AZURE_OPENAI_CONFIG[azureTier];

    // Detect data questions and ground with NL Analytics
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    let groundedContext = "";
    if (lastUserMsg && isDataQuestion(lastUserMsg.content)) {
      try {
        const nlRes = await fetch(`${NL_SERVICE_URL}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId: user.tenantId, question: lastUserMsg.content }),
          signal: AbortSignal.timeout(5000),
        });
        if (nlRes.ok) {
          const nlData = await nlRes.json();
          if (nlData.success && nlData.data?.answer) {
            groundedContext = `\n\n[GROUNDING DATA — answer using only this data when relevant]\nIntent: ${nlData.data.intent}\nData-backed answer: ${nlData.data.answer}\n`;
          }
        }
      } catch (e) {
        logger.debug("nl-analytics unavailable, falling back to LLM", { tenantId: user.tenantId });
      }
    }

    // Build messages with system prompt if not included
    const systemMessage: ChatMessage = {
      role: "system",
      content: SYSTEM_PROMPTS.syncbrain + groundedContext,
    };
    const fullMessages = messages[0]?.role === "system" ? messages : [systemMessage, ...messages];

    // ── OpenCode fast path ───────────────────────────────
    if (isOpenCodeConfigured()) {
      try {
        const opencodeMessages: OpenCodeMessage[] = fullMessages.map(m => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        }));

        const ocResponse = await opencodeChat(opencodeMessages, {
          directory: "./src",
        });

        if (ocResponse && ocResponse.content) {
          return NextResponse.json({
            content: ocResponse.content,
            model: ocResponse.model,
            usage: ocResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            finishReason: ocResponse.finishReason,
          });
        }
      } catch (e) {
        logger.debug("OpenCode unavailable, falling back to Azure OpenAI", { tenantId: user.tenantId });
      }
    }

    // ── Azure OpenAI fallback ────────────────────────────

    const url = buildAzureOpenAIUrl(config.deploymentName);
    const headers = buildAzureOpenAIHeaders();

    const payload = {
      messages: fullMessages,
      max_tokens: maxTokens || config.maxTokens,
      temperature: temperature ?? 0.7,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("ai/chat upstream error", {
        status: response.status,
        tenantId: user?.tenantId,
      });
      return NextResponse.json(
        { error: "AI service temporarily unavailable", detail: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      return NextResponse.json({ ok: false, error: "No response generated" }, { status: 500 });
    }

    return NextResponse.json({
      content: choice.message.content,
      model: config.modelName,
      usage: data.usage,
      finishReason: choice.finish_reason,
    });
  } catch (error) {
    logger.error("ai/chat request failed", {
      message: error instanceof Error ? error.message : String(error),
      tenantId: user?.tenantId,
    });
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

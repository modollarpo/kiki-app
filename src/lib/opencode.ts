import { logger } from "./logger";
// ============================================================
// OpenCode Client — Headless agent backend connector
// Connects to an OpenCode serve instance for conversational
// agent interaction. Falls back to Azure OpenAI when unavailable.
// ============================================================

const OPENCODE_ENDPOINT = process.env.OPENCODE_ENDPOINT || "";
const OPENCODE_SECRET = process.env.OPENCODE_SECRET || "";

// ── Check if OpenCode is configured ───────────────────────
export function isOpenCodeConfigured(): boolean {
  return !!OPENCODE_ENDPOINT;
}

// ── OpenCode session types ────────────────────────────────
export interface OpenCodeMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenCodeSession {
  id: string;
  directory: string;
}

export interface OpenCodeChatResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  finishReason: string;
}

// ── Build request headers ─────────────────────────────────
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (OPENCODE_SECRET) {
    headers["Authorization"] = `Bearer ${OPENCODE_SECRET}`;
  }
  return headers;
}

// ── Create a session ──────────────────────────────────────
export async function createSession(directory: string = "./src"): Promise<OpenCodeSession | null> {
  if (!isOpenCodeConfigured()) return null;

  try {
    const res = await fetch(`${OPENCODE_ENDPOINT}/api/sessions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ directory }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return { id: data.id || data.sessionId, directory };
    }
  } catch (e) {
    logger.warn("[OpenCode] Session creation failed:", { error: e instanceof Error ? (e).message : String(e) });
  }

  return null;
}

// ── Send a message in a session ───────────────────────────
export async function sendMessage(
  sessionId: string,
  messages: OpenCodeMessage[]
): Promise<OpenCodeChatResponse | null> {
  if (!isOpenCodeConfigured()) return null;

  try {
    const res = await fetch(`${OPENCODE_ENDPOINT}/api/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(30000), // 30s for agent reasoning
    });

    if (res.ok) {
      const data = await res.json();
      return {
        content: data.content || data.choices?.[0]?.message?.content || "",
        model: data.model || "opencode",
        usage: data.usage,
        finishReason: data.finishReason || data.finish_reason || "stop",
      };
    }
  } catch (e) {
    logger.warn("[OpenCode] Message send failed:", { error: e instanceof Error ? (e).message : String(e) });
  }

  return null;
}

// ── Direct chat (no session persistence) ──────────────────
export async function chat(
  messages: OpenCodeMessage[],
  options?: { directory?: string; model?: string }
): Promise<OpenCodeChatResponse | null> {
  if (!isOpenCodeConfigured()) return null;

  try {
    const res = await fetch(`${OPENCODE_ENDPOINT}/api/chat`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        messages,
        directory: options?.directory || "./src",
        model: options?.model,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        content: data.content || data.choices?.[0]?.message?.content || "",
        model: data.model || "opencode",
        usage: data.usage,
        finishReason: data.finishReason || data.finish_reason || "stop",
      };
    }
  } catch (e) {
    logger.warn("[OpenCode] Chat failed:", { error: e instanceof Error ? (e).message : String(e) });
  }

  return null;
}

// ── Health check ──────────────────────────────────────────
export async function healthCheck(): Promise<boolean> {
  if (!isOpenCodeConfigured()) return false;

  try {
    const res = await fetch(`${OPENCODE_ENDPOINT}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

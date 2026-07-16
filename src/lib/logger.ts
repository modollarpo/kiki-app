// Minimal structured logger.
//
// In production it emits one JSON object per line for ingestion by Azure
// Monitor / App Insights / any log pipeline. In development it uses
// human-readable console output. Centralizing logging here makes it trivial
// to later route to a real telemetry sink without touching call sites.
type Level = "info" | "warn" | "error" | "debug";

const isProd = process.env.NODE_ENV === "production";

function emit(level: Level, msg: string, meta?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), level, msg, ...(meta ?? {}) };
  if (isProd) {
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const fn =
      level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`[${level}] ${msg}`, meta ?? "");
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
  // Debug logs are suppressed in production to avoid noisy/expensive output.
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (!isProd) emit("debug", msg, meta);
  },
};

// ── API Error Handler ─────────────────────────────────────
// Drop-in catch helper: logs the error and returns a consistent JSON 500.
// Usage:  } catch (e) { return handleApiError(e, "route/context"); }
export function handleApiError(error: unknown, context: string): Response {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(context, { message });
  return Response.json({ error: "Internal server error", ok: false }, { status: 500 });
}

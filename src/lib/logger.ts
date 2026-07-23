let _requestId = "";
export function setRequestId(id: string) { _requestId = id; }
export function getRequestId(): string { return _requestId; }
export function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

type Level = "info" | "warn" | "error" | "debug";

const isProd = process.env.NODE_ENV === "production";

function emit(level: Level, msg: string, meta?: unknown): void {
  const entry = { ts: new Date().toISOString(), level, msg, rid: _requestId || undefined, ...(typeof meta === "object" && meta !== null ? meta : { meta }) };
  if (isProd) {
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    const prefix = _requestId ? `[${_requestId}]` : "";
    fn(`${prefix}[${level}] ${msg}`, meta ?? "");
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => emit("info", msg, meta),
  warn: (msg: string, meta?: unknown) => emit("warn", msg, meta),
  error: (msg: string, meta?: unknown) => emit("error", msg, meta),
  debug: (msg: string, meta?: unknown) => {
    if (!isProd) emit("debug", msg, meta);
  },
};

// ── API Error Handler ─────────────────────────────────────
// Drop-in catch helper: logs the error and returns a consistent JSON 500.
// Usage:  } catch (e) { return handleApiError(e, "route/context"); }
export function handleApiError(error: unknown, context: string): Response {
  const message = error instanceof Error ? error.message : "Unknown error";
  logger.error(context, { message });
  return Response.json({
    error: "Internal server error",
    ok: false,
    requestId: _requestId || undefined,
  }, {
    status: 500,
    headers: { "Content-Type": "application/json", "X-Request-Id": _requestId || "" },
  });
}

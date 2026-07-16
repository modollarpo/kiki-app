// ============================================================
// Retry Utility — Exponential backoff for transient failures
// ============================================================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOn?: (error: Error) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  retryOn: (err) => {
    const msg = err.message.toLowerCase();
    return msg.includes("timeout")
      || msg.includes("econnreset")
      || msg.includes("econnrefused")
      || msg.includes("429")
      || msg.includes("503")
      || msg.includes("502")
      || msg.includes("rate limit");
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === cfg.maxRetries) break;
      if (cfg.retryOn && !cfg.retryOn(lastError)) break;

      const delay = Math.min(
        cfg.baseDelayMs * Math.pow(2, attempt),
        cfg.maxDelayMs
      );
      const jitter = delay * 0.1 * Math.random();
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
  }

  throw lastError;
}

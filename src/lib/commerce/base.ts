// ============================================================
// KIKI Agent Platform — Commerce Connector Base Helpers
// Self-contained utilities for commerce connectors.
// Token encryption reuses the shared connectors/base helpers.
// ============================================================

import crypto from "crypto";
import { encryptToken, decryptToken } from "../connectors/base";

export { encryptToken, decryptToken };

// ── Identity Hashing ──────────────────────────────────────

export function hashEmailIdentity(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

export function hashPhoneIdentity(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return crypto.createHash("sha256").update(cleaned).digest("hex");
}

// ── Simplified HTTP Client ────────────────────────────────

export interface CommerceHttpResult<T> {
  success: boolean;
  data?: T;
  status?: number;
  error?: string;
}

export async function httpClient<T>(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
    retries?: number;
  } = {}
): Promise<CommerceHttpResult<T>> {
  const method = options.method ?? "GET";
  const headers = options.headers ?? {};
  const timeoutMs = options.timeoutMs ?? 30000;
  const maxRetries = options.retries ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let controller: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), timeoutMs);

      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...headers,
        },
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const isRetryable =
          response.status === 429 || response.status >= 500;
        if (isRetryable && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
        return {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as T;
      return { success: true, data, status: response.status };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        if (attempt < maxRetries) {
          continue;
        }
        return { success: false, error: "Request timeout" };
      }

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        continue;
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

// ============================================================
// KIKI Agent Platform — Base Platform Connector
// Shared infrastructure: rate limiting, circuit breaker,
// token encryption, retry logic, request signing
// ============================================================

import crypto from "crypto";
import {
  type PlatformId,
  type PlatformConfig,
  type PlatformApiResponse,
  type OAuthTokens,
} from "./types";
import { getEncryptionKey } from "../env";

// ── Token Encryption ───────────────────────────────────────

let _encryptionKey: Buffer | null = null;
function getENCRYPTION_KEY(): Buffer {
  if (!_encryptionKey) _encryptionKey = getEncryptionKey();
  return _encryptionKey;
}
const IV_LENGTH = 16;

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", getENCRYPTION_KEY(), iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getENCRYPTION_KEY(), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── Rate Limiter (Token Bucket) ────────────────────────────

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets: Map<string, RateBucket> = new Map();
  private maxTokens: number;
  private refillRate: number; // tokens per ms

  constructor(maxTokensPerSecond: number) {
    this.maxTokens = maxTokensPerSecond * 10; // 10x buffer
    this.refillRate = maxTokensPerSecond;
  }

  async acquire(key: string): Promise<boolean> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens
    const elapsed = now - bucket.lastRefill;
    const refill = elapsed * this.refillRate / 1000;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refill);
    bucket.lastRefill = now;

    // Try to acquire
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  async waitForSlot(key: string, maxWaitMs: number = 10000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (await this.acquire(key)) return true;
      await new Promise(r => setTimeout(r, 50));
    }
    return false;
  }
}

// ── Circuit Breaker ────────────────────────────────────────

type CircuitState = "closed" | "open" | "half_open";

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;
  private readonly successThreshold: number;

  constructor(
    failureThreshold: number = 5,
    recoveryTimeoutMs: number = 60000,
    successThreshold: number = 3
  ) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeoutMs;
    this.successThreshold = successThreshold;
  }

  canExecute(): boolean {
    if (this.state === "closed") return true;

    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = "half_open";
        return true;
      }
      return false;
    }

    // half_open: allow one request
    return true;
  }

  recordSuccess(): void {
    if (this.state === "half_open") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = "closed";
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "half_open") {
      this.state = "open";
      this.successCount = 0;
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = "open";
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): { state: CircuitState; failures: number; successes: number } {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
    };
  }
}

// ── HTTP Client with Retry ─────────────────────────────────

export interface HttpClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function httpClient<T>(
  config: HttpClientConfig,
  method: string,
  path: string,
  body?: any,
  params?: Record<string, string>
): Promise<PlatformApiResponse<T>> {
  const start = Date.now();
  const maxRetries = config.retries ?? 3;
  const retryDelay = config.retryDelay ?? 1000;
  const timeout = config.timeout ?? 30000;

  let url = `${config.baseUrl}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...config.headers,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      const rateLimitReset = response.headers.get("x-ratelimit-reset");
      const requestId = response.headers.get("x-request-id");

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");

        // Don't retry on client errors (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return {
            success: false,
            error: errorText,
            httpStatus: response.status,
            latencyMs,
            requestId: requestId || undefined,
          };
        }

        // Retry on 429 (rate limit) or 5xx
        if (attempt < maxRetries) {
          const delay = response.status === 429
            ? Math.min(retryDelay * Math.pow(2, attempt), 30000)
            : retryDelay * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        return {
          success: false,
          error: errorText,
          httpStatus: response.status,
          latencyMs,
          rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
          rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : undefined,
          requestId: requestId || undefined,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        latencyMs,
        rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
        rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : undefined,
        requestId: requestId || undefined,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - start;

      if (error.name === "AbortError") {
        return { success: false, error: "Request timeout", latencyMs };
      }

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempt)));
        continue;
      }

      return { success: false, error: String(error), latencyMs };
    }
  }

  return { success: false, error: "Max retries exceeded", latencyMs: Date.now() - start };
}

// ── Base Connector Class ───────────────────────────────────

export abstract class BaseConnector {
  readonly platformId: PlatformId;
  readonly config: PlatformConfig;
  protected rateLimiter: RateLimiter;
  protected circuitBreaker: CircuitBreaker;

  constructor(config: PlatformConfig) {
    this.config = config;
    this.platformId = config.id;
    this.rateLimiter = new RateLimiter(config.rateLimits.requestsPerSecond);
    this.circuitBreaker = new CircuitBreaker(5, 60000, 3);
  }

  protected async request<T>(
    method: string,
    path: string,
    accessToken: string,
    body?: any,
    params?: Record<string, string>
  ): Promise<PlatformApiResponse<T>> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      return {
        success: false,
        error: `Circuit breaker open for ${this.platformId}`,
        latencyMs: 0,
      };
    }

    // Rate limit
    const key = `${this.platformId}:${accessToken.slice(0, 10)}`;
    const acquired = await this.rateLimiter.waitForSlot(key, 15000);
    if (!acquired) {
      return {
        success: false,
        error: `Rate limit timeout for ${this.platformId}`,
        latencyMs: 0,
      };
    }

    // Make request
    const result = await httpClient<T>(
      {
        baseUrl: this.config.apiBaseUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 30000,
        retries: 2,
      },
      method,
      path,
      body,
      params
    );

    // Record circuit breaker state
    if (result.success) {
      this.circuitBreaker.recordSuccess();
    } else if (result.httpStatus && result.httpStatus >= 500) {
      this.circuitBreaker.recordFailure();
    }

    return result;
  }

  protected async get<T>(path: string, accessToken: string, params?: Record<string, string>): Promise<PlatformApiResponse<T>> {
    return this.request<T>("GET", path, accessToken, undefined, params);
  }

  protected async post<T>(path: string, accessToken: string, body: any): Promise<PlatformApiResponse<T>> {
    return this.request<T>("POST", path, accessToken, body);
  }

  protected async put<T>(path: string, accessToken: string, body: any): Promise<PlatformApiResponse<T>> {
    return this.request<T>("PUT", path, accessToken, body);
  }

  protected async delete<T>(path: string, accessToken: string): Promise<PlatformApiResponse<T>> {
    return this.request<T>("DELETE", path, accessToken);
  }

  // ── SHA-256 Hashing (for user data) ────────────────────

  protected hashEmail(email: string): string {
    return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
  }

  protected hashPhone(phone: string): string {
    const cleaned = phone.replace(/[^0-9+]/g, "");
    return crypto.createHash("sha256").update(cleaned).digest("hex");
  }

  // ── Dedup ID ──────────────────────────────────────────

  protected generateDedupId(tenantId: string, orderId: string, eventName: string): string {
    const payload = `${tenantId}:${orderId}:${eventName}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  // ── Abstract Methods ──────────────────────────────────

  abstract generateOAuthUrl(tenantId: string): Promise<{ url: string; state: string }>;
  abstract handleCallback(code: string, state: string): Promise<OAuthTokens>;
  abstract refreshToken(refreshToken: string): Promise<OAuthTokens>;
  abstract validateToken(accessToken: string): Promise<boolean>;
}

// ── Common Helpers ─────────────────────────────────────────

export function buildQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export function truncateString(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, "");
}

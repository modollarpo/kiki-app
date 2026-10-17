// ============================================================
// In-process metrics registry
// Real, per-instance latency percentiles + counters. No external
// dependencies — samples live in the Node process and are surfaced
// via /api/status. Percentiles reflect THIS instance only.
// ============================================================

interface Sample {
  ms: number;
  at: number;
  ok: boolean;
}

export interface LatencySummary {
  count: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  lastMs: number;
  lastAt: number;
  errorRate: number;
}

const MAX_SAMPLES = 500;

interface MetricsState {
  samples: Map<string, Sample[]>;
  counters: Map<string, number>;
  startedAt: number;
}

// The registry MUST live on globalThis. Next.js compiles server code into
// per-route bundles and hot-reloads modules, so a plain module-level singleton
// would be duplicated — each route would record into its own map and
// /api/status would never see samples written by other routes. globalThis keeps
// a single shared instance for the whole process (mirrors db.ts's globalForDb).
const globalForMetrics = globalThis as typeof globalThis & {
  __kikiMetrics?: MetricsState;
};

function state(): MetricsState {
  if (!globalForMetrics.__kikiMetrics) {
    globalForMetrics.__kikiMetrics = {
      samples: new Map<string, Sample[]>(),
      counters: new Map<string, number>(),
      startedAt: Date.now(),
    };
  }
  return globalForMetrics.__kikiMetrics;
}

// Monotonic clock when available (immune to wall-clock jumps).
export function nowMs(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return perf && typeof perf.now === "function" ? perf.now() : Date.now();
}

export function recordLatency(key: string, ms: number, ok = true): void {
  const samples = state().samples;
  let arr = samples.get(key);
  if (!arr) {
    arr = [];
    samples.set(key, arr);
  }
  arr.push({ ms, at: Date.now(), ok });
  if (arr.length > MAX_SAMPLES) arr.splice(0, arr.length - MAX_SAMPLES);
}

export function recordCount(key: string, n = 1): void {
  const counters = state().counters;
  counters.set(key, (counters.get(key) ?? 0) + n);
}

export function counterValue(key: string): number {
  return state().counters.get(key) ?? 0;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function summarize(list: Sample[]): LatencySummary | null {
  if (list.length === 0) return null;
  const sorted = list.map((s) => s.ms).sort((a, b) => a - b);
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  const sum = sorted.reduce((a, b) => a + b, 0);
  const errors = list.filter((s) => !s.ok).length;
  const last = list[list.length - 1];
  return {
    count: list.length,
    p50: round(pick(50)),
    p95: round(pick(95)),
    p99: round(pick(99)),
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
    avg: round(sum / sorted.length),
    lastMs: round(last.ms),
    lastAt: last.at,
    errorRate: round(errors / list.length),
  };
}

export function latencySummary(key: string): LatencySummary | null {
  return summarize(state().samples.get(key) ?? []);
}

// Merge every key that starts with `prefix` (e.g. "db." or "ai.").
export function latencySummaryMatching(prefix: string): LatencySummary | null {
  const merged: Sample[] = [];
  for (const [key, arr] of state().samples) {
    if (key.startsWith(prefix)) merged.push(...arr);
  }
  return summarize(merged);
}

export function allLatency(): Record<string, LatencySummary> {
  const out: Record<string, LatencySummary> = {};
  for (const key of state().samples.keys()) {
    const s = latencySummary(key);
    if (s) out[key] = s;
  }
  return out;
}

export function allCounters(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of state().counters) out[k] = v;
  return out;
}

export function uptimeMs(): number {
  return Date.now() - state().startedAt;
}

// Classify a SQL statement for latency bucketing.
export function dbKind(sql: string): string {
  const m = sql.trim().match(/^(select|insert|update|delete|create|alter|drop|pragma|with)/i);
  return m ? m[1].toLowerCase() : "other";
}

// Test hook: clear all samples and counters.
export function resetMetrics(): void {
  state().samples.clear();
  state().counters.clear();
}

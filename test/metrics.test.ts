import { describe, it, expect, beforeEach } from "vitest";
import {
  recordLatency,
  latencySummary,
  latencySummaryMatching,
  allLatency,
  recordCount,
  counterValue,
  dbKind,
  resetMetrics,
} from "@/lib/metrics";

describe("metrics registry", () => {
  beforeEach(() => resetMetrics());

  it("returns null before any samples", () => {
    expect(latencySummary("db.select")).toBeNull();
    expect(latencySummaryMatching("db.")).toBeNull();
  });

  it("computes percentiles from recorded samples", () => {
    for (let i = 1; i <= 100; i++) recordLatency("db.select", i, true);
    const s = latencySummary("db.select")!;
    expect(s.count).toBe(100);
    expect(s.min).toBe(1);
    expect(s.max).toBe(100);
    expect(s.p95).toBeGreaterThanOrEqual(s.p50);
    expect(s.p99).toBeGreaterThanOrEqual(s.p95);
  });

  it("merges every key under a prefix", () => {
    recordLatency("db.select", 10);
    recordLatency("db.insert", 20);
    recordLatency("ai.groq", 5);
    expect(latencySummaryMatching("db.")!.count).toBe(2);
    expect(latencySummaryMatching("ai.")!.count).toBe(1);
  });

  it("tracks error rate and counters", () => {
    recordLatency("ai.groq", 100, false);
    recordLatency("ai.groq", 100, true);
    expect(latencySummary("ai.groq")!.errorRate).toBe(0.5);
    recordCount("op.x");
    recordCount("op.x", 2);
    expect(counterValue("op.x")).toBe(3);
  });

  it("classifies SQL statement kinds", () => {
    expect(dbKind("SELECT * FROM t")).toBe("select");
    expect(dbKind("insert into t values (1)")).toBe("insert");
    expect(dbKind("  UPDATE t SET a = 1")).toBe("update");
    expect(dbKind("PRAGMA journal_mode")).toBe("pragma");
    expect(dbKind("WITH x AS (SELECT 1) SELECT * FROM x")).toBe("with");
  });

  it("caps retained samples at the ring-buffer size", () => {
    for (let i = 0; i < 600; i++) recordLatency("db.select", i);
    expect(latencySummary("db.select")!.count).toBe(500);
    expect(allLatency()["db.select"].count).toBe(500);
  });
});

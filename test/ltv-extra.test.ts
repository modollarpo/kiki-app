import { describe, it, expect } from "vitest";
import { predictLTV, predictLTVBatch } from "@/lib/ltv-engine";

describe("LTV Engine — edge cases", () => {
  it("handles minimal input (only required fields)", async () => {
    const p = await predictLTV({ platform: "meta", eventType: "purchase", value: 100 });
    expect(p.predictedLTV).toBeGreaterThan(0);
    expect(p.confidence).toBeGreaterThan(0);
    expect(p.confidence).toBeLessThanOrEqual(1);
  });

  it("handles an unknown platform without throwing", async () => {
    const p = await predictLTV({
      platform: "myspace" as never,
      eventType: "purchase",
      value: 50,
    });
    expect(p.predictedLTV).toBeGreaterThan(0);
  });

  it("handles zero value", async () => {
    const p = await predictLTV({ platform: "google", eventType: "signup", value: 0 });
    expect(p.predictedLTV).toBeGreaterThanOrEqual(0);
    expect(p.confidence).toBeGreaterThan(0);
  });

  it("handles very large value", async () => {
    const p = await predictLTV({
      platform: "linkedin",
      eventType: "purchase",
      value: 1_000_000,
    });
    expect(Number.isFinite(p.predictedLTV)).toBe(true);
    expect(p.predictedLTV).toBeGreaterThan(0);
  });

  it("batch returns one prediction per input", async () => {
    const batch = [
      { platform: "meta" as const, eventType: "purchase" as const, value: 100 },
      { platform: "google" as const, eventType: "signup" as const, value: 0 },
      { platform: "tiktok" as const, eventType: "add_to_cart" as const, value: 50 },
      { platform: "snap" as const, eventType: "view_content" as const, value: 10 },
    ];
    const predictions = await predictLTVBatch(batch);
    expect(predictions).toHaveLength(batch.length);
    predictions.forEach((p) => {
      expect(p.predictedLTV).toBeGreaterThan(0);
      expect(p.confidence).toBeGreaterThan(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    });
  });

  it("batch returns empty array for empty input", async () => {
    expect(await predictLTVBatch([])).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { calculateFxSpread } from "@/lib/billing";
import { cn } from "@/lib/kdls";
import { selectModelForTask } from "@/lib/azure-openai";

// These tests cover pure functions and require NO database connection,
// so they run in any environment (CI, local, offline).
describe("pure utils — no DB required", () => {
  it("calculateFxSpread applies a 50bps spread", () => {
    const r = calculateFxSpread(10000, "USD", "NGN");
    expect(r.spreadRevenue).toBeCloseTo(10000 * 0.005, 2);
    expect(r.effectiveRate).toBeLessThan(r.midRate);
    expect(r.midRate).toBe(1550);
  });

  it("calculateFxSpread falls back to 1.0 for unknown pairs", () => {
    const r = calculateFxSpread(500, "USD", "XYZ");
    expect(r.midRate).toBe(1);
  });

  it("cn merges truthy class names and drops falsy", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("selectModelForTask routes creative/analysis to standard tier", () => {
    expect(selectModelForTask("creative")).toBe("standard");
    expect(selectModelForTask("analysis")).toBe("standard");
    expect(selectModelForTask("routing")).toBe("mini");
    expect(selectModelForTask("general")).toBe("mini");
  });

  it("selectModelForTask routes fast tasks to Groq tier", () => {
    expect(selectModelForTask("fast")).toBe("fast");
  });
});

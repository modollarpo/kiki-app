import { describe, it, expect, beforeEach } from "vitest";

describe("LTV Engine", () => {
  it("should predict LTV with heuristic fallback", async () => {
    const { predictLTV } = await import("@/lib/ltv-engine");

    const prediction = await predictLTV({
      platform: "meta",
      eventType: "purchase",
      value: 100,
      device: "desktop",
      country: "US",
      sessionDuration: 300,
      pagesViewed: 10,
      previousPurchases: 2,
      accountAge: 365,
    });

    expect(prediction.predictedLTV).toBeGreaterThan(0);
    expect(prediction.confidence).toBeGreaterThan(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
    expect(prediction.horizonDays).toBe(90);
    expect(["high", "mid", "low", "churn_risk"]).toContain(prediction.segment);
    expect(prediction.recommendedBidMultiplier).toBeGreaterThan(0);
  });

  it("should assign higher LTV to high-value signals", async () => {
    const { predictLTV } = await import("@/lib/ltv-engine");

    const highValue = await predictLTV({
      platform: "linkedin",
      eventType: "purchase",
      value: 500,
      device: "desktop",
      sessionDuration: 600,
      previousPurchases: 5,
    });

    const lowValue = await predictLTV({
      platform: "snapchat",
      eventType: "view_content",
      value: 10,
      device: "mobile",
      sessionDuration: 10,
      previousPurchases: 0,
    });

    expect(highValue.predictedLTV).toBeGreaterThan(lowValue.predictedLTV);
  });

  it("should handle batch predictions", async () => {
    const { predictLTVBatch } = await import("@/lib/ltv-engine");

    const predictions = await predictLTVBatch([
      { platform: "meta", eventType: "purchase", value: 100 },
      { platform: "google", eventType: "signup", value: 0 },
      { platform: "tiktok", eventType: "add_to_cart", value: 50 },
    ]);

    expect(predictions).toHaveLength(3);
    predictions.forEach(p => {
      expect(p.predictedLTV).toBeGreaterThan(0);
      expect(p.confidence).toBeGreaterThan(0);
    });
  });
});

describe("LTV Training", () => {
  it("should train a model and return valid result", async () => {
    const { trainModel } = await import("@/lib/ltv-training");

    const result = trainModel("t1");

    expect(result.modelId).toBeTruthy();
    expect(result.version).toBeTruthy();
    expect(result.version).toMatch(/^v\d+$/);
    expect(typeof result.previousR2).toBe("number");
    expect(typeof result.newR2).toBe("number");
    expect(typeof result.improvement).toBe("number");
    expect(Array.isArray(result.factorChanges)).toBe(true);
    expect(typeof result.driftDetected).toBe("boolean");
    expect(Array.isArray(result.metacognitionEvents)).toBe(true);
  });

  it("should retrieve active model", async () => {
    const { trainModel, getActiveModel } = await import("@/lib/ltv-training");

    trainModel("t1");
    const model = getActiveModel("t1");

    if (model) {
      expect(model.id).toBeTruthy();
      expect(model.version).toBeTruthy();
      expect(model.weights).toBeTruthy();
      expect(model.weights.intercept).toBeGreaterThan(0);
      expect(model.sampleCount).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Metacognition", () => {
  it("should run self-reflection", async () => {
    const { runSelfReflection } = await import("@/lib/metacognition");

    const result = runSelfReflection("t1");

    expect(typeof result.overallHealth).toBe("number");
    expect(result.overallHealth).toBeGreaterThanOrEqual(0);
    expect(result.overallHealth).toBeLessThanOrEqual(1);
    expect(typeof result.confidenceScore).toBe("number");
    expect(typeof result.adaptationNeeded).toBe("boolean");
    expect(Array.isArray(result.patterns)).toBe(true);
  });

  it("should analyze confidence calibration", async () => {
    const { analyzeConfidenceCalibration } = await import("@/lib/metacognition");

    const calibration = analyzeConfidenceCalibration("t1");
    expect(Array.isArray(calibration)).toBe(true);
  });

  it("should analyze factor attribution", async () => {
    const { analyzeFactorAttribution } = await import("@/lib/metacognition");

    const attributions = analyzeFactorAttribution("t1");
    expect(Array.isArray(attributions)).toBe(true);
  });
});

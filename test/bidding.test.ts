import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getAdSets: vi.fn(),
  updateAdSet: vi.fn(),
  updateCampaign: vi.fn(),
}));

vi.mock("../src/lib/connectors", () => ({
  isPlatformSupported: (p: string) => p === "meta" || p === "google",
  getConnector: () => ({
    getAdSets: h.getAdSets,
    updateAdSet: h.updateAdSet,
    updateCampaign: h.updateCampaign,
  }),
}));

import { applyBidDecision } from "../src/lib/bidding";

describe("applyBidDecision", () => {
  beforeEach(() => {
    h.getAdSets.mockReset();
    h.updateAdSet.mockReset();
    h.updateCampaign.mockReset();
  });

  it("sets bidAmount on every ad set and never touches campaign daily budget", async () => {
    h.getAdSets.mockResolvedValue({
      success: true,
      latencyMs: 1,
      data: [
        { id: "as_1", campaignId: "pc_1", name: "A", status: "active" },
        { id: "as_2", campaignId: "pc_1", name: "B", status: "active" },
      ],
    });
    h.updateAdSet.mockResolvedValue({ success: true, data: { id: "x" }, latencyMs: 1 });

    const res = await applyBidDecision({
      platform: "meta",
      accessToken: "tok",
      internalCampaignId: "c1",
      platformCampaignId: "pc_1",
      newBid: 3.25,
      integrationConfig: null,
    });

    expect(res.applied).toBe(true);
    expect(h.updateAdSet).toHaveBeenCalledTimes(2);
    expect(h.updateAdSet).toHaveBeenCalledWith("tok", "as_1", { bidAmount: 3.25 });
    expect(h.updateAdSet).toHaveBeenCalledWith("tok", "as_2", { bidAmount: 3.25 });
    expect(h.updateCampaign).not.toHaveBeenCalled();
    for (const call of h.updateAdSet.mock.calls) {
      expect(call[2]).not.toHaveProperty("dailyBudget");
    }
  });

  it("resolves the platform campaign id from the integration config mapping", async () => {
    h.getAdSets.mockResolvedValue({
      success: true,
      latencyMs: 1,
      data: [{ id: "as_9", campaignId: "pc_77", name: "A", status: "active" }],
    });
    h.updateAdSet.mockResolvedValue({ success: true, data: {}, latencyMs: 1 });

    const res = await applyBidDecision({
      platform: "meta",
      accessToken: "tok",
      internalCampaignId: "c1",
      platformCampaignId: null,
      newBid: 5,
      integrationConfig: JSON.stringify({ campaignIds: { c1: "pc_77" } }),
    });

    expect(res.applied).toBe(true);
    expect(h.getAdSets).toHaveBeenCalledWith("tok", "pc_77");
  });

  it("skips (no platform mapping) instead of pushing a wrong id", async () => {
    const res = await applyBidDecision({
      platform: "meta",
      accessToken: "tok",
      internalCampaignId: "c1",
      newBid: 5,
      integrationConfig: null,
    });

    expect(res.applied).toBe(false);
    expect(res.skippedReason).toContain("no platform campaign mapping");
    expect(h.getAdSets).not.toHaveBeenCalled();
    expect(h.updateAdSet).not.toHaveBeenCalled();
  });

  it("does not apply when ad-set listing fails", async () => {
    h.getAdSets.mockResolvedValue({ success: false, error: "boom", latencyMs: 1 });

    const res = await applyBidDecision({
      platform: "meta",
      accessToken: "tok",
      internalCampaignId: "c1",
      platformCampaignId: "pc_1",
      newBid: 5,
    });

    expect(res.applied).toBe(false);
    expect(res.error).toContain("boom");
    expect(h.updateAdSet).not.toHaveBeenCalled();
  });

  it("reports partial success when only some ad sets update", async () => {
    h.getAdSets.mockResolvedValue({
      success: true,
      latencyMs: 1,
      data: [
        { id: "as_1", campaignId: "pc_1", name: "A", status: "active" },
        { id: "as_2", campaignId: "pc_1", name: "B", status: "active" },
      ],
    });
    h.updateAdSet
      .mockResolvedValueOnce({ success: true, data: { id: "as_1" }, latencyMs: 1 })
      .mockResolvedValueOnce({ success: false, error: "rate limited", latencyMs: 1 });

    const res = await applyBidDecision({
      platform: "meta",
      accessToken: "tok",
      internalCampaignId: "c1",
      platformCampaignId: "pc_1",
      newBid: 2,
    });

    expect(res.applied).toBe(true);
    expect(res.adSetResults).toHaveLength(2);
    expect(res.adSetResults.filter(r => r.success)).toHaveLength(1);
  });

  it("skips unsupported platforms without calling the connector", async () => {
    const res = await applyBidDecision({
      platform: "myspace",
      accessToken: "tok",
      internalCampaignId: "c1",
      platformCampaignId: "pc_1",
      newBid: 5,
    });

    expect(res.applied).toBe(false);
    expect(res.skippedReason).toContain("not supported");
    expect(h.getAdSets).not.toHaveBeenCalled();
  });
});

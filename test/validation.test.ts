import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  paginationSchema,
  campaignCreateSchema,
  campaignUpdateSchema,
  campaignQuerySchema,
  bidOverrideSchema,
  chatMessageSchema,
  walletTopUpSchema,
  contactCreateSchema,
  signalSendSchema,
  validateSearchParams,
  validateBody,
} from "@/lib/validation";

// ── Schema Validation ────────────────────────────────────────

describe("validation schemas", () => {
  describe("paginationSchema", () => {
    it("applies defaults for empty input", () => {
      const r = paginationSchema.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(1);
        expect(r.data.limit).toBe(20);
      }
    });

    it("coerces string numbers", () => {
      const r = paginationSchema.safeParse({ page: "3", limit: "50" });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(3);
        expect(r.data.limit).toBe(50);
      }
    });

    it("rejects limit > 100", () => {
      const r = paginationSchema.safeParse({ limit: 200 });
      expect(r.success).toBe(false);
    });

    it("rejects page < 1", () => {
      const r = paginationSchema.safeParse({ page: 0 });
      expect(r.success).toBe(false);
    });
  });

  describe("campaignCreateSchema", () => {
    it("accepts valid campaign", () => {
      const r = campaignCreateSchema.safeParse({ name: "Test", platform: "meta" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.status).toBe("draft");
    });

    it("rejects empty name", () => {
      const r = campaignCreateSchema.safeParse({ name: "", platform: "meta" });
      expect(r.success).toBe(false);
    });

    it("rejects invalid platform", () => {
      const r = campaignCreateSchema.safeParse({ name: "Test", platform: "twitter" });
      expect(r.success).toBe(false);
    });

    it("rejects budget > 10M", () => {
      const r = campaignCreateSchema.safeParse({ name: "Test", platform: "meta", budget: 20_000_000 });
      expect(r.success).toBe(false);
    });
  });

  describe("campaignUpdateSchema", () => {
    it("accepts partial updates", () => {
      const r = campaignUpdateSchema.safeParse({ budget: 5000 });
      expect(r.success).toBe(true);
    });

    it("accepts empty update", () => {
      const r = campaignUpdateSchema.safeParse({});
      expect(r.success).toBe(true);
    });
  });

  describe("campaignQuerySchema", () => {
    it("parses query params with defaults", () => {
      const r = campaignQuerySchema.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(1);
        expect(r.data.limit).toBe(20);
      }
    });

    it("filters by status", () => {
      const r = campaignQuerySchema.safeParse({ status: "active" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.status).toBe("active");
    });
  });

  describe("bidOverrideSchema", () => {
    it("accepts valid override", () => {
      const r = bidOverrideSchema.safeParse({ campaignId: "c1", action: "increase", bidAmount: 100 });
      expect(r.success).toBe(true);
    });

    it("rejects invalid action", () => {
      const r = bidOverrideSchema.safeParse({ campaignId: "c1", action: "invalid" });
      expect(r.success).toBe(false);
    });

    it("rejects empty campaignId", () => {
      const r = bidOverrideSchema.safeParse({ campaignId: "", action: "maintain" });
      expect(r.success).toBe(false);
    });
  });

  describe("chatMessageSchema", () => {
    it("accepts valid message with default tier", () => {
      const r = chatMessageSchema.safeParse({ message: "hello" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.tier).toBe("mini");
    });

    it("accepts explicit tier", () => {
      const r = chatMessageSchema.safeParse({ message: "hello", tier: "standard" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.tier).toBe("standard");
    });

    it("rejects empty message", () => {
      const r = chatMessageSchema.safeParse({ message: "" });
      expect(r.success).toBe(false);
    });

    it("rejects message > 10000 chars", () => {
      const r = chatMessageSchema.safeParse({ message: "x".repeat(10001) });
      expect(r.success).toBe(false);
    });
  });

  describe("walletTopUpSchema", () => {
    it("accepts valid top-up", () => {
      const r = walletTopUpSchema.safeParse({ amount: 100, paymentMethodId: "pm_123" });
      expect(r.success).toBe(true);
    });

    it("rejects negative amount", () => {
      const r = walletTopUpSchema.safeParse({ amount: -50, paymentMethodId: "pm_123" });
      expect(r.success).toBe(false);
    });

    it("rejects amount > 100k", () => {
      const r = walletTopUpSchema.safeParse({ amount: 200_000, paymentMethodId: "pm_123" });
      expect(r.success).toBe(false);
    });
  });

  describe("contactCreateSchema", () => {
    it("accepts valid contact", () => {
      const r = contactCreateSchema.safeParse({ email: "a@b.com" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.tags).toEqual([]);
    });

    it("rejects invalid email", () => {
      const r = contactCreateSchema.safeParse({ email: "not-an-email" });
      expect(r.success).toBe(false);
    });
  });

  describe("signalSendSchema", () => {
    it("accepts valid signal", () => {
      const r = signalSendSchema.safeParse({ platform: "meta", eventName: "Purchase" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.eventData).toEqual({});
    });

    it("rejects missing eventName", () => {
      const r = signalSendSchema.safeParse({ platform: "meta" });
      expect(r.success).toBe(false);
    });
  });
});

// ── validateSearchParams ─────────────────────────────────────

describe("validateSearchParams", () => {
  function makeReq(url: string): Request {
    return new Request(url);
  }

  it("returns ok:true with valid params", () => {
    const req = makeReq("http://localhost?page=1&limit=10");
    const result = validateSearchParams(req, paginationSchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
    }
  });

  it("returns ok:false with 400 response for invalid params", async () => {
    const req = makeReq("http://localhost?page=0");
    const result = validateSearchParams(req, paginationSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBeDefined();
    }
  });

  it("applies defaults when no params provided", () => {
    const req = makeReq("http://localhost");
    const result = validateSearchParams(req, paginationSchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });
});

// ── validateBody ─────────────────────────────────────────────

describe("validateBody", () => {
  function makeReq(body: unknown, contentType = "application/json"): Request {
    return new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: JSON.stringify(body),
    });
  }

  it("returns ok:true with valid body", async () => {
    const req = makeReq({ message: "hello" });
    const result = await validateBody(req, chatMessageSchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.message).toBe("hello");
      expect(result.data.tier).toBe("mini");
    }
  });

  it("returns ok:false for invalid body", async () => {
    const req = makeReq({ message: "" });
    const result = await validateBody(req, chatMessageSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it("returns ok:false for invalid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const result = await validateBody(req, chatMessageSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe("Invalid JSON body");
    }
  });
});

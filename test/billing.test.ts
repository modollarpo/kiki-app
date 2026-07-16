import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "@/lib/db";
import {
  calculateFxSpread,
  PLAN_PRICING,
  recordUsage,
  generateInvoice,
} from "@/lib/billing";
import { isDbAvailable } from "./db-env";

const dbAvailable = await isDbAvailable();

const TENANT = "t1"; // seeded Acme Corp tenant

describe.skipIf(!dbAvailable)("billing — fx spread", () => {
  it("uses the mid-market rate for known pairs", () => {
    const r = calculateFxSpread(1000, "USD", "EUR");
    expect(r.midRate).toBeCloseTo(0.92, 5);
  });

  it("applies a 50bps spread to compute revenue", () => {
    const r = calculateFxSpread(10000, "USD", "NGN");
    expect(r.spreadRevenue).toBeCloseTo(10000 * 0.005, 2);
    expect(r.effectiveRate).toBeLessThan(r.midRate);
  });

  it("falls back to 1.0 for unknown pairs", () => {
    const r = calculateFxSpread(500, "USD", "XYZ");
    expect(r.midRate).toBe(1);
  });
});

describe.skipIf(!dbAvailable)("billing — plan pricing", () => {
  it("has sane starter pricing", () => {
    expect(PLAN_PRICING.starter.monthlyPrice).toBe(490);
    expect(PLAN_PRICING.starter.signalOverageRate).toBeGreaterThan(0);
  });

  it("oaas carries a management fee percent", () => {
    expect(PLAN_PRICING.oaas.managementFeePercent).toBeGreaterThan(0);
  });
});

describe.skipIf(!dbAvailable)("billing — usage metering", () => {
  it("records a usage record and computes overage cost", async () => {
    const rec = await recordUsage(TENANT, "ai_tokens", 1000);
    expect(rec.tenantId).toBe(TENANT);
    expect(rec.type).toBe("ai_tokens");
    expect(rec.totalCost).toBeGreaterThanOrEqual(0);

    const db = await getDb();
    const stored = db.prepare("SELECT * FROM usage_records WHERE id = ?").get(rec.id) as any;
    expect(stored).toBeTruthy();
    expect(stored.quantity).toBe(1000);
  });
});

describe.skipIf(!dbAvailable)("billing — invoice generation", () => {
  it("generates an invoice with line items and persists it", async () => {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 86400000).toISOString();
    const periodEnd = now.toISOString();

    const inv = await generateInvoice(TENANT, periodStart, periodEnd);
    expect(inv.tenantId).toBe(TENANT);
    expect(inv.currency).toBe("usd");
    expect(Array.isArray(inv.lineItems)).toBe(true);
    expect(inv.amount).toBeGreaterThanOrEqual(0);

    const db = await getDb();
    const stored = db.prepare("SELECT * FROM invoices WHERE id = ?").get(inv.id) as any;
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored.line_items).length).toBe(inv.lineItems.length);
  });
});

beforeAll(async () => {
  await getDb(); // ensure seeded
});

import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "@/lib/db";
import {
  calculateOaasFees,
  generateInvoice,
  handlePaymentFailure,
  PLAN_PRICING,
} from "@/lib/billing";

const TENANT = "t1";

async function activeSpend(): Promise<number> {
  const db = await getDb();
  const row = (await db.prepare(
    "SELECT COALESCE(SUM(spend),0) as s FROM campaigns WHERE tenant_id=? AND status='active'"
  ).get(TENANT)) as { s: number };
  return row.s;
}

describe("billing — OaaS fee calculation", () => {
  it("derives management fee as a % of managed spend", async () => {
    const r = await calculateOaasFees(
      TENANT,
      new Date(Date.now() - 30 * 86400000).toISOString(),
      new Date().toISOString()
    );
    const spend = await activeSpend();
    expect(r.managementFee).toBeCloseTo(spend * (PLAN_PRICING.oaas.managementFeePercent / 100), 2);
    expect(r.actualRoas).toBeGreaterThan(0);
    expect(r.baselineRoas).toBeGreaterThan(0);
  });

  it("computes performance bonus only on positive uplift", async () => {
    const r = await calculateOaasFees(
      TENANT,
      new Date(Date.now() - 30 * 86400000).toISOString(),
      new Date().toISOString()
    );
    // bonus = max(0, revenue - baselineRevenue) * bonusPct
    if (r.upliftPercent <= 0) {
      expect(r.performanceBonus).toBe(0);
    } else {
      expect(r.performanceBonus).toBeGreaterThan(0);
    }
  });
});

describe("billing — invoice generation (growth plan)", () => {
  it("includes the base subscription line item", async () => {
    const periodStart = new Date(Date.now() - 30 * 86400000).toISOString();
    const periodEnd = new Date().toISOString();
    const inv = await generateInvoice(TENANT, periodStart, periodEnd);
    expect(inv.lineItems.some(li => /Growth Plan/.test(li.description) && li.amount === PLAN_PRICING.growth.monthlyPrice)).toBe(true);
    expect(inv.status).toBe("open");
  });
});

describe("billing — dunning transitions", () => {
  it("moves subscription to past_due after first failure", async () => {
    await handlePaymentFailure(TENANT, "inv_test_dunning", 1);
    const db = await getDb();
    const sub = (await db.prepare(
      "SELECT status FROM subscriptions WHERE tenant_id=? ORDER BY created_at DESC LIMIT 1"
    ).get(TENANT)) as { status: string };
    expect(sub.status).toBe("past_due");
    // restore for subsequent tests
    db.prepare("UPDATE subscriptions SET status='active' WHERE tenant_id=?").run(TENANT);
  });
});

beforeAll(async () => {
  await getDb();
});

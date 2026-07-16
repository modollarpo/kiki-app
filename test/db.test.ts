import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "@/lib/db";
import { getPlanLimits, checkPlanLimit } from "@/lib/tenant";
import { isDbAvailable } from "./db-env";

const dbAvailable = await isDbAvailable();

describe.skipIf(!dbAvailable)("db — initialization & seed", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  it("seeds the default tenant and users", async () => {
    const users = (await db.prepare("SELECT COUNT(*) as c FROM users").get()) as { c: number };
    expect(users.c).toBeGreaterThan(0);
  });

  it("creates core tables", async () => {
    for (const t of ["campaigns", "agents", "wallets", "subscriptions", "usage_records", "invoices", "oaas_tasks", "kyc_entities"]) {
      // Dialect-portable existence check: a COUNT query throws if the table
      // is missing, on both SQLite and PostgreSQL.
      const res = await db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
      expect(res, `missing or unqueryable table ${t}`).toBeTruthy();
    }
  });

  it("stores a funded wallet for the seeded tenant", async () => {
    const w = (await db.prepare("SELECT balance FROM wallets WHERE tenant_id='t1'").get()) as { balance: number };
    expect(w.balance).toBeGreaterThan(0);
  });
});

describe.skipIf(!dbAvailable)("tenant — plan limits", () => {
  it("returns limits for a known plan", () => {
    const limits = getPlanLimits("growth");
    expect(limits).toBeTruthy();
    expect(limits.maxSignalsPerDay).toBeGreaterThan(0);
  });

  it("falls back to starter for unknown plans", () => {
    expect(getPlanLimits("nope")).toEqual(getPlanLimits("starter"));
  });

  it("flags usage over the limit", async () => {
    const res = await checkPlanLimit("t1", "signals", 9_999_999_999);
    expect(res.allowed).toBe(false);
  });

  it("allows usage within the limit", async () => {
    const res = await checkPlanLimit("t1", "signals", 10);
    expect(res.allowed).toBe(true);
  });
});

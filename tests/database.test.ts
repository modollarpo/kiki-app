import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getDb, genId } from "@/lib/db";

describe("Database", () => {
  let db: ReturnType<typeof getDb>;

  beforeEach(() => {
    db = getDb();
  });

  it("should initialize with all required tables", () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all() as Array<{ name: string }>;

    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain("users");
    expect(tableNames).toContain("campaigns");
    expect(tableNames).toContain("agents");
    expect(tableNames).toContain("signals");
    expect(tableNames).toContain("ltv_predictions");
    expect(tableNames).toContain("wallets");
    expect(tableNames).toContain("wallet_cards");
    expect(tableNames).toContain("wallet_transactions");
    expect(tableNames).toContain("notifications");
    expect(tableNames).toContain("agent_actions");
    expect(tableNames).toContain("fraud_events");
    expect(tableNames).toContain("system_metrics");
    expect(tableNames).toContain("ltv_models");
    expect(tableNames).toContain("prediction_feedback");
    expect(tableNames).toContain("metacognition_log");
    expect(tableNames).toContain("feature_store");
  });

  it("should have seeded demo data", () => {
    const users = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
    expect(users.c).toBeGreaterThanOrEqual(2);

    const campaigns = db.prepare("SELECT COUNT(*) as c FROM campaigns").get() as { c: number };
    expect(campaigns.c).toBeGreaterThanOrEqual(6);

    const agents = db.prepare("SELECT COUNT(*) as c FROM agents").get() as { c: number };
    expect(agents.c).toBeGreaterThanOrEqual(6);
  });

  it("should generate unique IDs", () => {
    const id1 = genId("test");
    const id2 = genId("test");
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^test_/);
  });

  it("should support WAL mode for concurrent reads", () => {
    const journalMode = db.pragma("journal_mode", { simple: true });
    expect(journalMode).toBe("wal");
  });

  it("should have foreign keys enabled", () => {
    const fk = db.pragma("foreign_keys", { simple: true });
    expect(fk).toBe(1);
  });
});

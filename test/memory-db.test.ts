import { describe, it, expect } from "vitest";
import { createMemoryDb, type SqlRow } from "@/lib/db";

// These tests pin the in-memory fallback's SQL semantics. It is the last-resort
// backend (used when PostgreSQL and file-backed SQLite are both unavailable),
// so it must not silently return wrong rows or drop writes. Previously literal
// WHERE/SET clauses (`status = 'active'`, `status = 'past_due'`) were ignored.

function seed() {
  const db = createMemoryDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, wallet_id TEXT, status TEXT, balance INTEGER, spent INTEGER);
  `);
  db.prepare(`INSERT INTO cards (id, wallet_id, status, balance, spent) VALUES (?, ?, ?, ?, ?)`)
    .run("c1", "w1", "active", 1000, 0);
  db.prepare(`INSERT INTO cards (id, wallet_id, status, balance, spent) VALUES (?, ?, ?, ?, ?)`)
    .run("c2", "w1", "frozen", 500, 0);
  return db;
}

describe("MemoryDb SQL engine", () => {
  it("filters on a literal string in WHERE", () => {
    const db = seed();
    const active = db.prepare(`SELECT * FROM cards WHERE wallet_id = ? AND status = 'active'`).all<SqlRow>("w1");
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("c1");
    // A frozen card must not match `status = 'active'`.
    expect(db.prepare(`SELECT * FROM cards WHERE id = ? AND status = 'active'`).get<SqlRow>("c2")).toBeUndefined();
  });

  it("applies a literal UPDATE SET value", () => {
    const db = seed();
    db.prepare(`UPDATE cards SET status = 'frozen' WHERE id = ?`).run("c1");
    expect(db.prepare(`SELECT * FROM cards WHERE id = ?`).get<SqlRow>("c1")?.status).toBe("frozen");
    expect(db.prepare(`SELECT * FROM cards WHERE status = 'active'`).all<SqlRow>()).toHaveLength(0);
  });

  it("applies arithmetic UPDATE SET on an existing column", () => {
    const db = seed();
    db.prepare(`UPDATE cards SET balance = balance - ?, spent = spent + ? WHERE id = ?`).run(250, 250, "c1");
    const row = db.prepare(`SELECT * FROM cards WHERE id = ?`).get<SqlRow>("c1");
    expect(row?.balance).toBe(750);
    expect(row?.spent).toBe(250);
  });

  it("applies multi-assignment SET to all rows when there is no WHERE", () => {
    const db = seed();
    const res = db.prepare(`UPDATE cards SET status = ?`).run("paused");
    expect(res.changes).toBe(2);
    expect(db.prepare(`SELECT * FROM cards WHERE status = 'paused'`).all<SqlRow>()).toHaveLength(2);
  });

  it("supports datetime('now') assignments and comparisons", () => {
    const db = createMemoryDb();
    db.exec(`CREATE TABLE IF NOT EXISTS t (id TEXT PRIMARY KEY, updated_at TEXT);`);
    db.prepare(`INSERT INTO t (id, updated_at) VALUES (?, ?)`).run("x", "2020-01-01 00:00:00");
    db.prepare(`UPDATE t SET updated_at = datetime('now') WHERE id = ?`).run("x");
    const row = db.prepare(`SELECT * FROM t WHERE id = ?`).get<SqlRow>("x");
    expect(String(row?.updated_at) > "2020-01-01 00:00:00").toBe(true);
    expect(db.prepare(`SELECT * FROM t WHERE updated_at > '2020-01-01 00:00:00'`).all<SqlRow>()).toHaveLength(1);
  });

  it("deletes rows matching a literal WHERE", () => {
    const db = seed();
    const res = db.prepare(`DELETE FROM cards WHERE status = 'frozen'`).run();
    expect(res.changes).toBe(1);
    expect(db.prepare(`SELECT * FROM cards WHERE id = ?`).get<SqlRow>("c2")).toBeUndefined();
  });

  it("supports IS NULL / IS NOT NULL and numeric comparisons", () => {
    const db = seed();
    db.prepare(`INSERT INTO cards (id, wallet_id, status, balance, spent) VALUES (?, ?, ?, ?, ?)`)
      .run("c3", "w1", null, 0, 0);
    expect(db.prepare(`SELECT * FROM cards WHERE status IS NULL`).all<SqlRow>()).toHaveLength(1);
    expect(db.prepare(`SELECT * FROM cards WHERE status IS NOT NULL`).all<SqlRow>()).toHaveLength(2);
    expect(db.prepare(`SELECT * FROM cards WHERE balance >= ?`).all<SqlRow>(500)).toHaveLength(2);
  });
});

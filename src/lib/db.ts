import { logger } from "./logger";
// ============================================================
// KIKI Agent Platform — PostgreSQL Database Layer
// Real, durable persistence via Azure Database for PostgreSQL.
// The PgDb adapter mimics the better-sqlite3 method shapes
// (prepare/get/run/all/exec) so call sites mainly just add `await`.
// ============================================================

import { Pool } from "pg";
import { hashPassword } from "./auth";

// Local fallback database (Node 24+ built-in SQLite). Used automatically when
// PostgreSQL is unreachable so `npm run dev` works with zero external setup.
// The `node:sqlite` module is imported dynamically (inside createSqliteDb) so
// that bundlers/test runners which cannot resolve the built-in do not fail at
// module-evaluation time.

// Production MUST provide DATABASE_URL (e.g. via Azure Key Vault / env).
// No credentials are hardcoded here. The fallback points at a loopback dev
// database so a missing DATABASE_URL fails fast and visibly in production
// rather than silently using weak default credentials.
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://kiki@localhost:5432/kiki?sslmode=prefer";

const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Translate better-sqlite3 "?" positional placeholders to pg "$1..$n",
// and SQLite date helpers to their PostgreSQL equivalents.
function translate(sql: string): string {
  let i = 0;
  return sql
    .replace(/\?/g, () => `$${++i}`)
    .replace(/date\('now'\)/gi, "CURRENT_DATE");
}

class PgStatement {
  constructor(private db: PgDb, private sql: string) {}

  // SQLite-only functions that we emulate via a tracked session value.
  private interceptSynthetic(): Record<string, unknown> | null {
    const norm = this.sql.toLowerCase().replace(/\s+/g, " ");
    if (norm.includes("select changes()") || norm.includes("select changes ()")) {
      const m = this.sql.match(/changes\(\)\s+as\s+([a-z0-9_]+)/i);
      const alias = m ? m[1] : "changes";
      return { [alias]: this.db.lastRowCount ?? 0 };
    }
    if (norm.includes("last_insert_rowid()")) {
      const m = this.sql.match(/last_insert_rowid\(\)\s+as\s+([a-z0-9_]+)/i);
      const alias = m ? m[1] : "last_insert_rowid";
      return { [alias]: this.db.lastInsertRowid ?? 0 };
    }
    return null;
  }

  async run(...params: any[]): Promise<{ lastInsertRowid: string | number; changes: number }> {
    const trimmed = this.sql.trim();
    let q = translate(this.sql);
    let lastInsertRowid: string | number = 0;
    let changes = 0;
    if (/^insert\s+/i.test(trimmed)) {
      if (!/\breturning\b/i.test(q)) q += " RETURNING id";
      const res = await pool.query(q, params);
      if (res.rows[0] && res.rows[0].id !== undefined) lastInsertRowid = res.rows[0].id;
      changes = res.rowCount ?? 0;
    } else {
      const res = await pool.query(q, params);
      changes = res.rowCount ?? 0;
    }
    this.db.lastRowCount = changes;
    this.db.lastInsertRowid = lastInsertRowid;
    return { lastInsertRowid, changes };
  }

  async get<T = Record<string, unknown>>(...params: any[]): Promise<T | undefined> {
    const synthetic = this.interceptSynthetic();
    if (synthetic !== null) return synthetic as T;
    const res = await pool.query(translate(this.sql), params);
    return (res.rows[0] ?? undefined) as T | undefined;
  }

  async all<T = Record<string, unknown>>(...params: any[]): Promise<T[]> {
    const synthetic = this.interceptSynthetic();
    if (synthetic !== null) return [synthetic as T];
    const res = await pool.query(translate(this.sql), params);
    return res.rows as T[];
  }
}

class PgDb {
  lastRowCount = 0;
  lastInsertRowid: string | number = 0;

  prepare(sql: string): PgStatement {
    return new PgStatement(this, sql);
  }

  async exec(sql: string): Promise<void> {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^--/.test(s));
    for (const s of statements) {
      await pool.query(s);
    }
  }

  async pragma(_name: string): Promise<any> {
    return undefined;
  }
}

// ─── SQLite fallback (node:sqlite) ───────────────────────
// Implements the same prepare/exec surface as PgDb so call sites are unaware
// which backend is active. Activated when PostgreSQL is unavailable.
type SqliteRow = Record<string, any>;

class SqliteStatement {
  constructor(private db: SqliteDb, private sql: string) {}

  run(...params: any[]): { lastInsertRowid: number; changes: number } {
    const info = this.db.raw.prepare(this.sql).run(...params);
    this.db.lastRowCount = info.changes ?? 0;
    this.db.lastInsertRowid = Number(info.lastInsertRowid ?? 0);
    return { lastInsertRowid: this.db.lastInsertRowid, changes: this.db.lastRowCount };
  }

  get(...params: any[]): any {
    return this.db.raw.prepare(this.sql).get(...params) as SqliteRow | undefined;
  }

  all(...params: any[]): any[] {
    return this.db.raw.prepare(this.sql).all(...params) as SqliteRow[];
  }
}

class SqliteDb {
  raw: any;
  lastRowCount = 0;
  lastInsertRowid: number = 0;

  constructor(raw: any) {
    this.raw = raw;
  }

  prepare(sql: string): SqliteStatement {
    return new SqliteStatement(this, sql);
  }

  exec(sql: string): void {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      // Drop leading SQL comment lines (e.g. a "-- note" placed on the same
      // `;`-delimited segment as a CREATE TABLE) so the real statement that
      // follows the comment is not accidentally discarded.
      .map((s) => s.replace(/^(\s*--[^\n]*\n)+/, "").trim())
      .filter((s) => s.length > 0);
    for (const s of statements) {
      this.raw.exec(s);
    }
  }

  async pragma(_name: string): Promise<any> {
    return undefined;
  }
}

async function createSqliteDb(): Promise<SqliteDb | MemoryDb> {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, "kiki-local.sqlite");
  let DatabaseSync: any;
  try {
    const sqliteModule = await import(/* @vite-ignore */ /* webpackIgnore: true */ "node:sqlite");
    DatabaseSync = sqliteModule.DatabaseSync;
  } catch (e) {
    logger.warn(
      "[DB] node:sqlite unavailable (" + (e as Error).message.split("\n")[0] +
      ") — using in-memory fallback. Set DATABASE_URL to enable persistent PostgreSQL."
    );
    return createMemoryDb();
  }
  // Azure Files (SMB) does not implement POSIX advisory locks correctly, so
  // SQLite's default per-transaction locking fails with "database is locked".
  // EXCLUSIVE locking mode acquires the lock once and holds it for the whole
  // connection lifetime, which works on SMB (requires a single replica/writer).
  const raw = new DatabaseSync(file, { timeout: 15000 } as never);
  for (const pragma of [
    "PRAGMA locking_mode = EXCLUSIVE;",
    "PRAGMA busy_timeout = 15000;",
    "PRAGMA journal_mode = DELETE;",
    "PRAGMA synchronous = NORMAL;",
    "PRAGMA foreign_keys = OFF;",
  ]) {
    try {
      raw.exec(pragma);
    } catch (e) {
      logger.warn("[DB] PRAGMA failed (" + pragma + "): " + (e as Error).message.split("\n")[0]);
    }
  }
  return new SqliteDb(raw);
}

// ─── In-memory fallback (no native module required) ──────
// Used when neither PostgreSQL nor node:sqlite is available. Data is lost on
// restart, but the app remains functional (auth, campaigns, etc. work in-session).
class MemoryStatement {
  constructor(private db: MemoryDb, private sql: string) {}
  private match(rows: Record<string, any>[]): Record<string, any>[] {
    return rows;
  }
  run(...params: any[]): { lastInsertRowid: number; changes: number } {
    return this.db.execStatement(this.sql, params, "run");
  }
  get(...params: any[]): any {
    const r = this.db.execStatement(this.sql, params, "get");
    return Array.isArray(r) ? r[0] : r;
  }
  all(...params: any[]): any[] {
    const r = this.db.execStatement(this.sql, params, "all");
    return Array.isArray(r) ? r : [r];
  }
}

class MemoryDb {
  lastRowCount = 0;
  lastInsertRowid: number = 0;
  tables: Record<string, Record<string, any>[]> = {};
  private seq = 0;

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql);
  }

  // Minimal SQL engine: understands CREATE TABLE, INSERT, SELECT, UPDATE,
  // DELETE, and CREATE INDEX. Enough for seeding + dashboard reads.
  exec(sql: string): void {
    const statements = sql
      .split(";")
      .map((s) => s.replace(/^(\s*--[^\n]*\n)+/, "").trim())
      .filter((s) => s.length > 0);
    for (const s of statements) this.execRaw(s);
  }

  private execRaw(s: string): void {
    const m = s.match(/^create\s+table\s+if\s+not\s+exists\s+([a-z0-9_"]+)/i);
    if (m) {
      const t = m[1].replace(/"/g, "");
      if (!this.tables[t]) this.tables[t] = [];
      return;
    }
    if (/^create\s+index/i.test(s)) return;
    if (/^insert\s+into/i.test(s)) {
      const mm = s.match(/^insert\s+into\s+([a-z0-9_"]+)\s*\((.*?)\)\s*values\s*\(([\s\S]*)\)/i);
      if (mm) {
        const t = mm[1].replace(/"/g, "");
        const cols = mm[2].split(",").map((c) => c.trim().replace(/"/g, ""));
        const vals = this.splitValues(mm[3]);
        const row: Record<string, any> = {};
        cols.forEach((c, i) => (row[c] = this.coerce(vals[i])));
        if (row.id === undefined) row.id = "mem_" + ++this.seq;
        (this.tables[t] ||= []).push(row);
      }
      return;
    }
    // Non-DDL statements are no-ops for the in-memory fallback (safe).
  }

  execStatement(sql: string, params: any[], mode: "run" | "get" | "all"): any {
    const trimmed = sql.trim().replace(/\s+/g, " ");
    const lower = trimmed.toLowerCase();

    // Strip COALESCE(expr, default) -> expr for MemoryDb simplicity
    const noCoalesce = trimmed.replace(/coalesce\s*\(([^,]+),[^)]*\)/gi, "$1");

    // Handle ORDER BY, LIMIT — ignore for in-memory (multi-pass to handle both orders)
    let noTail = noCoalesce;
    for (let i = 0; i < 3; i++) {
      noTail = noTail.replace(/\border\s+by\s+[a-z0-9_"`.,\s]+(\s+(asc|desc))?\s*$/i, "");
      noTail = noTail.replace(/\blimit\s+\d+(\s*(offset\s+\d+)?)?\s*$/i, "");
    }

    if (lower.startsWith("select")) {
      const tm = noTail.match(/from\s+([a-z0-9_"]+)/i);
      const t = tm ? tm[1].replace(/"/g, "") : "";
      let rows = (this.tables[t] || []).slice();

      // Parse WHERE clause with comparison operators
      const whereClause = noTail.match(/where\s+(.+?)$/i);
      if (whereClause) {
        const conditions = whereClause[1].split(/\s+and\s+/i);
        for (const cond of conditions) {
          // Match: column op ?  (op: =, >=, >, <=, <, !=, <>)
          const opMatch = cond.match(/^([a-z0-9_"]+)\s*(>=|<=|!=|<>|=|>|<)\s*\?$/i);
          if (opMatch) {
            const col = opMatch[1].replace(/"/g, "");
            const op = opMatch[2];
            const pv = String(params.shift() ?? "");
            rows = rows.filter((r: any) => {
              const rv = String(r[col] ?? "");
              switch (op) {
                case "=": return rv === pv;
                case ">=": return rv >= pv;
                case "<=": return rv <= pv;
                case ">": return rv > pv;
                case "<": return rv < pv;
                case "!=": case "<>": return rv !== pv;
                default: return true;
              }
            });
          }
        }
      }

      // Extract aggregate expressions (AVG, SUM, COUNT, MIN, MAX)
      interface AggExpr { alias: string; fn: string; field: string; caseWhen?: { col: string; op: string; val: string; thenVal: number; elseVal: number } }
      const aggExprs: AggExpr[] = [];
      const selectList = noTail.match(/select\s+(.+?)\s+from/i);
      if (selectList) {
        const parts = selectList[1].split(",");
        for (const part of parts) {
          const caseMatch = part.match(/(avg|sum|count|min|max)\s*\(\s*case\s+when\s+([a-z0-9_"]+)\s*(=)\s*(?:'([^']+)'|(\d+(?:\.\d+)?))\s+then\s+(\d+(?:\.\d+)?)\s+else\s+(\d+(?:\.\d+)?)\s+end\s*\)(?:\s+(?:as\s+)?([a-z0-9_]+))?/i);
          if (caseMatch) {
            const fn = caseMatch[1].toLowerCase();
            const alias = caseMatch[8] || fn;
            const caseVal = caseMatch[4] !== undefined ? caseMatch[4] : String(caseMatch[5]);
            aggExprs.push({
              alias, fn, field: caseMatch[2],
              caseWhen: { col: caseMatch[2], op: caseMatch[3], val: caseVal, thenVal: Number(caseMatch[6]), elseVal: Number(caseMatch[7]) },
            });
            continue;
          }
          const aggMatch = part.match(/(avg|sum|count|min|max)\s*\(\s*(\*|([a-z0-9_".]+))\s*\)(?:\s+(?:as\s+)?([a-z0-9_]+))?/i);
          if (aggMatch) {
            const fn = aggMatch[1].toLowerCase();
            const field = aggMatch[2] === "*" ? "*" : (aggMatch[3] || "*");
            const alias = aggMatch[4] || fn;
            aggExprs.push({ alias, fn, field });
          }
        }
      }

      // If there are aggregate functions, compute them
      if (aggExprs.length > 0) {
        const result: Record<string, any> = {};
        for (const agg of aggExprs) {
          let values: number[];
          if (agg.caseWhen) {
            values = rows.map((r: any) => {
              const rv = String(r[agg.caseWhen!.col] ?? "");
              return rv === agg.caseWhen!.val ? agg.caseWhen!.thenVal : agg.caseWhen!.elseVal;
            });
          } else if (agg.field === "*") {
            values = rows.map(() => 1);
          } else {
            values = rows.map((r: any) => Number(r[agg.field]) || 0);
          }
          if (agg.fn === "count") {
            result[agg.alias] = values.length;
          } else if (agg.fn === "sum") {
            result[agg.alias] = values.reduce((s: number, v: number) => s + v, 0);
          } else if (agg.fn === "avg") {
            result[agg.alias] = values.length > 0 ? values.reduce((s: number, v: number) => s + v, 0) / values.length : 0;
          } else if (agg.fn === "min") {
            result[agg.alias] = values.length > 0 ? Math.min(...values) : 0;
          } else if (agg.fn === "max") {
            result[agg.alias] = values.length > 0 ? Math.max(...values) : 0;
          }
        }
        if (mode === "get") return result;
        if (mode === "all") return [result];
        return result;
      }

      // Plain SELECT without aggregates — return matching rows
      if (mode === "get") return rows[0] ?? undefined;
      return rows;
    }
    if (lower.startsWith("insert")) {
      const mm = trimmed.match(/into\s+([a-z0-9_"]+)\s*\((.*?)\)\s*values\s*\(([\s\S]*)\)/i);
      if (mm) {
        const t = mm[1].replace(/"/g, "");
        const cols = mm[2].split(",").map((c) => c.trim().replace(/"/g, ""));
        const vals = this.splitValues(mm[3]);
        const row: Record<string, any> = {};
        let pIdx = 0;
        cols.forEach((c, i) => {
          const raw = vals[i];
          if (raw === "?") {
            row[c] = this.coerce(pIdx < params.length ? String(params[pIdx++]) : "NULL");
          } else {
            row[c] = this.coerce(raw);
          }
        });
        const idIdx = cols.indexOf("id");
        if (idIdx >= 0) row.id = this.coerce(vals[idIdx] === "?" && idIdx < params.length ? String(params[idIdx]) : vals[idIdx]);
        else row.id = "mem_" + ++this.seq;
        (this.tables[t] ||= []).push(row);
        this.lastInsertRowid = this.seq;
        this.lastRowCount = 1;
        return { lastInsertRowid: row.id, changes: 1 };
      }
      return { lastInsertRowid: 0, changes: 0 };
    }
    if (lower.startsWith("update")) {
      const um = trimmed.match(/update\s+([a-z0-9_"]+)\s+set\s+(.+?)(?:\s+where\s+|\s*$)/i);
      const t = um ? um[1].replace(/"/g, "") : "";
      const setClause = um ? um[2] : "";
      const setMatches = [...setClause.matchAll(/([a-z0-9_"]+)\s*=\s*\?/gi)];
      const whereCol = trimmed.match(/where\s+([a-z0-9_"]+)\s*=\s*\?/i);
      let affected = (this.tables[t] || []).length;
      if (whereCol) {
        const wc = whereCol[1].replace(/"/g, "");
        const wv = String(params[params.length - 1]);
        let pIdx = 0;
        for (const row of (this.tables[t] || [])) {
          if (String(row[wc]) === wv) {
            for (const sm of setMatches) {
              const col = sm[1].replace(/"/g, "");
              row[col] = this.coerce(String(params[pIdx++]));
            }
          }
        }
        affected = (this.tables[t] || []).filter((r: any) => String(r[wc]) === wv).length;
      } else {
        let pIdx = 0;
        for (const row of (this.tables[t] || [])) {
          for (const sm of setMatches) {
            const col = sm[1].replace(/"/g, "");
            row[col] = this.coerce(String(params[pIdx++]));
          }
        }
      }
      this.lastRowCount = affected;
      return { lastInsertRowid: 0, changes: affected };
    }
    if (lower.startsWith("delete")) {
      const dm = trimmed.match(/delete\s+from\s+([a-z0-9_"]+)(?:\s+where\s+(.+?))?$/i);
      const t = dm ? dm[1].replace(/"/g, "") : "";
      if (dm && dm[2]) {
        const whereCol = dm[2].match(/([a-z0-9_"]+)\s*=\s*\?/i);
        if (whereCol) {
          const wc = whereCol[1].replace(/"/g, "");
          const wv = String(params[0]);
          const before = (this.tables[t] || []).length;
          this.tables[t] = (this.tables[t] || []).filter((r: any) => String(r[wc]) !== wv);
          this.lastRowCount = before - (this.tables[t] || []).length;
          return { lastInsertRowid: 0, changes: this.lastRowCount };
        }
      }
      const before = (this.tables[t] || []).length;
      delete this.tables[t];
      this.lastRowCount = before;
      return { lastInsertRowid: 0, changes: before };
    }
    return mode === "all" ? [] : mode === "get" ? undefined : { lastInsertRowid: 0, changes: 0 };
  }

  async pragma(_name: string): Promise<any> {
    return undefined;
  }

  private splitValues(s: string): string[] {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "'") {
        if (q && s[i + 1] === "'") { cur += "'"; i++; continue; }
        q = !q;
      } else if (ch === "," && !q) {
        out.push(cur.trim()); cur = "";
      } else cur += ch;
    }
    if (cur.trim().length) out.push(cur.trim());
    return out;
  }

  private coerce(v: string): any {
    if (v === undefined) return null;
    const t = v.trim();
    if (t === "NULL" || t === "") return t === "" ? "" : null;
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    return t.replace(/^'|'$/g, "").replace(/''/g, "'");
  }
}

function createMemoryDb(): MemoryDb {
  return new MemoryDb();
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'advertiser',
    tenant_id TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    avatar_initials TEXT NOT NULL DEFAULT 'U',
    trial_ends_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'meta',
    status TEXT NOT NULL DEFAULT 'draft',
    roas REAL NOT NULL DEFAULT 0,
    spend REAL NOT NULL DEFAULT 0,
    budget REAL NOT NULL DEFAULT 1000,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    cpa REAL NOT NULL DEFAULT 0,
    ltv_predicted REAL NOT NULL DEFAULT 0,
    bid REAL NOT NULL DEFAULT 0,
    target_cpa REAL NOT NULL DEFAULT 0,
    target_roas REAL NOT NULL DEFAULT 4.0,
    revenue REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'paused',
    task TEXT NOT NULL DEFAULT '',
    metric TEXT NOT NULL DEFAULT '—',
    color TEXT NOT NULL DEFAULT '#005CFF',
    last_action TEXT NOT NULL DEFAULT '',
    action_count INTEGER NOT NULL DEFAULT 0,
    config TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kyc_entities (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'Corporation',
    jurisdiction TEXT NOT NULL DEFAULT '',
    verification_status TEXT NOT NULL DEFAULT 'pending',
    documents_uploaded INTEGER NOT NULL DEFAULT 0,
    documents_required INTEGER NOT NULL DEFAULT 5,
    checks_passed INTEGER NOT NULL DEFAULT 0,
    checks_failed INTEGER NOT NULL DEFAULT 0,
    next_review TEXT,
    compliance_score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kyc_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kyc_checks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    entity_id TEXT,
    check_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    check_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    campaign_id TEXT,
    platform TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_id TEXT,
    user_id TEXT,
    session_id TEXT,
    dedup_id TEXT,
    value REAL NOT NULL DEFAULT 0,
    ltv_predicted REAL NOT NULL DEFAULT 0,
    ltv_confidence REAL NOT NULL DEFAULT 0,
    enriched INTEGER NOT NULL DEFAULT 0,
    delivered INTEGER NOT NULL DEFAULT 0,
    raw_data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ltv_predictions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    signal_id TEXT NOT NULL,
    user_id TEXT,
    predicted_ltv REAL NOT NULL,
    confidence REAL NOT NULL,
    segment TEXT DEFAULT 'low',
    horizon_days INTEGER NOT NULL DEFAULT 90,
    model_version TEXT NOT NULL DEFAULT 'v1',
    factors TEXT NOT NULL DEFAULT '[]',
    features TEXT NOT NULL DEFAULT '{}',
    actual_ltv REAL,
    feedback_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT UNIQUE NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD'
  );

  CREATE TABLE IF NOT EXISTS wallet_cards (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    last4 TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT 'Visa',
    "limit" REAL NOT NULL DEFAULT 10000,
    spent REAL NOT NULL DEFAULT 0,
    campaign TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    issuer TEXT NOT NULL DEFAULT 'local',
    issuer_card_id TEXT
  );

  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    campaign TEXT,
    status TEXT NOT NULL DEFAULT 'settled',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wallet_topups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    description TEXT NOT NULL,
    payment_intent_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    link TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agent_actions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    agent_id TEXT,
    agent_type TEXT,
    action_type TEXT NOT NULL,
    input TEXT NOT NULL DEFAULT '{}',
    output TEXT NOT NULL DEFAULT '{}',
    details TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'success',
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bid_approvals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    current_bid REAL NOT NULL DEFAULT 0,
    new_bid REAL NOT NULL DEFAULT 0,
    change_percent REAL NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT '',
    confidence REAL NOT NULL DEFAULT 0,
    ltv_ratio REAL NOT NULL DEFAULT 0,
    stop_loss_triggered INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS creative_generations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'all',
    type TEXT NOT NULL DEFAULT 'bundle',
    copies_json TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    image_prompt TEXT,
    platform_formats_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS competitor_configs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    product_category TEXT NOT NULL DEFAULT 'general',
    monitored_urls_json TEXT NOT NULL DEFAULT '[]',
    price_drop_threshold REAL NOT NULL DEFAULT 15,
    last_checked_at INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS competitor_snapshots (
    id TEXT PRIMARY KEY,
    competitor_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    product_category TEXT NOT NULL,
    avg_price REAL NOT NULL DEFAULT 0,
    sample_urls_json TEXT NOT NULL DEFAULT '[]',
    captured_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fraud_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    signal_id TEXT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'low',
    description TEXT NOT NULL,
    blocked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    tags TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    tenant_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tenant_integrations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TEXT,
    config TEXT NOT NULL DEFAULT '{}',
    connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    code_verifier TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    stripe_subscription_item_id TEXT,
    stripe_price_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS usage_records (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    stripe_invoice_id TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'open',
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    line_items TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS oaas_tasks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    campaign_id TEXT,
    campaign_name TEXT,
    title TEXT NOT NULL,
    agent TEXT NOT NULL DEFAULT 'Bid Optimizer',
    type TEXT NOT NULL DEFAULT 'budget',
    status TEXT NOT NULL DEFAULT 'pending',
    expected_impact TEXT,
    confidence INTEGER NOT NULL DEFAULT 80,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ltv_models (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'staging',
    weights TEXT NOT NULL DEFAULT '{}',
    factors TEXT NOT NULL DEFAULT '[]',
    feature_importance TEXT NOT NULL DEFAULT '{}',
    sample_count INTEGER NOT NULL DEFAULT 0,
    rmse REAL NOT NULL DEFAULT 0,
    mape REAL NOT NULL DEFAULT 0,
    r2 REAL NOT NULL DEFAULT 0,
    segment_accuracy TEXT NOT NULL DEFAULT '{}',
    confidence_calibration REAL NOT NULL DEFAULT 0,
    drift_score REAL NOT NULL DEFAULT 0,
    trained_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    promoted_at TEXT,
    metadata TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS prediction_feedback (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    prediction_id TEXT NOT NULL,
    predicted_ltv REAL NOT NULL,
    actual_ltv REAL NOT NULL,
    error_pct REAL NOT NULL,
    segment_predicted TEXT NOT NULL,
    segment_actual TEXT NOT NULL,
    factors_at_prediction TEXT NOT NULL DEFAULT '[]',
    feedback_source TEXT NOT NULL DEFAULT 'wallet',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS metacognition_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    model_id TEXT,
    event_type TEXT NOT NULL,
    insight TEXT NOT NULL,
    confidence_before REAL,
    confidence_after REAL,
    action_taken TEXT,
    factors_affected TEXT NOT NULL DEFAULT '[]',
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feature_store (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    feature_value REAL NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 0,
    mean REAL,
    stddev REAL,
    min_val REAL,
    max_val REAL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Impression log for Frequency Governor
  CREATE TABLE IF NOT EXISTS impression_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    campaign_id TEXT,
    ad_id TEXT,
    placement TEXT,
    impression_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_impression_user ON impression_log(tenant_id, user_id, platform);
  CREATE INDEX IF NOT EXISTS idx_impression_time ON impression_log(tenant_id, impression_time);

  -- Campaign metrics snapshot for live polling
  CREATE TABLE IF NOT EXISTS campaign_metrics_snapshot (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    conversions REAL NOT NULL DEFAULT 0,
    conversion_value REAL NOT NULL DEFAULT 0,
    spend REAL NOT NULL DEFAULT 0,
    revenue REAL NOT NULL DEFAULT 0,
    roas REAL NOT NULL DEFAULT 0,
    cpc REAL NOT NULL DEFAULT 0,
    cpm REAL NOT NULL DEFAULT 0,
    ctr REAL NOT NULL DEFAULT 0,
    conversion_rate REAL NOT NULL DEFAULT 0,
    frequency REAL NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_metrics_campaign ON campaign_metrics_snapshot(tenant_id, platform, campaign_id);
  CREATE INDEX IF NOT EXISTS idx_metrics_time ON campaign_metrics_snapshot(tenant_id, collected_at);

  -- Customer profiles from CRM sync
  CREATE TABLE IF NOT EXISTS customer_profiles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    external_id TEXT,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spent REAL NOT NULL DEFAULT 0,
    predicted_ltv REAL NOT NULL DEFAULT 0,
    ltv_confidence REAL NOT NULL DEFAULT 0,
    ltv_segment TEXT DEFAULT 'low',
    repeat_purchase_probability REAL NOT NULL DEFAULT 0,
    first_order_at TEXT,
    last_order_at TEXT,
    average_order_value REAL NOT NULL DEFAULT 0,
    days_since_last_order INTEGER,
    churn_risk REAL NOT NULL DEFAULT 0,
    acquisition_source TEXT,
    acquisition_campaign TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    metadata TEXT NOT NULL DEFAULT '{}',
    synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_customer_tenant ON customer_profiles(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_customer_email ON customer_profiles(tenant_id, email);
  CREATE INDEX IF NOT EXISTS idx_customer_segment ON customer_profiles(tenant_id, ltv_segment);

  -- Link signals / predictions to a resolved customer profile (identity resolution)
  -- Added for the Commerce-Revenue Closed-Loop LTV feature.
  -- SQLite/Postgres are tolerant of ADD COLUMN IF NOT EXISTS via separate statements.
  -- NOTE: applied via runMigrations() guard below to remain idempotent.

  -- Realized LTV from commerce orders (ground truth for the LTV loop)
  CREATE TABLE IF NOT EXISTS commerce_connections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    shop_domain TEXT,
    api_key_encrypted TEXT,
    webhook_secret TEXT,
    last_order_at TEXT,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0,
    config TEXT NOT NULL DEFAULT '{}',
    connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_commerce_tenant ON commerce_connections(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_commerce_platform ON commerce_connections(tenant_id, platform);

  -- Audience segments for portability
  CREATE TABLE IF NOT EXISTS audience_segments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    segment_type TEXT NOT NULL DEFAULT 'ltv',
    criteria TEXT NOT NULL DEFAULT '{}',
    member_count INTEGER NOT NULL DEFAULT 0,
    last_synced_at TEXT,
    platform_mappings TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_segment_tenant ON audience_segments(tenant_id);

  -- Catalog products for ASC override
  CREATE TABLE IF NOT EXISTS catalog_products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    category TEXT,
    image_url TEXT,
    ltv_contribution REAL NOT NULL DEFAULT 0,
    cac REAL NOT NULL DEFAULT 0,
    repeat_rate REAL NOT NULL DEFAULT 0,
    margin REAL NOT NULL DEFAULT 0,
    suppressed INTEGER NOT NULL DEFAULT 0,
    suppression_reason TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_catalog_tenant ON catalog_products(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_catalog_suppressed ON catalog_products(tenant_id, suppressed);

  -- Incrementality experiments
  CREATE TABLE IF NOT EXISTS incrementality_experiments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    holdout_percentage REAL NOT NULL DEFAULT 0.10,
    treatment_conversions INTEGER NOT NULL DEFAULT 0,
    treatment_impressions INTEGER NOT NULL DEFAULT 0,
    treatment_spend REAL NOT NULL DEFAULT 0,
    treatment_revenue REAL NOT NULL DEFAULT 0,
    control_conversions INTEGER NOT NULL DEFAULT 0,
    control_impressions INTEGER NOT NULL DEFAULT 0,
    control_spend REAL NOT NULL DEFAULT 0,
    control_revenue REAL NOT NULL DEFAULT 0,
    incremental_roas REAL NOT NULL DEFAULT 0,
    incremental_conversions REAL NOT NULL DEFAULT 0,
    confidence_level REAL NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_experiment_tenant ON incrementality_experiments(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_experiment_campaign ON incrementality_experiments(tenant_id, campaign_id);

  -- Token refresh tracking
  CREATE TABLE IF NOT EXISTS token_refresh_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    integration_id TEXT NOT NULL,
    status TEXT NOT NULL,
    old_expiry TEXT,
    new_expiry TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_token_refresh ON token_refresh_log(tenant_id, platform);

  CREATE TABLE IF NOT EXISTS creatives (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    campaign_id TEXT,
    type TEXT NOT NULL DEFAULT 'headline',
    content TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'multi',
    status TEXT NOT NULL DEFAULT 'draft',
    ai_score REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_creatives_tenant ON creatives(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_creatives_campaign ON creatives(tenant_id, campaign_id);

  CREATE TABLE IF NOT EXISTS reset_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS onboarding_progress (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 1,
    completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, step_id)
  );
`;

// SQLite-compatible variant of SCHEMA for the local `node:sqlite` fallback.
// node:sqlite does not understand PostgreSQL's BIGSERIAL type, so the
// autoincrement primary keys are rewritten to SQLite's INTEGER PRIMARY KEY
// AUTOINCREMENT (otherwise CREATE TABLE fails and downstream indexes throw
// "no such table"). All other DDL is already cross-compatible.
const SQLITE_SCHEMA = SCHEMA.replace(
  /BIGSERIAL PRIMARY KEY/g,
  "INTEGER PRIMARY KEY AUTOINCREMENT"
);

// SQLite's datetime() helper, emulated in PostgreSQL. Handles 'now', modifiers
// like '-7 days' / '+10 minutes', and 'start of day' / 'start of month'.
const DATETIME_FN = `
CREATE OR REPLACE FUNCTION datetime(timestr text, mod text DEFAULT NULL)
RETURNS timestamptz AS $$
DECLARE
  ts timestamptz := CASE WHEN timestr IS NULL OR lower(timestr) = 'now' THEN NOW() ELSE timestr::timestamptz END;
  sign int := 1;
  num int;
  unit text;
BEGIN
  IF mod IS NOT NULL THEN
    IF lower(mod) = 'start of day' THEN ts := date_trunc('day', ts);
    ELSIF lower(mod) = 'start of month' THEN ts := date_trunc('month', ts);
    ELSIF lower(mod) = 'start of year' THEN ts := date_trunc('year', ts);
    ELSIF mod ~ '^[+-]?[0-9]+[ ]*(day|days|hour|hours|minute|minutes|second|seconds|week|weeks|month|months|year|years)' THEN
      IF left(mod,1) = '-' THEN sign := -1; ELSIF left(mod,1) = '+' THEN sign := 1; ELSE sign := 1; END IF;
      num := abs(regexp_replace(mod, '[^0-9]', '', 'g')::int);
      unit := (regexp_match(lower(mod), '(day|days|hour|hours|minute|minutes|second|seconds|week|weeks|month|months|year|years)'))[1];
      ts := ts + (sign * num || ' ' || unit)::interval;
    END IF;
  END IF;
  RETURN ts;
END;
$$ LANGUAGE plpgsql STABLE;
`;

// Allow TEXT timestamp columns to be compared against timestamptz
// (e.g. `created_at < datetime('now', '-7 days')`), mirroring SQLite semantics.
const PG_CASTS = `
DROP CAST IF EXISTS (text AS timestamptz);
CREATE CAST (text AS timestamptz) WITH INOUT AS IMPLICIT;
`;

async function runMigrations(db: PgDb) {
  // Revenue backfill for legacy rows (revenue defaults to 0 in schema).
  await db.exec(
    "UPDATE campaigns SET revenue = spend * roas WHERE revenue IS NULL OR revenue = 0"
  );

  // ── Commerce-Revenue Closed-Loop LTV migrations ──────────────
  // Idempotent column additions (safe for both pg and sqlite).
  const addColumnIfMissing = async (table: string, column: string, definition: string) => {
    try {
      await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch {
      // Column already exists (or not supported) — safe to ignore.
    }
  };

  await addColumnIfMissing("signals", "customer_id", "TEXT");
  await addColumnIfMissing("ltv_predictions", "customer_id", "TEXT");
  await addColumnIfMissing("users", "trial_ends_at", "TEXT");
  await addColumnIfMissing("users", "status", "TEXT NOT NULL DEFAULT 'active'");
  await addColumnIfMissing("users", "updated_at", "TEXT");
  await addColumnIfMissing("contacts", "tenant_id", "TEXT");
  await addColumnIfMissing("wallet_cards", "issuer", "TEXT NOT NULL DEFAULT 'local'");
  await addColumnIfMissing("wallet_cards", "issuer_card_id", "TEXT");
  await addColumnIfMissing("customer_profiles", "realized_ltv", "REAL NOT NULL DEFAULT 0");
  await addColumnIfMissing("customer_profiles", "realized_orders", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing("customer_profiles", "last_commerce_sync_at", "TEXT");
  await addColumnIfMissing("customer_profiles", "commerce_platform", "TEXT");
  await addColumnIfMissing("customer_profiles", "identity_hash", "TEXT");
  await addColumnIfMissing("commerce_connections", "auth_type", "TEXT NOT NULL DEFAULT 'api_key'");

  try {
    await db.exec("CREATE INDEX IF NOT EXISTS idx_signals_customer ON signals(tenant_id, customer_id)");
  } catch { /* ignore */ }
  try {
    await db.exec("CREATE INDEX IF NOT EXISTS idx_ltv_customer ON ltv_predictions(tenant_id, customer_id)");
  } catch { /* ignore */ }
  try {
    await db.exec("CREATE INDEX IF NOT EXISTS idx_customer_identity ON customer_profiles(tenant_id, identity_hash)");
  } catch { /* ignore */ }
}

async function seedIfEmpty(db: PgDb) {
  const userCount = (await db.prepare("SELECT COUNT(*) as c FROM users").get()) as { c: number };
  if (userCount.c > 0) return;

  const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, name, password, role, tenant_id, tenant_name, plan, avatar_initials, trial_ends_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  await insertUser.run("u1", "demo@keekii.net", "Demo User", hashPassword("password123"), "advertiser", "t1", "Demo Workspace", "growth", "DU", trialEnd);
  await insertUser.run("u2", "admin@keekii.net", "Admin User", hashPassword("admin123"), "superadmin", "t2", "KIKI Inc.", "enterprise", "AU", trialEnd);

  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (id, tenant_id, name, platform, status, roas, spend, budget, impressions, clicks, conversions, cpa, ltv_predicted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const campaigns = [
    ["c1", "t1", "Q4 Fitness Acquisition", "meta", "active", 4.23, 8400, 15000, 245000, 12800, 420, 20.0, 312],
    ["c2", "t1", "Retargeting - Cart Abandon", "google", "active", 6.87, 4200, 10000, 180000, 9200, 680, 6.18, 485],
    ["c3", "t1", "Brand Awareness YouTube", "youtube", "active", 2.10, 12000, 20000, 520000, 28000, 120, 100.0, 180],
    ["c4", "t1", "TikTok Gen-Z Acquisition", "tiktok", "active", 3.45, 6500, 12000, 380000, 21000, 340, 19.12, 265],
    ["c5", "t1", "LinkedIn B2B Lead Gen", "linkedin", "paused", 1.82, 3200, 8000, 45000, 2100, 45, 71.11, 520],
    ["c6", "t1", "Programmatic Display Q4", "display", "active", 2.90, 5800, 10000, 890000, 15600, 280, 20.71, 195],
    ["c7", "t1", "Snapchat Stories Campaign", "snapchat", "draft", 0, 0, 5000, 0, 0, 0, 0, 0],
    ["c8", "t1", "Pinterest Holiday Shopping", "pinterest", "completed", 5.12, 9800, 12000, 310000, 18500, 520, 18.85, 380],
  ];
  for (const c of campaigns) await insertCampaign.run(...c);

  const insertAgent = db.prepare(`
    INSERT INTO agents (id, tenant_id, name, type, status, task, metric, color, last_action, action_count, config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const agents = [
    ["a1", "t1", "Bidding Agent", "bidding", "running", "Optimizing bids across 5 active campaigns using LTV-weighted ROAS targeting", "+12.3% ROAS", "#005CFF", "Adjusted Meta bid from $2.40 to $2.18", 847, '{"model":"gpt-4o-mini","interval":300,"strategy":"ltv_weighted_roas"}'],
    ["a2", "t1", "Creative Agent", "creative", "running", "Analyzing 24 ad creatives, auto-generating variants for A/B testing", "24 variants", "#31F3C3", "Generated 3 new headline variants for Q4 Fitness", 312, '{"model":"gpt-4o","minScore":7,"autoGenerate":true}'],
    ["a3", "t1", "Smart Pacing", "pacing", "running", "Distributing $42K daily budget across time zones for optimal delivery", "98.2% pace", "#00D4AA", "Reallocated $1,200 from off-peak to prime time", 1204, '{"pacingAlgorithm":"even","dayparting":true,"timezoneAware":true}'],
    ["a4", "t1", "Signals Agent", "signals", "running", "Processing 2.4K conversion signals/hr, enriching with 90-day LTV predictions", "2.4K sig/hr", "#8B5CF6", "Enriched batch of 142 signals with LTV scores", 5621, '{"batchSize":100,"enrichmentModel":"ltv-v2","confidenceThreshold":0.7}'],
    ["a5", "t1", "SyncBrain Router", "syncbrain", "running", "Routing AI tasks across Azure OpenAI GPT-4o-mini and GPT-4o", "47 routes/min", "#F59E0B", "Routed creative analysis to GPT-4o (complex task)", 12847, '{"primaryModel":"gpt-4o-mini","fallbackModel":"gpt-4o","costThreshold":0.01}'],
    ["a6", "t1", "OaaS Optimizer", "oaas", "running", "Running 18 optimization tasks daily across budget, bidding, and creative", "18 tasks/day", "#EF4444", "Completed budget reallocation optimization", 456, '{"maxConcurrent":3,"taskTypes":["budget","bidding","creative","scheduling"]}'],
  ];
  for (const a of agents) await insertAgent.run(...a);

  const insertEntity = db.prepare("INSERT INTO kyc_entities (id, tenant_id, name, entity_type, jurisdiction, verification_status, documents_uploaded, documents_required, checks_passed, checks_failed, next_review, compliance_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  await insertEntity.run("ke1", "t1", "Acme Corp LLC", "Corporation", "Delaware, US", "verified", 5, 5, 4, 0, "2026-09-15", 100);
  await insertEntity.run("ke2", "t1", "TechVentures GmbH", "GmbH", "Berlin, Germany", "pending", 3, 6, 2, 0, null, 67);
  await insertEntity.run("ke3", "t1", "GlobalTrade Holdings", "Holding Company", "Singapore", "flagged", 4, 5, 2, 1, "2026-07-20", 55);

  const insertDoc = db.prepare("INSERT INTO kyc_documents (id, tenant_id, entity_id, name, status) VALUES (?, ?, ?, ?, ?)");
  await insertDoc.run("kd1", "t1", "ke1", "Certificate of Incorporation", "uploaded");
  await insertDoc.run("kd2", "t1", "ke1", "Board Resolution", "uploaded");
  await insertDoc.run("kd3", "t1", "ke1", "UBO Declaration", "uploaded");
  await insertDoc.run("kd4", "t1", "ke1", "Proof of Address", "uploaded");
  await insertDoc.run("kd5", "t1", "ke1", "Financial Statements (Audited)", "uploaded");
  await insertDoc.run("kd6", "t1", "ke2", "Commercial Register Extract", "uploaded");
  await insertDoc.run("kd7", "t1", "ke2", "UBO Declaration", "pending");
  await insertDoc.run("kd8", "t1", "ke2", "Tax ID Certificate", "uploaded");
  await insertDoc.run("kd9", "t1", "ke3", "Certificate of Good Standing", "missing");
  await insertDoc.run("kd10", "t1", "ke3", "Source of Funds Declaration", "uploaded");

  const insertCheck = db.prepare("INSERT INTO kyc_checks (id, tenant_id, entity_id, check_name, status, check_date) VALUES (?, ?, ?, ?, ?, ?)");
  await insertCheck.run("kc1", "t1", null, "OFAC Sanctions Screening", "passed", "2026-07-01");
  await insertCheck.run("kc2", "t1", null, "EU Sanctions List", "passed", "2026-07-01");
  await insertCheck.run("kc3", "t1", null, "PEP Screening", "passed", "2026-07-01");
  await insertCheck.run("kc4", "t1", "ke3", "Adverse Media Check", "failed", "2026-07-10");
  await insertCheck.run("kc5", "t1", null, "UBO Verification", "passed", "2026-07-05");
  await insertCheck.run("kc6", "t1", null, "Business Continuity Check", "passed", "2026-07-03");
  await insertCheck.run("kc7", "t1", null, "Source of Wealth", "pending", null);

  await db.prepare("INSERT INTO wallets (id, tenant_id, balance, currency) VALUES (?, ?, ?, ?)").run("w1", "t1", 84200, "USD");
  const insertCard = db.prepare("INSERT INTO wallet_cards (id, wallet_id, last4, brand, \"limit\", spent, campaign, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  await insertCard.run("wc1", "w1", "4892", "Visa", 15000, 8400, "Q4 Fitness", "active");
  await insertCard.run("wc2", "w1", "2341", "Mastercard", 10000, 4200, "Retargeting", "active");
  await insertCard.run("wc3", "w1", "5561", "Amex", 5000, 0, "TikTok Gen-Z", "frozen");

  const insertNotif = db.prepare("INSERT INTO notifications (id, tenant_id, user_id, severity, title, body, read, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  await insertNotif.run("n1", "t1", "u1", "success", "Bidding Agent optimized 12 bids", "Average ROAS improved by 0.3× across Meta campaigns", 0, "/dashboard/agents");
  await insertNotif.run("n2", "t1", "u1", "warning", "Budget threshold reached", "Retargeting campaign at 85% budget utilization", 0, "/dashboard/campaigns");
  await insertNotif.run("n3", "t1", "u1", "info", "LTV model updated", "Prediction accuracy improved to 94.2% on validation set", 1, "/dashboard/syncbrain");
  await insertNotif.run("n4", "t1", "u1", "critical", "Fraud alert: 127 IVT events blocked", "Estimated $4,240 in wasted spend prevented today", 0, "/dashboard/fraud");

  logger.info("[DB] Seeded database with demo data");
}

async function seedBillingIfEmpty(db: PgDb) {
  const subCount = (await db.prepare("SELECT COUNT(*) as c FROM subscriptions").get()) as { c: number };
  if (subCount.c > 0) return;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await db.prepare(`
    INSERT INTO subscriptions
    (id, tenant_id, stripe_customer_id, stripe_subscription_id, plan, status,
     current_period_start, current_period_end, cancel_at_period_end, created_at)
    VALUES (?, ?, ?, ?, 'growth', 'active', ?, ?, 0, CURRENT_TIMESTAMP)
  `).run("sub_seed_1", "t1", "cus_seed_acme", "sub_stripe_seed_acme", now.toISOString(), periodEnd.toISOString());

  const insUsage = db.prepare(`
    INSERT INTO usage_records (id, tenant_id, type, quantity, unit_cost, total_cost, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `);
  await insUsage.run("usage_seed_1", "t1", "ai_tokens", 2_400_000, 0.00003, 0, JSON.stringify({ source: "seed" }));
  await insUsage.run("usage_seed_2", "t1", "signals_sent", 380_000, 0.0006, 0, JSON.stringify({ source: "seed" }));
  await insUsage.run("usage_seed_3", "t1", "ad_spend", 42000, 0, 0, JSON.stringify({ source: "seed", campaignId: "c1" }));

  const lastStart = new Date(now.getTime() - 60 * 86400000);
  const lastEnd = new Date(now.getTime() - 30 * 86400000);
  await db.prepare(`
    INSERT INTO invoices
    (id, tenant_id, stripe_invoice_id, amount, currency, status, period_start, period_end, line_items, created_at)
    VALUES (?, ?, ?, ?, 'usd', 'paid', ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    "inv_seed_1", "t1", "in_seed_1", 2000,
    lastStart.toISOString(), lastEnd.toISOString(),
    JSON.stringify([
      { description: "Growth Plan - Monthly Subscription", amount: 2000, quantity: 1, unitPrice: 2000 },
    ])
  );

  logger.info("[DB] Seeded billing data (subscription, usage, invoice)");
}

const globalForDb = globalThis as unknown as { __kikiDb?: PgDb | SqliteDb | MemoryDb };

export async function getDb(): Promise<PgDb | SqliteDb | MemoryDb> {
  if (!globalForDb.__kikiDb) {
    let useSqlite = false;
    try {
      // Probe PostgreSQL connectivity before committing to it.
      await pool.query("SELECT 1");
    } catch (e) {
      useSqlite = true;
      logger.warn(
        "[DB] PostgreSQL unavailable (" + (e as Error).message.split("\n")[0] +
        ") — falling back to local SQLite (node:sqlite)."
      );
    }

    if (useSqlite) {
      const db = await createSqliteDb();
      db.exec(SQLITE_SCHEMA);
      await runMigrations(db as unknown as PgDb);
      if (process.env.SEED_DEMO_DATA === "true") {
        await seedIfEmpty(db as unknown as PgDb);
        await seedBillingIfEmpty(db as unknown as PgDb);
      }
      logger.info("[DB] Using local SQLite fallback at ./data/kiki-local.sqlite");
      globalForDb.__kikiDb = db as unknown as PgDb;
      return globalForDb.__kikiDb;
    }

    const db = new PgDb();
    await db.exec(SCHEMA);
    await pool.query(DATETIME_FN);
    try {
      await pool.query(PG_CASTS);
    } catch (e) {
      logger.warn("[DB] timestamp cast setup skipped:", { error: (e as Error).message });
    }
    await runMigrations(db);
    if (process.env.SEED_DEMO_DATA === "true") {
      await seedIfEmpty(db);
      await seedBillingIfEmpty(db);
    }
    globalForDb.__kikiDb = db;
  }
  return globalForDb.__kikiDb;
}

// ── Helper: generate unique ID ────────────────────────────
export function genId(prefix: string = ""): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
}

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
// No credentials are hardcoded here — the fallback is a local dev database
// without authentication. Never commit real secrets to source.
const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/kiki?sslmode=disable";

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
  private interceptSynthetic(): any | null {
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

  async get(...params: any[]): Promise<any> {
    const synthetic = this.interceptSynthetic();
    if (synthetic !== null) return synthetic;
    const res = await pool.query(translate(this.sql), params);
    return res.rows[0] ?? undefined;
  }

  async all(...params: any[]): Promise<any[]> {
    const synthetic = this.interceptSynthetic();
    if (synthetic !== null) return [synthetic];
    const res = await pool.query(translate(this.sql), params);
    return res.rows;
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
      .filter((s) => s.length > 0 && !/^--/.test(s));
    for (const s of statements) {
      this.raw.exec(s);
    }
  }

  async pragma(_name: string): Promise<any> {
    return undefined;
  }
}

async function createSqliteDb(): Promise<SqliteDb> {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, "kiki-local.sqlite");
  const { DatabaseSync } = await import("node:sqlite");
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL;");
  raw.exec("PRAGMA foreign_keys = OFF;");
  return new SqliteDb(raw);
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
    avatar_initials TEXT NOT NULL DEFAULT 'U',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
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
    status TEXT NOT NULL DEFAULT 'active'
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

  -- system_metrics holds both tenant-scoped and global rows (tenant_id IS NULL)
  ALTER TABLE system_metrics ALTER COLUMN tenant_id DROP NOT NULL;

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
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
`;

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

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, name, password, role, tenant_id, tenant_name, plan, avatar_initials)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  await insertUser.run("u1", "alex@acmecorp.com", "Alex Chen", hashPassword("password123"), "advertiser", "t1", "Acme Corp", "growth", "AC");
  await insertUser.run("u2", "admin@kiki.ai", "Admin User", hashPassword("admin123"), "superadmin", "t2", "KIKI Inc.", "enterprise", "AU");

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

  console.log("[DB] Seeded database with demo data");
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
    "inv_seed_1", "t1", "in_seed_1", 1800,
    lastStart.toISOString(), lastEnd.toISOString(),
    JSON.stringify([
      { description: "Growth Plan - Monthly Subscription", amount: 1800, quantity: 1, unitPrice: 1800 },
    ])
  );

  console.log("[DB] Seeded billing data (subscription, usage, invoice)");
}

const globalForDb = globalThis as unknown as { __kikiDb?: PgDb | SqliteDb };

export async function getDb(): Promise<PgDb | SqliteDb> {
  if (!globalForDb.__kikiDb) {
    let useSqlite = false;
    try {
      // Probe PostgreSQL connectivity before committing to it.
      await pool.query("SELECT 1");
    } catch (e) {
      useSqlite = true;
      console.warn(
        "[DB] PostgreSQL unavailable (" + (e as Error).message.split("\n")[0] +
        ") — falling back to local SQLite (node:sqlite)."
      );
    }

    if (useSqlite) {
      const db = await createSqliteDb();
      db.exec(SCHEMA);
      await runMigrations(db as unknown as PgDb);
      if (process.env.SEED_DEMO_DATA === "true") {
        await seedIfEmpty(db as unknown as PgDb);
        await seedBillingIfEmpty(db as unknown as PgDb);
      }
      console.log("[DB] Using local SQLite fallback at ./data/kiki-local.sqlite");
      globalForDb.__kikiDb = db as unknown as PgDb;
      return globalForDb.__kikiDb;
    }

    const db = new PgDb();
    await db.exec(SCHEMA);
    await pool.query(DATETIME_FN);
    try {
      await pool.query(PG_CASTS);
    } catch (e) {
      console.warn("[DB] timestamp cast setup skipped:", (e as Error).message);
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

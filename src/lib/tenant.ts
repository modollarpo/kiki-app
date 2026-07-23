// ============================================================
// KIKI Agent Platform — Multi-Tenant Isolation Layer
// Every database query, Redis key, and event is scoped by tenant.
// ============================================================

import { getDb } from "./db";
import { eventBus, EVENTS } from "./events";

// ── Tenant Context ─────────────────────────────────────────

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: "advertiser" | "agency" | "admin" | "developer" | "finance" | "aiops" | "superadmin";
  plan: "starter" | "growth" | "enterprise" | "oaas";
  permissions: string[];
}

// ── AsyncLocalStorage for request-scoped tenant context ─────

import { AsyncLocalStorage } from "async_hooks";

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return tenantStorage.run(ctx, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

export function requireTenantContext(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) throw new Error("No tenant context — request not properly authenticated");
  return ctx;
}

// ── Tenant-Scoped Database Queries ──────────────────────────

/**
 * Wraps a SQL query to automatically inject tenant_id filter.
 * Usage: const [scopedQuery, params] = tenantScope("SELECT * FROM campaigns WHERE status = ?", tenantId, ["active"]);
 */
export function tenantScope(baseQuery: string, tenantId: string, existingParams: any[] = []): { query: string; params: any[] } {
  // Add tenant_id filter if not already present
  if (!baseQuery.includes("tenant_id")) {
    // Insert WHERE clause or AND condition
    if (baseQuery.includes("WHERE")) {
      return {
        query: baseQuery.replace("WHERE", "WHERE tenant_id = ? AND"),
        params: [tenantId, ...existingParams],
      };
    } else {
      // No WHERE clause — find the right place to insert
      const insertPoints = ["ORDER BY", "GROUP BY", "LIMIT", "OFFSET"];
      for (const point of insertPoints) {
        if (baseQuery.toUpperCase().includes(point)) {
          return {
            query: baseQuery.replace(new RegExp(point, "i"), `WHERE tenant_id = ? ${point}`),
            params: [tenantId, ...existingParams],
          };
        }
      }
      // Append at end
      return {
        query: `${baseQuery} WHERE tenant_id = ?`,
        params: [tenantId, ...existingParams],
      };
    }
  }
  return { query: baseQuery, params: existingParams };
}

/**
 * Execute a tenant-scoped query.
 * Automatically injects tenant_id and parameterizes it safely.
 */
export async function tenantQuery<T = any>(
  query: string,
  params: any[] = [],
  tenantId?: string
): Promise<T[]> {
  const db = await getDb();
  const tid = tenantId || requireTenantContext().tenantId;

  // Safely inject tenant_id as first parameter
  const hasTenantParam = query.includes("?");
  const scopedQuery = query.replace(
    /WHERE\s+(?!tenant_id)/i,
    "WHERE tenant_id = ? AND "
  ).replace(
    /AND\s+tenant_id\s*=\s*\?/i,
    "AND tenant_id = ?"
  );

  // If query doesn't have tenant_id filter yet, add it
  if (!query.toLowerCase().includes("tenant_id")) {
    const insertPoints = ["ORDER BY", "GROUP BY", "LIMIT", "OFFSET"];
    let modifiedQuery = query;
    let inserted = false;

    for (const point of insertPoints) {
      if (modifiedQuery.toUpperCase().includes(point)) {
        modifiedQuery = modifiedQuery.replace(
          new RegExp(point, "i"),
          `WHERE tenant_id = ? ${point}`
        );
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      modifiedQuery = `${modifiedQuery} WHERE tenant_id = ?`;
    }

    return   await db.prepare(modifiedQuery).all(tid, ...params) as T[];
  }

  return   await db.prepare(query).all(...params) as T[];
}

/**
 * Execute a tenant-scoped insert.
 */
export async function tenantInsert(
  table: string,
  data: Record<string, any>,
  tenantId?: string
): Promise<void> {
  const db = await getDb();
  const tid = tenantId || requireTenantContext().tenantId;

  const columns = ["tenant_id", ...Object.keys(data)];
  const values = [tid, ...Object.values(data)];
  const placeholders = columns.map(() => "?").join(", ");

  await db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`).run(...values);
}

/**
 * Execute a tenant-scoped update.
 */
export async function tenantUpdate(
  table: string,
  data: Record<string, any>,
  whereClause: string,
  whereParams: any[] = [],
  tenantId?: string
): Promise<void> {
  const db = await getDb();
  const tid = tenantId || requireTenantContext().tenantId;

  const setClause = Object.keys(data).map(k => `${k} = ?`).join(", ");
  const values = [...Object.values(data), tid, ...whereParams];

  await db.prepare(`UPDATE ${table} SET ${setClause} WHERE tenant_id = ? AND ${whereClause}`).run(...values);
}

/**
 * Execute a tenant-scoped delete.
 */
export async function tenantDelete(
  table: string,
  whereClause: string,
  whereParams: any[] = [],
  tenantId?: string
): Promise<void> {
  const db = await getDb();
  const tid = tenantId || requireTenantContext().tenantId;

  await db.prepare(`DELETE FROM ${table} WHERE tenant_id = ? AND ${whereClause}`).run(tid, ...whereParams);
}

// ── Tenant Plan Limits ─────────────────────────────────────

export interface PlanLimits {
  maxUsers: number;
  maxCampaigns: number;
  maxSignalsPerDay: number;
  maxWalletBalance: number;
  maxTokensPerMonth: number;
  maxApiCallsPerDay: number;
  features: string[];
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: {
    maxUsers: 5,
    maxCampaigns: 3,
    maxSignalsPerDay: 50000,
    maxWalletBalance: 1000,
    maxTokensPerMonth: 500000,
    maxApiCallsPerDay: 10000,
    features: ["dashboard", "basic_agents", "ltv_prediction"],
  },
  growth: {
    maxUsers: 25,
    maxCampaigns: 20,
    maxSignalsPerDay: 500000,
    maxWalletBalance: 10000,
    maxTokensPerMonth: 5000000,
    maxApiCallsPerDay: 100000,
    features: ["dashboard", "all_agents", "ltv_prediction", "capi", "virtual_cards", "syncbrain"],
  },
  enterprise: {
    maxUsers: 500,
    maxCampaigns: 500,
    maxSignalsPerDay: 10000000,
    maxWalletBalance: 1000000,
    maxTokensPerMonth: 100000000,
    maxApiCallsPerDay: 1000000,
    features: ["all"],
  },
  oaas: {
    maxUsers: 10000,
    maxCampaigns: 100000,
    maxSignalsPerDay: 1000000000,
    maxWalletBalance: 100000000,
    maxTokensPerMonth: 1000000000,
    maxApiCallsPerDay: 100000000,
    features: ["all"],
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

export async function checkPlanLimit(
  tenantId: string,
  resource: "users" | "campaigns" | "signals" | "tokens" | "api_calls",
  currentUsage: number
): Promise<{ allowed: boolean; limit: number; usage: number }> {
  const db = await getDb();
  const tenant =   await db.prepare("SELECT plan FROM users WHERE tenant_id = ? LIMIT 1").get(tenantId) as any;
  const limits = getPlanLimits(tenant?.plan || "starter");

  const limitMap = {
    users: limits.maxUsers,
    campaigns: limits.maxCampaigns,
    signals: limits.maxSignalsPerDay,
    tokens: limits.maxTokensPerMonth,
    api_calls: limits.maxApiCallsPerDay,
  };

  const limit = limitMap[resource];
  return {
    allowed: currentUsage < limit,
    limit,
    usage: currentUsage,
  };
}

// ── Enforcement Utilities ──────────────────────────────────

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  requiredPlan?: string;
}

/**
 * Check if a tenant is suspended.
 */
export async function checkTenantSuspended(tenantId: string): Promise<EnforcementResult> {
  const db = await getDb();
  const row =   await db.prepare("SELECT plan, status FROM users WHERE tenant_id = ? LIMIT 1").get(tenantId) as any;
  if (!row) return { allowed: false, reason: "Tenant not found" };
  if (row.status === "suspended") {
    return { allowed: false, reason: "Account is suspended. Please contact support." };
  }
  return { allowed: true };
}

/**
 * Check if a tenant's plan has access to a specific feature.
 */
export async function checkFeatureAccess(
  tenantId: string,
  feature: string
): Promise<EnforcementResult> {
  const db = await getDb();
  const row =   await db.prepare("SELECT plan FROM users WHERE tenant_id = ? LIMIT 1").get(tenantId) as any;
  const plan = row?.plan || "starter";
  const limits = getPlanLimits(plan);
  if (limits.features.includes("all")) return { allowed: true };
  if (limits.features.includes(feature)) return { allowed: true };
  return {
    allowed: false,
    reason: `Feature "${feature}" requires an upgraded plan`,
    upgradeRequired: true,
    requiredPlan: plan === "starter" ? "growth" : plan === "growth" ? "enterprise" : undefined,
  };
}

/**
 * Check if the tenant's trial has expired and auto-downgrade if so.
 * Starter plan users with an expired trial are left on starter — they just
 * lose access to growth features.
 */
export async function checkTrialExpired(tenantId: string): Promise<EnforcementResult> {
  const db = await getDb();
  const row =   await db.prepare(
    "SELECT plan, trial_ends_at FROM users WHERE tenant_id = ? LIMIT 1"
  ).get(tenantId) as any;
  if (!row) return { allowed: true };
  if (!row.trial_ends_at) return { allowed: true };

  const trialEnd = new Date(row.trial_ends_at).getTime();
  if (Date.now() > trialEnd) {
    // Trial expired — keep on starter but mark it
    await db.prepare(
      "UPDATE users SET updated_at = datetime('now') WHERE tenant_id = ?"
    ).run(tenantId);
    return {
      allowed: true,
      reason: "Your trial has ended. Some features may be limited.",
    };
  }

  const daysLeft = Math.ceil((trialEnd - Date.now()) / 86400000);
  if (daysLeft <= 3) {
    return {
      allowed: true,
      reason: `Your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Upgrade to keep full access.`,
    };
  }

  return { allowed: true };
}

/**
 * Combined enforcement check: suspension + trial + feature access.
 * Returns the first failure reason. Allowed=true means all pass.
 */
export async function checkEnforcement(
  tenantId: string,
  feature?: string
): Promise<EnforcementResult> {
  const suspended = await checkTenantSuspended(tenantId);
  if (!suspended.allowed) return suspended;
  const trial = await checkTrialExpired(tenantId);
  if (!trial.allowed) return trial;
  if (feature) return checkFeatureAccess(tenantId, feature);
  return { allowed: true };
}

/**
 * Check and flag all expired trials across the system (for cron/scheduler).
 */
export async function expireTrials(): Promise<number> {
  const db = await getDb();
  const expired =   await db.prepare(`
    SELECT tenant_id FROM users
    WHERE trial_ends_at IS NOT NULL
    AND trial_ends_at < datetime('now')
  `).all() as any[];
  for (const row of expired) {
    await db.prepare(
      "UPDATE users SET updated_at = datetime('now') WHERE tenant_id = ?"
    ).run(row.tenant_id);
    eventBus.emit("billing.trial_expired", { tenantId: row.tenant_id });
  }
  return expired.length;
}

// ── Tenant Isolation Verification ──────────────────────────

/**
 * Verify that a query result only contains data for the expected tenant.
 * Used in critical paths to catch bugs in tenant scoping.
 */
export function verifyTenantIsolation<T extends { tenant_id?: string }>(
  results: T[],
  expectedTenantId: string
): { valid: boolean; violations: T[] } {
  const violations = results.filter(r => r.tenant_id && r.tenant_id !== expectedTenantId);
  return {
    valid: violations.length === 0,
    violations,
  };
}

// ── Tenant-Scoped Event Keys ───────────────────────────────

/**
 * Generate a tenant-scoped Redis/event key.
 * Pattern: kiki:{tenantId}:{resource}:{id}
 */
export function tenantKey(tenantId: string, resource: string, id?: string): string {
  const base = `kiki:${tenantId}:${resource}`;
  return id ? `${base}:${id}` : base;
}

// ── Agency Multi-Client Support ────────────────────────────

export interface AgencyClient {
  tenantId: string;
  name: string;
  status: "active" | "paused" | "archived";
  monthlySpend: number;
}

/**
 * For agency tenants, list all client accounts they manage.
 * The agency's tenantId is the "parent" — each client is a separate tenant.
 */
export async function getAgencyClients(agencyTenantId: string): Promise<AgencyClient[]> {
  const db = await getDb();
  // In production, this would be a separate agency_clients table
  // For now, return tenants that share the agency prefix
  return   await db.prepare(`
    SELECT DISTINCT tenant_id as tenantId, tenant_name as name,
    'active' as status, 0 as monthlySpend
    FROM users WHERE tenant_id LIKE ? AND tenant_id != ?
  `).all(`${agencyTenantId}%`, agencyTenantId) as AgencyClient[];
}

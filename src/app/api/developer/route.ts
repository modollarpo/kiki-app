export const dynamic = "force-dynamic";
import { randomBytes, createHash } from "crypto";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface UsageRow {
  type: string; count: number; total_quantity: number; total_cost: number;
}
interface MetricRow {
  metric_name: string; metric_value: number; tags: string; created_at: string;
}
interface ActionRow {
  id: string; agent_type: string; action_type: string;
  status: string; duration_ms: number; created_at: string;
}
interface ApiKeyRow {
  id: string; name: string; key_prefix: string; status: string;
  last_used_at: string | null; created_at: string;
}
interface WebhookRow {
  id: string; url: string; events: string; status: string;
  last_delivery_at: string | null; failure_count: number; created_at: string;
}

const MAX_KEYS_PER_TENANT = 20;
const MAX_WEBHOOKS_PER_TENANT = 20;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function parseEvents(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map(v => v.trim());
  }
  if (typeof value === "string") {
    return value.split(",").map(v => v.trim()).filter(Boolean);
  }
  return [];
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const tid = user.tenantId;

    const [usageRecords, systemMetrics, recentActions, apiKeys, webhooks] = await Promise.all([
      db.prepare(`
        SELECT type, COUNT(*) as count, SUM(quantity) as total_quantity,
               SUM(total_cost) as total_cost
        FROM usage_records
        WHERE tenant_id = ?
        GROUP BY type
        ORDER BY total_cost DESC
      `).all<UsageRow>(tid),
      db.prepare(`
        SELECT metric_name, metric_value, tags, created_at
        FROM system_metrics
        WHERE (tenant_id = ? OR tenant_id IS NULL)
        ORDER BY created_at DESC LIMIT 30
      `).all<MetricRow>(tid),
      db.prepare(`
        SELECT id, agent_type, action_type, status, duration_ms, created_at
        FROM agent_actions
        WHERE tenant_id = ?
        ORDER BY created_at DESC LIMIT 50
      `).all<ActionRow>(tid),
      db.prepare(`
        SELECT id, name, key_prefix, status, last_used_at, created_at
        FROM api_keys
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `).all<ApiKeyRow>(tid),
      db.prepare(`
        SELECT id, url, events, status, last_delivery_at, failure_count, created_at
        FROM webhook_endpoints
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `).all<WebhookRow>(tid),
    ]);

    const usage = usageRecords;
    const metrics = systemMetrics;
    const actions = recentActions;

    const totalApiCalls = usage.reduce((s, r) => s + r.count, 0);
    const totalCost = usage.reduce((s, r) => s + r.total_cost, 0);

    return json({
      data: {
        usage: {
          byType: usage.map((r) => ({
            type: r.type,
            count: r.count,
            totalQuantity: r.total_quantity,
            totalCost: r.total_cost,
          })),
          totalApiCalls,
          totalCost,
        },
        systemMetrics: metrics.map((m) => ({
          name: m.metric_name,
          value: m.metric_value,
          tags: m.tags,
          createdAt: m.created_at,
        })),
        recentActions: actions.map((a) => ({
          id: a.id,
          agentType: a.agent_type,
          actionType: a.action_type,
          status: a.status,
          durationMs: a.duration_ms,
          createdAt: a.created_at,
        })),
        apiKeys: apiKeys.map((k) => ({
          id: k.id,
          name: k.name,
          key: `${k.key_prefix}${"•".repeat(24)}`,
          status: k.status,
          created: k.created_at,
          lastUsed: k.last_used_at || "Never",
          calls: "—",
        })),
        webhooks: webhooks.map((w) => {
          let events: string[] = ["*"];
          try {
            events = JSON.parse(w.events);
          } catch { /* legacy */ }
          return {
            id: w.id,
            url: w.url,
            events,
            status: w.status,
            lastDelivery: w.last_delivery_at,
            failureCount: w.failure_count,
            created: w.created_at,
          };
        }),
      },
    });
  } catch (error) {
    logger.error("developer/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load developer stats", 500);
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);
  if (!["admin", "superadmin"].includes(user.role)) return jsonError("Forbidden", 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const db = await getDb();
  const action = body.action;

  if (action === "create_api_key") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return jsonError("Key name required", 400);
    if (name.length > 100) return jsonError("Key name too long", 400);

    const count = await db.prepare(
      "SELECT COUNT(*) AS c FROM api_keys WHERE tenant_id = ? AND status = 'active'"
    ).get<{ c: number }>(user.tenantId);
    if ((count?.c || 0) >= MAX_KEYS_PER_TENANT) {
      return jsonError(`Maximum of ${MAX_KEYS_PER_TENANT} active keys reached`, 400);
    }

    const secret = randomBytes(24).toString("base64url");
    const keyPrefix = "kiki_live_";
    const plain = `${keyPrefix}${secret}`;
    const id = `key_${randomBytes(8).toString("hex")}`;

    await db.prepare(`
      INSERT INTO api_keys (id, tenant_id, name, key_prefix, key_hash, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(id, user.tenantId, name, keyPrefix, hashKey(plain), user.id);

    return json({ id, name, key: plain, status: "active", created: new Date().toISOString() });
  }

  if (action === "revoke_api_key") {
    const keyId = typeof body.id === "string" ? body.id : "";
    if (!keyId) return jsonError("id required", 400);

    const existing = await db.prepare(
      "SELECT id FROM api_keys WHERE id = ? AND tenant_id = ?"
    ).get<{ id: string }>(keyId, user.tenantId);
    if (!existing) return jsonError("API key not found", 404);

    await db.prepare(
      "UPDATE api_keys SET status = 'revoked' WHERE id = ? AND tenant_id = ?"
    ).run(keyId, user.tenantId);
    return json({ id: keyId, status: "revoked" });
  }

  if (action === "delete_api_key") {
    const keyId = typeof body.id === "string" ? body.id : "";
    if (!keyId) return jsonError("id required", 400);

    const res = await db.prepare(
      "DELETE FROM api_keys WHERE id = ? AND tenant_id = ?"
    ).run(keyId, user.tenantId);
    if (!res.changes) return jsonError("API key not found", 404);
    return json({ id: keyId, deleted: true });
  }

  if (action === "create_webhook") {
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) return jsonError("Webhook URL required", 400);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return jsonError("Invalid webhook URL", 400);
    }
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
      return jsonError("Webhook URL must use HTTPS", 400);
    }

    const events = parseEvents(body.events);
    if (events.length === 0) return jsonError("Select at least one event", 400);

    const count = await db.prepare(
      "SELECT COUNT(*) AS c FROM webhook_endpoints WHERE tenant_id = ?"
    ).get<{ c: number }>(user.tenantId);
    if ((count?.c || 0) >= MAX_WEBHOOKS_PER_TENANT) {
      return jsonError(`Maximum of ${MAX_WEBHOOKS_PER_TENANT} webhooks reached`, 400);
    }

    const secret = `whsec_${randomBytes(24).toString("hex")}`;
    const id = `wh_${randomBytes(8).toString("hex")}`;

    await db.prepare(`
      INSERT INTO webhook_endpoints (id, tenant_id, url, events, secret, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(id, user.tenantId, url, JSON.stringify(events), secret);

    return json({ id, url, events, status: "active", secret });
  }

  if (action === "update_webhook") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return jsonError("id required", 400);

    const existing = await db.prepare(
      "SELECT id FROM webhook_endpoints WHERE id = ? AND tenant_id = ?"
    ).get<{ id: string }>(id, user.tenantId);
    if (!existing) return jsonError("Webhook not found", 404);

    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (typeof body.url === "string" && body.url.trim()) {
      let parsed: URL;
      try {
        parsed = new URL(body.url.trim());
      } catch {
        return jsonError("Invalid webhook URL", 400);
      }
      const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
        return jsonError("Webhook URL must use HTTPS", 400);
      }
      updates.push("url = ?");
      values.push(body.url.trim());
    }

    if (body.events !== undefined) {
      const events = parseEvents(body.events);
      if (events.length === 0) return jsonError("Select at least one event", 400);
      updates.push("events = ?");
      values.push(JSON.stringify(events));
    }

    if (body.status === "active" || body.status === "disabled") {
      updates.push("status = ?");
      values.push(body.status);
    }

    if (updates.length === 0) return jsonError("No changes supplied", 400);

    updates.push("updated_at = datetime('now')");
    values.push(id, user.tenantId);

    await db.prepare(
      `UPDATE webhook_endpoints SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
    ).run(...values);

    return json({ id, updated: true });
  }

  if (action === "rotate_webhook_secret") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return jsonError("id required", 400);

    const existing = await db.prepare(
      "SELECT id FROM webhook_endpoints WHERE id = ? AND tenant_id = ?"
    ).get<{ id: string }>(id, user.tenantId);
    if (!existing) return jsonError("Webhook not found", 404);

    const secret = `whsec_${randomBytes(24).toString("hex")}`;
    await db.prepare(
      "UPDATE webhook_endpoints SET secret = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?"
    ).run(secret, id, user.tenantId);

    return json({ id, secret });
  }

  if (action === "delete_webhook") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return jsonError("id required", 400);

    const res = await db.prepare(
      "DELETE FROM webhook_endpoints WHERE id = ? AND tenant_id = ?"
    ).run(id, user.tenantId);
    if (!res.changes) return jsonError("Webhook not found", 404);
    return json({ id, deleted: true });
  }

  return jsonError("Unknown action", 400);
}

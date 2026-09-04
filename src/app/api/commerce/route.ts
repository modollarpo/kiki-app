export const dynamic = "force-dynamic";
// ============================================================
// KIKI Agent Platform — Commerce Connections API
// GET    /api/commerce      — List tenant commerce connections
// POST   /api/commerce      — connect | disconnect | sync
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  getCommerceConnector,
  listCommerceConnectors,
  isCommercePlatformSupported,
  encryptToken,
  decryptToken,
  type CommercePlatformId,
} from "@/lib/commerce";
import { recordCommerceOrder } from "@/lib/commerce-feedback";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { logger, handleApiError } from "@/lib/logger";

interface CommerceConnectionRow {
  id: string;
  tenant_id: string;
  platform: string;
  status: string;
  shop_domain: string | null;
  api_key_encrypted: string | null;
  webhook_secret: string | null;
  last_order_at: string | null;
  total_orders: number;
  total_revenue: number;
  config: string;
  connected_at: string;
  last_sync_at: string | null;
  updated_at: string;
  auth_type: string;
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const rows = await db.prepare(`
      SELECT * FROM commerce_connections
      WHERE tenant_id = ?
      ORDER BY connected_at DESC
    `).all(user.tenantId) as CommerceConnectionRow[];

    const catalog = listCommerceConnectors();
    const catalogByName = new Map(catalog.map((c) => [c.platformId, c]));

    const connections = rows.map((row) => ({
      id: row.id,
      platform: row.platform,
      platformName: catalogByName.get(row.platform as CommercePlatformId)?.name ?? row.platform,
      status: row.status,
      shopDomain: row.shop_domain,
      authType: row.auth_type,
      totalOrders: row.total_orders,
      totalRevenue: row.total_revenue,
      lastSyncAt: row.last_sync_at,
      lastOrderAt: row.last_order_at,
      connectedAt: row.connected_at,
    }));

    return NextResponse.json({
      ok: true,
      data: { connections, available: catalog },
    });
  } catch (error) {
    return handleApiError(error, "commerce/GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const enf = await checkEnforcement(user.tenantId);
    if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

    const body = (await req.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    switch (action) {
      case "connect":
        return await handleConnect(user.tenantId, body);
      case "disconnect":
        return await handleDisconnect(user.tenantId, body);
      case "sync":
        return await handleSync(user.tenantId, body);
      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error, "commerce/POST");
  }
}

async function handleConnect(
  tenantId: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const platform = typeof body.platform === "string" ? body.platform : "";
  const apiKey = typeof body.apiKey === "string" ? body.apiKey : "";
  const shopDomain = typeof body.shopDomain === "string" ? body.shopDomain : undefined;
  const webhookSecret = typeof body.webhookSecret === "string" ? body.webhookSecret : undefined;

  if (!isCommercePlatformSupported(platform)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported commerce platform: ${platform}` },
      { status: 400 }
    );
  }
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "apiKey required" },
      { status: 400 }
    );
  }

  const connector = getCommerceConnector(platform as CommercePlatformId);
  const encryptedKey = encryptToken(apiKey);

  const db = await getDb();
  const existing = await db.prepare(`
    SELECT id FROM commerce_connections WHERE tenant_id = ? AND platform = ?
  `).get(tenantId, platform) as { id: string } | undefined;

  const id = existing?.id ?? `cc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (existing) {
    await db.prepare(`
      UPDATE commerce_connections
      SET status = 'active',
          api_key_encrypted = ?,
          shop_domain = COALESCE(?, shop_domain),
          webhook_secret = COALESCE(?, webhook_secret),
          auth_type = ?,
          connected_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(encryptedKey, shopDomain ?? null, webhookSecret ?? null, connector.authType, id);
  } else {
    await db.prepare(`
      INSERT INTO commerce_connections
      (id, tenant_id, platform, status, shop_domain, api_key_encrypted, webhook_secret,
       auth_type, config, connected_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?, ?, '{}', datetime('now'), datetime('now'))
    `).run(
      id,
      tenantId,
      platform,
      shopDomain ?? null,
      encryptedKey,
      webhookSecret ?? null,
      connector.authType
    );
  }

  logger.info("Commerce connection established", { tenantId, platform, id });
  return NextResponse.json({
    ok: true,
    data: { connectionId: id, platform, authType: connector.authType },
  });
}

async function handleDisconnect(
  tenantId: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const connectionId = typeof body.connectionId === "string" ? body.connectionId : "";
  if (!connectionId) {
    return NextResponse.json(
      { ok: false, error: "connectionId required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const res = await db.prepare(`
    UPDATE commerce_connections
    SET status = 'revoked', updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).run(connectionId, tenantId);

  if (res.changes === 0) {
    return NextResponse.json(
      { ok: false, error: "Connection not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, message: "disconnected" });
}

async function handleSync(
  tenantId: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const connectionId = typeof body.connectionId === "string" ? body.connectionId : "";
  if (!connectionId) {
    return NextResponse.json(
      { ok: false, error: "connectionId required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const row = await db.prepare(`
    SELECT * FROM commerce_connections
    WHERE id = ? AND tenant_id = ? AND status = 'active'
  `).get(connectionId, tenantId) as CommerceConnectionRow | undefined;

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Active connection not found" },
      { status: 404 }
    );
  }

  const platform = row.platform as CommercePlatformId;
  const connector = getCommerceConnector(platform);
  const apiKey = decryptToken(row.api_key_encrypted ?? "");

  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const orders = await connector.fetchOrders(apiKey, row.shop_domain ?? undefined, since, 250);
  const customers = await connector.fetchCustomers(apiKey, row.shop_domain ?? undefined, 250);

  let syncedOrders = 0;
  let totalRevenue = 0;
  let lastOrderAt: string | null = row.last_order_at;

  for (const order of orders) {
    await recordCommerceOrder(tenantId, order);
    syncedOrders++;
    if (order.total > 0 && order.refunded !== true) {
      totalRevenue += order.total;
      if (!lastOrderAt || order.createdAt > lastOrderAt) {
        lastOrderAt = order.createdAt;
      }
    }
  }

  await db.prepare(`
    UPDATE commerce_connections
    SET total_orders = total_orders + ?,
        total_revenue = total_revenue + ?,
        last_order_at = COALESCE(?, last_order_at),
        last_sync_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(syncedOrders, totalRevenue, lastOrderAt, connectionId);

  logger.info("Commerce sync completed", {
    tenantId,
    platform,
    syncedOrders,
    customers: customers.length,
  });

  return NextResponse.json({
    ok: true,
    data: {
      syncedOrders,
      syncedCustomers: customers.length,
      totalRevenue,
      lastOrderAt,
    },
  });
}

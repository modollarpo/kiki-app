import { logger } from "./logger";
// ============================================================
// KIKI Agent Platform — Platform Sync Service
// Pulls real campaign data from connected platforms
// ============================================================

import { getDb } from "./db";
import { getConnector, isPlatformSupported } from "./connectors";
import { type PlatformId } from "./connectors/types";
import { decryptToken } from "./connectors/base";
import { eventBus } from "./events";

// ── Sync Single Platform ───────────────────────────────────

export async function syncPlatformCampaigns(tenantId: string, platform: string): Promise<{
  synced: number;
  error?: string;
}> {
  if (!(await isPlatformSupported(platform))) {
    return { synced: 0, error: `Platform '${platform}' not supported` };
  }

  const db = await getDb();

  // Get integration
  const integration = await db.prepare(`
    SELECT * FROM tenant_integrations
    WHERE tenant_id = ? AND platform = ? AND status = 'active'
  `).get(tenantId, platform) as any;

  if (!integration) {
    return { synced: 0, error: `No active integration for ${platform}` };
  }

  try {
    const connector = await getConnector(platform as PlatformId);
    const accessToken = await decryptToken(integration.access_token);

    // Fetch campaigns from platform (returns PlatformApiResponse wrapper)
    const response = await connector.listCampaigns(accessToken, "");
    const platformCampaigns = response.data || [];
    const campaignConfig = JSON.parse(integration.config || "{}");

    let synced = 0;

    for (const pc of platformCampaigns) {
      // Get metrics for this campaign
      const metricsResponse = await connector.getCampaignMetrics(accessToken, pc.id, {
        start: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
        end: new Date().toISOString().split("T")[0],
      });
      const metrics = metricsResponse.data;

      // Check if we already track this campaign
      const existing = await db.prepare(`
        SELECT id FROM campaigns WHERE tenant_id = ? AND platform = ? AND name = ?
      `).get(tenantId, platform, pc.name) as any;

      if (existing) {
        // Update existing campaign with latest metrics
        await db.prepare(`
          UPDATE campaigns SET
            spend = ?,
            conversions = ?,
            revenue = ?,
            updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ?
        `).run(
          metrics?.spend || 0,
          metrics?.conversions || 0,
          metrics?.revenue || 0,
          existing.id,
          tenantId
        );
        synced++;
      } else {
        // Import new campaign from platform
        const campaignId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        await db.prepare(`
          INSERT INTO campaigns (id, tenant_id, name, platform, status, budget, bid, spend, conversions, revenue, target_cpa, target_roas, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          campaignId,
          tenantId,
          pc.name,
          platform,
          pc.status === "active" ? "active" : "paused",
          (metrics?.spend || 0) * 30, // Estimate monthly budget from daily spend
          metrics?.cpc || 50,
          metrics?.spend || 0,
          metrics?.conversions || 0,
          metrics?.revenue || 0,
          metrics?.cpc || 50,
          metrics?.roas || 4.0
        );

        // Track the mapping in config
        campaignConfig.campaignIds = campaignConfig.campaignIds || {};
        campaignConfig.campaignIds[campaignId] = pc.id;

        synced++;
      }
    }

    // Update config with mappings
    await db.prepare(`
      UPDATE tenant_integrations SET config = ? WHERE id = ?
    `).run(JSON.stringify(campaignConfig), integration.id);

    // Log sync event
    await db.prepare(`
      INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
      VALUES (?, 'platform.sync_complete', ?, ?, datetime('now'))
    `).run(tenantId, synced, JSON.stringify({ platform, campaignCount: synced }));

    return { synced };
  } catch (e) {
    await db.prepare(`
      INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
      VALUES (?, 'platform.sync_error', 1, ?, datetime('now'))
    `).run(tenantId, JSON.stringify({ platform, error: String(e) }));

    return { synced: 0, error: String(e) };
  }
}

// ── Sync All Connected Platforms ───────────────────────────

export async function syncAllPlatforms(tenantId: string): Promise<Record<string, number>> {
  const db = await getDb();
  const integrations = await db.prepare(`
    SELECT platform FROM tenant_integrations WHERE tenant_id = ? AND status = 'active'
  `).all(tenantId) as Array<{ platform: string }>;

  const results: Record<string, number> = {};

  for (const { platform } of integrations) {
    const result = await syncPlatformCampaigns(tenantId, platform);
    results[platform] = result.synced;
  }

  return results;
}

// ── Get Sync Status ────────────────────────────────────────

export async function getSyncStatus(tenantId: string): Promise<Array<{
  platform: string;
  status: string;
  lastSync: string | null;
  campaignCount: number;
}>> {
  const db = await getDb();

  const integrations = await db.prepare(`
    SELECT platform, status, config, updated_at FROM tenant_integrations
    WHERE tenant_id = ?
  `).all(tenantId) as any[];

  return integrations.map(integ => {
    const config = JSON.parse(integ.config || "{}");
    const campaignIds = config.campaignIds || {};
    const campaignCount = Object.keys(campaignIds).length;

    return {
      platform: integ.platform,
      status: integ.status,
      lastSync: integ.updated_at,
      campaignCount,
    };
  });
}

// ── Auto-Sync Scheduler ────────────────────────────────────

let syncInterval: NodeJS.Timeout | null = null;

export function startAutoSync(intervalMs: number = 300000): void { // Default: 5 minutes
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    try {
      const db = await getDb();
      const tenants = await db.prepare(`
        SELECT DISTINCT tenant_id FROM tenant_integrations WHERE status = 'active'
      `).all() as Array<{ tenant_id: string }>;

      for (const { tenant_id } of tenants) {
        await syncAllPlatforms(tenant_id);
      }
    } catch (e) {
      // Silent fail for auto-sync
    }
  }, intervalMs);

  logger.info(`[PlatformSync] Auto-sync started (interval: ${intervalMs} ms)`);
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

import { getDb } from "./db";
import { logger } from "./logger";

export interface FrequencyConfig {
  maxFrequencyPerUser: number;
  windowHours: number;
  throttlePercentage: number;
  action: "pause" | "throttle" | "notify";
}

const DEFAULT_CONFIG: FrequencyConfig = {
  maxFrequencyPerUser: 5,
  windowHours: 72,
  throttlePercentage: 50,
  action: "throttle",
};

export async function logImpression(
  tenantId: string,
  userId: string,
  platform: string,
  campaignId: string,
  adId?: string,
  placement?: string
): Promise<void> {
  const db = await getDb();
  await db.prepare(`
    INSERT INTO impression_log (tenant_id, user_id, platform, campaign_id, ad_id, placement)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tenantId, userId, platform, campaignId, adId || null, placement || null);
}

export async function getUserFrequency(
  tenantId: string,
  userId: string,
  platform: string,
  windowHours: number = 72
): Promise<{ totalImpressions: number; uniqueCampaigns: number; placements: Record<string, number> }> {
  const db = await getDb();
  const windowStart = new Date(Date.now() - windowHours * 3600000).toISOString();

  const rows = await db.prepare(`
    SELECT campaign_id, placement, COUNT(*) as cnt
    FROM impression_log
    WHERE tenant_id = ? AND user_id = ? AND platform = ? AND impression_time >= ?
    GROUP BY campaign_id, placement
  `).all(tenantId, userId, platform, windowStart) as Array<{
    campaign_id: string; placement: string; cnt: number;
  }>;

  let totalImpressions = 0;
  const campaigns = new Set<string>();
  const placements: Record<string, number> = {};

  for (const row of rows) {
    totalImpressions += row.cnt;
    campaigns.add(row.campaign_id);
    const p = row.placement || "unknown";
    placements[p] = (placements[p] || 0) + row.cnt;
  }

  return { totalImpressions, uniqueCampaigns: campaigns.size, placements };
}

export async function checkFrequencyGovernor(
  tenantId: string,
  config: Partial<FrequencyConfig> = {}
): Promise<{
  throttledUsers: number;
  pausedCampaigns: string[];
  notifications: Array<{ userId: string; frequency: number; campaignId: string }>;
}> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const db = await getDb();
  const windowStart = new Date(Date.now() - cfg.windowHours * 3600000).toISOString();

  // Find users exceeding frequency cap
  const overExposed = await db.prepare(`
    SELECT user_id, campaign_id, COUNT(*) as impression_count
    FROM impression_log
    WHERE tenant_id = ? AND impression_time >= ?
    GROUP BY user_id, campaign_id
    HAVING COUNT(*) > ?
    ORDER BY impression_count DESC
  `).all(tenantId, windowStart, cfg.maxFrequencyPerUser) as Array<{
    user_id: string; campaign_id: string; impression_count: number;
  }>;

  let throttledUsers = 0;
  const pausedCampaigns: string[] = [];
  const notifications: Array<{ userId: string; frequency: number; campaignId: string }> = [];

  for (const row of overExposed) {
    notifications.push({
      userId: row.user_id,
      frequency: row.impression_count,
      campaignId: row.campaign_id,
    });

    if (cfg.action === "pause" && !pausedCampaigns.includes(row.campaign_id)) {
      // Pause the campaign on the platform
      try {
        const { getConnector } = await import("./connectors");
        const { decryptToken } = await import("./connectors/base");
        const integration = await db.prepare(`
          SELECT platform, access_token FROM tenant_integrations
          WHERE tenant_id = ? AND status = 'active' LIMIT 1
        `).get(tenantId) as { platform: string; access_token: string } | undefined;

        if (integration) {
          const connector = await getConnector(integration.platform as any);
          if (connector?.pauseCampaign) {
            await connector.pauseCampaign(integration.access_token, row.campaign_id);
            pausedCampaigns.push(row.campaign_id);
          }
        }
      } catch (error) {
        logger.error(`Failed to pause campaign ${row.campaign_id}`, { error: String(error) });
      }
    }

    throttledUsers++;
  }

  if (throttledUsers > 0) {
    logger.info(`Frequency Governor: ${throttledUsers} users over cap`, {
      tenantId,
      pausedCampaigns: pausedCampaigns.length,
    });
  }

  return { throttledUsers, pausedCampaigns, notifications };
}

export async function getFrequencyStats(
  tenantId: string,
  platform?: string
): Promise<{
  totalImpressions: number;
  uniqueUsers: number;
  avgFrequency: number;
  topOverExposed: Array<{ userId: string; impressions: number }>;
}> {
  const db = await getDb();
  const windowStart = new Date(Date.now() - 72 * 3600000).toISOString();

  const platformFilter = platform ? "AND platform = ?" : "";
  const params = platform ? [tenantId, windowStart, platform] : [tenantId, windowStart];

  const stats = await db.prepare(`
    SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as unique_users,
           CAST(COUNT(*) AS REAL) / MAX(COUNT(DISTINCT user_id), 1) as avg_freq
    FROM impression_log
    WHERE tenant_id = ? AND impression_time >= ? ${platformFilter}
  `).get(...params) as { total: number; unique_users: number; avg_freq: number };

  const topOverExposed = await db.prepare(`
    SELECT user_id, COUNT(*) as impressions
    FROM impression_log
    WHERE tenant_id = ? AND impression_time >= ? ${platformFilter}
    GROUP BY user_id
    ORDER BY impressions DESC
    LIMIT 10
  `).all(...params) as Array<{ user_id: string; impressions: number }>;

  return {
    totalImpressions: stats.total,
    uniqueUsers: stats.unique_users,
    avgFrequency: stats.avg_freq,
    topOverExposed: topOverExposed.map(r => ({ userId: r.user_id, impressions: r.impressions })),
  };
}

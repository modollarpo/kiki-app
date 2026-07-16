import { getDb } from "./db";
import { logger } from "./logger";

export async function collectCampaignMetrics(): Promise<number> {
  const db = await getDb();
  const integrations = await db.prepare(`
    SELECT ti.id, ti.tenant_id, ti.platform, ti.access_token
    FROM tenant_integrations ti
    WHERE ti.status = 'active'
  `).all() as Array<{ id: string; tenant_id: string; platform: string; access_token: string }>;

  let collected = 0;
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  for (const integ of integrations) {
    try {
      const { getConnector } = await import("./connectors");
      const { decryptToken } = await import("./connectors/base");
      const connector = await getConnector(integ.platform as any);
      if (!connector) continue;

      const accessToken = integ.access_token;
      const campaigns = await connector.listCampaigns!(accessToken, integ.tenant_id);
      if (!campaigns.success || !campaigns.data) continue;

      for (const campaign of campaigns.data) {
        const metrics = await connector.getCampaignMetrics(accessToken, campaign.id, {
          start: startDate,
          end: endDate,
        });

        if (!metrics.success || !metrics.data) continue;

        const m = metrics.data;
        await db.prepare(`
          INSERT INTO campaign_metrics_snapshot
          (tenant_id, platform, campaign_id, impressions, clicks, conversions, conversion_value,
           spend, revenue, roas, cpc, cpm, ctr, conversion_rate, frequency, reach,
           period_start, period_end, collected_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          integ.tenant_id, integ.platform, campaign.id,
          m.impressions, m.clicks, m.conversions, m.conversionValue,
          m.spend, m.revenue, m.roas, m.cpc, m.cpm, m.ctr, m.conversionRate,
          m.frequency, m.reach, m.period.start, m.period.end
        );

        // Update campaign table with latest metrics
        await db.prepare(`
          UPDATE campaigns SET
            impressions = ?, clicks = ?, conversions = ?, spend = ?, roas = ?,
            cpa = CASE WHEN ? > 0 THEN ? / ? ELSE cpa END,
            revenue = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND tenant_id = ?
        `).run(
          m.impressions, m.clicks, m.conversions, m.spend, m.roas,
          m.conversions, m.spend, m.conversions,
          m.revenue, campaign.id, integ.tenant_id
        );

        collected++;
      }
    } catch (error) {
      logger.error(`Metrics collection failed for ${integ.platform}`, {
        tenantId: integ.tenant_id,
        platform: integ.platform,
        error: String(error),
      });
    }
  }

  if (collected > 0) {
    logger.info(`Collected metrics for ${collected} campaigns`);
  }
  return collected;
}

export async function getLatestMetrics(
  tenantId: string,
  campaignId?: string
): Promise<Array<Record<string, any>>> {
  const db = await getDb();
  if (campaignId) {
    return await db.prepare(`
      SELECT * FROM campaign_metrics_snapshot
      WHERE tenant_id = ? AND campaign_id = ?
      ORDER BY collected_at DESC LIMIT 1
    `).all(tenantId, campaignId) as any[];
  }
  return await db.prepare(`
    SELECT DISTINCT ON (campaign_id) *
    FROM campaign_metrics_snapshot
    WHERE tenant_id = ?
    ORDER BY campaign_id, collected_at DESC
  `).all(tenantId) as any[];
}

import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();

  // Get campaigns grouped by platform with aggregated stats
  const platformStats = await db.prepare(`
    SELECT
      platform,
      COUNT(*) as campaign_count,
      SUM(spend) as total_spend,
      SUM(budget) as total_budget,
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      SUM(conversions) as total_conversions,
      AVG(roas) as avg_roas,
      AVG(cpa) as avg_cpa
    FROM campaigns
    WHERE tenant_id = ?
    GROUP BY platform
    ORDER BY total_spend DESC
  `).all(user.tenantId) as any[];

  // Get campaign details per platform
  const campaigns = await db.prepare(`
    SELECT id, name, platform, status, roas, spend, budget, conversions, cpa
    FROM campaigns
    WHERE tenant_id = ?
    ORDER BY spend DESC
  `).all(user.tenantId) as any[];

  // Group campaigns by platform
  const platformCampaigns: Record<string, any[]> = {};
  for (const c of campaigns) {
    if (!platformCampaigns[c.platform]) platformCampaigns[c.platform] = [];
    platformCampaigns[c.platform].push(c);
  }

  return json({
    platforms: platformStats.map((p: any) => ({
      name: p.platform,
      campaignCount: p.campaign_count,
      totalSpend: p.total_spend,
      totalBudget: p.total_budget,
      totalImpressions: p.total_impressions,
      totalClicks: p.total_clicks,
      totalConversions: p.total_conversions,
      avgRoas: p.avg_roas,
      avgCpa: p.avg_cpa,
      campaigns: platformCampaigns[p.platform] || [],
    })),
    summary: {
      totalPlatforms: platformStats.length,
      totalCampaigns: campaigns.length,
      totalSpend: platformStats.reduce((sum: number, p: any) => sum + (p.total_spend || 0), 0),
    },
  });
}

export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";

interface PlatformStatRow {
  platform: string;
  campaign_count: number;
  total_spend: number;
  total_budget: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_roas: number;
  avg_cpa: number;
}

interface CampaignAgencyRow {
  id: string;
  name: string;
  platform: string;
  status: string;
  roas: number;
  spend: number;
  budget: number;
  conversions: number;
  cpa: number;
}

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
  `).all<PlatformStatRow>(user.tenantId);

  // Get campaign details per platform
  const campaigns = await db.prepare(`
    SELECT id, name, platform, status, roas, spend, budget, conversions, cpa
    FROM campaigns
    WHERE tenant_id = ?
    ORDER BY spend DESC
  `).all<CampaignAgencyRow>(user.tenantId);

  // Group campaigns by platform
  const platformCampaigns: Record<string, CampaignAgencyRow[]> = {};
  for (const c of campaigns) {
    if (!platformCampaigns[c.platform]) platformCampaigns[c.platform] = [];
    platformCampaigns[c.platform].push(c);
  }

  return json({
    platforms: platformStats.map((p) => ({
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
      totalSpend: platformStats.reduce((sum: number, p) => sum + (p.total_spend || 0), 0),
    },
  });
}

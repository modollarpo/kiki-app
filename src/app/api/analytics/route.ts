export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();

const campaigns = await db.prepare(`
    SELECT platform, roas, spend, budget, impressions, clicks, conversions, cpa, revenue
    FROM campaigns WHERE tenant_id = ?
  `).all(user.tenantId) as any[];

  if (campaigns.length === 0) {
    return json({
      channels: [],
      funnel: [],
      weeklyRoas: [],
      attribution: [],
      totals: { blendedRoas: 0, totalConversions: 0, blendedCpa: 0, totalSpend: 0 },
    });
  }

  // Aggregate by platform
  const byPlatform = new Map<string, any>();
  for (const c of campaigns) {
    if (!byPlatform.has(c.platform)) {
      byPlatform.set(c.platform, { name: c.platform, roas: 0, spend: 0, conversions: 0, cpa: 0, revenue: 0, count: 0 });
    }
    const p = byPlatform.get(c.platform);
    p.count++;
    p.spend += c.spend || 0;
    p.conversions += c.conversions || 0;
    p.cpa += c.cpa || 0;
    p.revenue += c.revenue || 0;
  }

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);

  const channels = Array.from(byPlatform.values()).map(p => ({
    name: p.name.charAt(0).toUpperCase() + p.name.slice(1) + " Ads",
    roas: p.spend > 0 ? Number((p.revenue / p.spend).toFixed(2)) : 0,
    cpa: p.conversions > 0 ? Number((p.spend / p.conversions).toFixed(2)) : 0,
    conversions: p.conversions,
    spend: p.spend,
    share: totalSpend > 0 ? p.spend / totalSpend : 0,
  })).sort((a, b) => b.spend - a.spend);

  const blendedRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;
  const blendedCpa = totalConversions > 0 ? Number((totalSpend / totalConversions).toFixed(2)) : 0;

  // Funnel stages we actually measure: impressions → clicks → conversions.
  // (Leads/Qualified are not tracked, so they are not shown.)
  const funnel = [
    { stage: "Impressions", value: totalImpressions, pct: 100 },
    { stage: "Clicks", value: totalClicks, pct: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0 },
    { stage: "Conversions", value: totalConversions, pct: totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0 },
  ];

  // Weekly ROAS derived from real campaign spend/revenue
  const weeklyData = await db.prepare(`
    SELECT strftime('%W', created_at) as week, SUM(spend) as spend, SUM(revenue) as revenue
    FROM campaigns WHERE tenant_id = ? AND created_at >= datetime('now', '-7 weeks')
    GROUP BY week ORDER BY week
  `).all(user.tenantId) as any[];
  const weeklyRoas = weeklyData.length > 0
    ? weeklyData.map((w: any) => Number((w.spend > 0 ? (w.revenue / w.spend) : blendedRoas).toFixed(2)))
    : [blendedRoas];

  // Attribution split from real platform data
  const attribution = channels.map((ch: any, i: number) => {
    const colors = ["blue", "teal", "mint", "gold", "oaas"];
    return {
      model: ch.name + " Attribution",
      conversions: ch.conversions,
      share: totalConversions > 0 ? ((ch.conversions / totalConversions) * 100).toFixed(1) + "%" : "0%",
      c: colors[i % colors.length],
    };
  });

  return json({
    channels,
    funnel,
    weeklyRoas,
    attribution,
    totals: {
      blendedRoas,
      totalConversions,
      blendedCpa,
      totalSpend,
    },
  });
}

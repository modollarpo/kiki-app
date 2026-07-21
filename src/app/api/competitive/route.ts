export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const tenantId = user.tenantId;

    // Get our campaign performance
    const ourCampaigns = await db.prepare(`
      SELECT platform, spend, conversions, revenue, roas, cpa
      FROM campaigns WHERE tenant_id = ?
    `).all(tenantId) as any[];

    // Aggregate by platform
    const platformMetrics: Record<string, any> = {};
    for (const c of ourCampaigns) {
      const p = c.platform || "unknown";
      if (!platformMetrics[p]) platformMetrics[p] = { spend: 0, conversions: 0, revenue: 0, count: 0 };
      platformMetrics[p].spend += c.spend || 0;
      platformMetrics[p].conversions += c.conversions || 0;
      platformMetrics[p].revenue += c.revenue || 0;
      platformMetrics[p].count++;
    }

    // Calculate industry benchmarks from our data (in production, this would come from external API)
    const totalSpend = ourCampaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalRevenue = ourCampaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Build platform comparison from real data
    const platforms = Object.entries(platformMetrics).map(([name, data]: [string, any]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      spend: data.spend,
      roas: data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0,
      conversions: data.conversions,
      cpa: data.conversions > 0 ? Math.round(data.spend / data.conversions * 100) / 100 : 0,
      trend: data.revenue > data.spend ? "positive" : "negative",
    }));

    // Get recent signal data for trend analysis
    const recentSignals = await db.prepare(`
      SELECT platform, COUNT(*) as count, AVG(value) as avg_value
      FROM signals WHERE tenant_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY platform
    `).all(tenantId) as any[];

    // Compute CPM benchmarks from campaign data
    const allCampaigns = await db.prepare(`
      SELECT platform, spend, impressions FROM campaigns WHERE tenant_id = ?
    `).all(tenantId) as any[];

    const platformCpm: Record<string, { spend: number; impressions: number }> = {};
    for (const c of allCampaigns) {
      const p = c.platform || "unknown";
      if (!platformCpm[p]) platformCpm[p] = { spend: 0, impressions: 0 };
      platformCpm[p].spend += c.spend || 0;
      platformCpm[p].impressions += c.impressions || 0;
    }

    const cpmBenchmarks = Object.entries(platformCpm)
      .filter(([, data]) => data.impressions > 0)
      .map(([platform, data]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        yours: Math.round((data.spend / data.impressions) * 1000 * 100) / 100,
        benchmark: 0,
        industry: 0,
      }));

    return NextResponse.json({
      success: true,
      data: {
        platforms,
        ourPerformance: {
          totalSpend,
          totalRevenue,
          avgRoas: Math.round(avgRoas * 100) / 100,
          totalCampaigns: ourCampaigns.length,
        },
        signalTrends: recentSignals.map(s => ({
          platform: s.platform,
          volume: s.count,
          avgValue: Math.round(s.avg_value || 0),
        })),
        cpmBenchmarks,
        note: "Competitor data requires external intelligence API integration",
      },
    });
  } catch (error) {
    logger.error("competitive/handler", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

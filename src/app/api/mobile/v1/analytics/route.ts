// GET /api/mobile/v1/analytics
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    const db = await getDb();
    const tenantId = auth.tenantId;

    // Determine date range
    let dateFilter = "date('now', '-30 days')";
    switch (range) {
      case '7d': dateFilter = "date('now', '-7 days')"; break;
      case '30d': dateFilter = "date('now', '-30 days')"; break;
      case '90d': dateFilter = "date('now', '-90 days')"; break;
      case 'all': dateFilter = "date('2000-01-01')"; break;
    }

    // Get campaigns for this tenant
    const campaigns = await db.prepare(`
      SELECT * FROM campaigns WHERE tenant_id = ? AND status = 'active'
    `).all(tenantId) as any[];

    if (campaigns.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          kpis: {
            totalSpend: 0,
            totalRevenue: 0,
            totalConversions: 0,
            avgRoas: 0,
            avgCpa: 0,
            avgCtr: 0,
          },
          timeSeries: [],
          platforms: [],
          campaigns: [],
          funnel: {
            impressions: 0,
            clicks: 0,
            leads: 0,
            conversions: 0,
          },
        },
      });
    }

    // Time series data
    const timeSeries = await db.prepare(`
      SELECT 
        date(created_at) as date,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SUM(conversions) as conversions,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks
      FROM campaigns
      WHERE tenant_id = ? AND created_at >= ${dateFilter}
      GROUP BY date(created_at)
      ORDER BY date
    `).all(tenantId) as any[];

    // Platform breakdown
    const platforms = await db.prepare(`
      SELECT 
        platform,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SUM(conversions) as conversions,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        COUNT(*) as campaign_count
      FROM campaigns
      WHERE tenant_id = ? AND created_at >= ${dateFilter}
      GROUP BY platform
      ORDER BY spend DESC
    `).all(tenantId) as any[];

    // Campaign performance
    const campaignPerformance = await db.prepare(`
      SELECT 
        id, name, platform, status, spend, revenue, conversions, roas, cpa, ctr
      FROM campaigns
      WHERE tenant_id = ? AND created_at >= ${dateFilter}
      ORDER BY roas DESC
      LIMIT 20
    `).all(tenantId) as any[];

    // Funnel metrics
    const totals = timeSeries.reduce((acc: any, day: any) => {
      acc.impressions += day.impressions || 0;
      acc.clicks += day.clicks || 0;
      acc.conversions += day.conversions || 0;
      acc.spend += day.spend || 0;
      acc.revenue += day.revenue || 0;
      return acc;
    }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });

    const totalSpend = totals.spend || 0;
    const totalRevenue = totals.revenue || 0;
    const totalConversions = totals.conversions || 0;
    const totalClicks = totals.clicks || 0;
    const totalImpressions = totals.impressions || 0;

    return NextResponse.json({
      ok: true,
      data: {
        kpis: {
          totalSpend,
          totalRevenue,
          totalConversions,
          avgRoas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
          avgCpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
          avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        },
        timeSeries: timeSeries.map(t => ({
          date: t.date,
          spend: t.spend || 0,
          revenue: t.revenue || 0,
          roas: t.spend > 0 ? (t.revenue || 0) / t.spend : 0,
          conversions: t.conversions || 0,
          impressions: t.impressions || 0,
          clicks: t.clicks || 0,
          ctr: t.impressions > 0 ? ((t.clicks || 0) / t.impressions) * 100 : 0,
          cpa: (t.conversions || 0) > 0 ? (t.spend || 0) / t.conversions : 0,
        })),
        platforms: platforms.map(p => ({
          platform: p.platform,
          spend: p.spend || 0,
          revenue: p.revenue || 0,
          roas: p.spend > 0 ? (p.revenue || 0) / p.spend : 0,
          conversions: p.conversions || 0,
          cpa: p.conversions > 0 ? (p.spend || 0) / p.conversions : 0,
          ctr: p.impressions > 0 ? ((p.clicks || 0) / p.impressions) * 100 : 0,
          campaignCount: p.campaign_count,
        })),
        campaigns: campaignPerformance,
        funnel: {
          impressions: totalImpressions,
          clicks: totalClicks,
          leads: Math.round(totalClicks * 0.15),
          conversions: totalConversions,
        },
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch analytics', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}
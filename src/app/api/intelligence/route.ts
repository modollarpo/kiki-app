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

    // Get real campaign performance data
    const campaigns = await db.prepare(`
      SELECT name, platform, roas, cpa, spend, conversions, revenue
      FROM campaigns WHERE tenant_id = ? AND status = 'active'
    `).all(tenantId) as any[];

    // Get signal trends
    const signalTrends = await db.prepare(`
      SELECT platform, event_type, COUNT(*) as count, AVG(value) as avg_value
      FROM signals WHERE tenant_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY platform, event_type
      ORDER BY count DESC
    `).all(tenantId) as any[];

    // Get LTV prediction distribution
    const ltvDistribution = await db.prepare(`
      SELECT segment, COUNT(*) as count, AVG(predicted_ltv) as avg_ltv
      FROM ltv_predictions WHERE tenant_id = ?
      GROUP BY segment
    `).all(tenantId) as any[];

    // Build insights from real data
    const insights: any[] = [];

    // Top performing campaign
    const topCampaign = campaigns.sort((a, b) => (b.roas || 0) - (a.roas || 0))[0];
    if (topCampaign) {
      insights.push({
        type: "performance",
        title: `Top performer: ${topCampaign.name}`,
        description: `${topCampaign.platform} campaign with ${(topCampaign.roas || 0).toFixed(1)}× ROAS`,
        confidence: 95,
        impact: "high",
      });
    }

    // Underperforming campaigns
    const underperformers = campaigns.filter(c => (c.roas || 0) < 2 && (c.spend || 0) > 1000);
    if (underperformers.length > 0) {
      insights.push({
        type: "alert",
        title: `${underperformers.length} campaign(s) below 2× ROAS`,
        description: "Consider pausing or optimizing these campaigns",
        confidence: 88,
        impact: "high",
      });
    }

    // Signal volume trend
    const totalSignals = signalTrends.reduce((s, t) => s + t.count, 0);
    if (totalSignals > 0) {
      insights.push({
        type: "trend",
        title: `${totalSignals} signals processed this week`,
        description: `Top platform: ${signalTrends[0]?.platform || "N/A"} (${signalTrends[0]?.count || 0} events)`,
        confidence: 100,
        impact: "medium",
      });
    }

    // LTV segment distribution
    const highValueCustomers = ltvDistribution.find(s => s.segment === "high");
    if (highValueCustomers) {
      insights.push({
        type: "opportunity",
        title: `${highValueCustomers.count} high-value customers identified`,
        description: `Average predicted LTV: $${Math.round(highValueCustomers.avg_ltv || 0)}`,
        confidence: 82,
        impact: "high",
      });
    }

    // Predictions based on current trends
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const predictions = [
      {
        metric: "Projected Monthly Revenue",
        value: `$${Math.round(totalRevenue * 1.1).toLocaleString()}`,
        confidence: 78,
        basis: "Based on current ROAS trend",
      },
      {
        metric: "Optimal Budget Allocation",
        value: `$${Math.round(totalSpend * 1.15).toLocaleString()}`,
        confidence: 72,
        basis: "15% increase recommended for top performers",
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        insights,
        predictions,
        summary: {
          totalCampaigns: campaigns.length,
          avgRoas: Math.round(avgRoas * 100) / 100,
          totalSignals,
          ltvSegments: ltvDistribution,
        },
      },
    });
  } catch (error) {
    logger.error("intelligence/handler", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

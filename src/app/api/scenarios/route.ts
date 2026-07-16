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

    // Get current campaign performance
    const campaigns = await db.prepare(`
      SELECT platform, spend, revenue, conversions, roas
      FROM campaigns WHERE tenant_id = ? AND status = 'active'
    `).all(tenantId) as any[];

    const totalSpent = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
    const currentRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

    // Build scenarios from real data with realistic projections
    const scenarios = [
      {
        id: "baseline",
        name: "Current Trajectory",
        description: "Maintain current spend and optimization levels",
        projectedRevenue: Math.round(totalRevenue),
        projectedRoas: Math.round(currentRoas * 100) / 100,
        projectedConversions: totalConversions,
        confidence: 85,
        risk: "low",
      },
      {
        id: "scale_up",
        name: "Scale Top Performers",
        description: "Increase budget 30% on campaigns with ROAS > 3×",
        projectedRevenue: Math.round(totalRevenue * 1.35),
        projectedRoas: Math.round(currentRoas * 0.95 * 100) / 100, // Slight ROAS decrease with scale
        projectedConversions: Math.round(totalConversions * 1.25),
        confidence: 72,
        risk: "medium",
      },
      {
        id: "optimize",
        name: "Optimize Efficiency",
        description: "Pause underperformers, reallocate to best channels",
        projectedRevenue: Math.round(totalRevenue * 1.15),
        projectedRoas: Math.round(currentRoas * 1.2 * 100) / 100,
        projectedConversions: Math.round(totalConversions * 0.9),
        confidence: 78,
        risk: "low",
      },
      {
        id: "expand",
        name: "Multi-Channel Expansion",
        description: "Add budget to underutilized platforms",
        projectedRevenue: Math.round(totalRevenue * 1.5),
        projectedRoas: Math.round(currentRoas * 0.85 * 100) / 100,
        projectedConversions: Math.round(totalConversions * 1.4),
        confidence: 65,
        risk: "high",
      },
    ];

    // Risk assessment based on current metrics
    const riskFactors: string[] = [];
    if (currentRoas < 2) riskFactors.push("Current ROAS below 2× — scaling may increase losses");
    if (totalSpent > totalRevenue * 0.8) riskFactors.push("Spend approaching revenue — thin margins");
    if (campaigns.length < 3) riskFactors.push("Limited campaign diversity — high concentration risk");

    return NextResponse.json({
      success: true,
      data: {
        currentMetrics: {
          totalSpent,
          totalRevenue,
          totalConversions,
          currentRoas: Math.round(currentRoas * 100) / 100,
        },
        scenarios,
        riskFactors,
        recommendation: scenarios.reduce((best, s) => s.confidence > best.confidence ? s : best, scenarios[0]),
      },
    });
  } catch (error) {
    logger.error("scenarios/handler", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

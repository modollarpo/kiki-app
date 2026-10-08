export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

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

// Scenarios are illustrative what-if projections built from real campaign
    // data with explicitly stated assumptions. They are NOT model predictions:
    // confidence is null until a calibrated planner is wired to platform data.
    const scenarios = [
      {
        id: "baseline",
        name: "Current Trajectory",
        description: "Maintain current spend and optimization levels",
        budgetChange: 0,
        projectedRevenue: Math.round(totalRevenue),
        projectedRoas: Math.round(currentRoas * 100) / 100,
        projectedConversions: totalConversions,
        confidence: null,
        risk: "low",
        basis: "Current campaign totals, no change applied.",
      },
      {
        id: "scale_up",
        name: "Scale Top Performers",
        description: "Increase budget 30% on campaigns with ROAS > 3×",
        budgetChange: 30,
        projectedRevenue: Math.round(totalRevenue * 1.35),
        projectedRoas: Math.round(currentRoas * 0.95 * 100) / 100,
        projectedConversions: Math.round(totalConversions * 1.25),
        confidence: null,
        risk: "medium",
        basis: "Hypothetical +30% budget shift to top performers; assumes +35% revenue, -5% ROAS under scale.",
      },
      {
        id: "optimize",
        name: "Optimize Efficiency",
        description: "Pause underperformers, reallocate to best channels",
        budgetChange: -15,
        projectedRevenue: Math.round(totalRevenue * 1.15),
        projectedRoas: Math.round(currentRoas * 1.2 * 100) / 100,
        projectedConversions: Math.round(totalConversions * 0.9),
        confidence: null,
        risk: "low",
        basis: "Hypothetical -15% underperformer budget removal; assumes +20% ROAS on remaining spend.",
      },
      {
        id: "expand",
        name: "Multi-Channel Expansion",
        description: "Add budget to underutilized platforms",
        budgetChange: 25,
        projectedRevenue: Math.round(totalRevenue * 1.5),
        projectedRoas: Math.round(currentRoas * 0.85 * 100) / 100,
        projectedConversions: Math.round(totalConversions * 1.4),
        confidence: null,
        risk: "high",
        basis: "Hypothetical +25% expansion across underutilized platforms; assumes +50% revenue, -15% ROAS.",
      },
    ];

    // Risk assessment based on current metrics
    const riskFactors: string[] = [];
    if (currentRoas < 2) riskFactors.push("Current ROAS below 2× — scaling may increase losses");
    if (totalSpent > totalRevenue * 0.8) riskFactors.push("Spend approaching revenue — thin margins");
    if (campaigns.length < 3) riskFactors.push("Limited campaign diversity — high concentration risk");

    return Response.json({
      ok: true,
      data: {
        currentMetrics: {
          totalSpent,
          totalRevenue,
          totalConversions,
          currentRoas: Math.round(currentRoas * 100) / 100,
        },
        scenarios,
        riskFactors,
        recommendation: scenarios.filter(s => s.risk === "low")[0] || scenarios[0],
      },
    });
  } catch (error) {
    logger.error("scenarios/handler", { message: error instanceof Error ? error.message : String(error) });
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

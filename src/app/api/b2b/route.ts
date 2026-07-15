import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const tenantId = user.tenantId;

    // Get campaign pipeline data from real campaigns
    const campaigns = await db.prepare(`
      SELECT id, name, platform, status, budget, spend, conversions, revenue, roas, cpa
      FROM campaigns WHERE tenant_id = ?
    `).all(tenantId) as any[];

    const activeCampaigns = campaigns.filter(c => c.status === "active");
    const pausedCampaigns = campaigns.filter(c => c.status === "paused");
    const draftCampaigns = campaigns.filter(c => c.status === "draft");

    const totalValue = activeCampaigns.reduce((s, c) => s + (c.budget || 0), 0);
    const totalSpent = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);

    // Build pipeline stages from campaign statuses
    const stages = [
      { name: "Active", count: activeCampaigns.length, value: activeCampaigns.reduce((s, c) => s + (c.budget || 0), 0), color: "#31F3C3" },
      { name: "Paused", count: pausedCampaigns.length, value: pausedCampaigns.reduce((s, c) => s + (c.budget || 0), 0), color: "#F0A500" },
      { name: "Draft", count: draftCampaigns.length, value: draftCampaigns.reduce((s, c) => s + (c.budget || 0), 0), color: "#50506A" },
    ];

    // Top accounts by campaign value
    const topAccounts = campaigns
      .sort((a, b) => (b.budget || 0) - (a.budget || 0))
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        value: c.budget || 0,
        stage: c.status,
        platform: c.platform,
        roas: c.roas || 0,
      }));

    return NextResponse.json({
      success: true,
      data: {
        pipeline: {
          totalValue,
          deals: campaigns.length,
          avgSize: campaigns.length > 0 ? Math.round(totalValue / campaigns.length) : 0,
          winRate: totalConversions > 0 ? Math.round((totalRevenue / Math.max(totalSpent, 1)) * 100) / 10 : 0,
        },
        stages,
        topAccounts,
        metrics: {
          totalSpent,
          totalRevenue,
          totalConversions,
          avgRoas: totalSpent > 0 ? Math.round((totalRevenue / totalSpent) * 100) / 100 : 0,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

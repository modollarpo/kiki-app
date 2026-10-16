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

    // Get campaign financial data
    const campaigns = await db.prepare(`
      SELECT platform, spend, revenue, conversions, cpa
      FROM campaigns WHERE tenant_id = ?
    `).all<{ platform: string; spend: number; revenue: number; conversions: number; cpa: number }>(tenantId);

    // Calculate real margins by platform
    const platformData: Record<string, { spend: number; revenue: number; conversions: number }> = {};
    for (const c of campaigns) {
      const p = c.platform || "unknown";
      if (!platformData[p]) platformData[p] = { spend: 0, revenue: 0, conversions: 0 };
      platformData[p].spend += c.spend || 0;
      platformData[p].revenue += c.revenue || 0;
      platformData[p].conversions += c.conversions || 0;
    }

    const byChannel = Object.entries(platformData).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      spend: data.spend,
      revenue: data.revenue,
      margin: data.revenue > 0 ? Math.round(((data.revenue - data.spend) / data.revenue) * 1000) / 10 : 0,
      roi: data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0,
      cac: data.conversions > 0 ? Math.round((data.spend / data.conversions) * 100) / 100 : 0,
      conversions: data.conversions,
    }));

    // Calculate overall metrics
    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
    const avgMargin = totalRevenue > 0 ? Math.round(((totalRevenue - totalSpend) / totalRevenue) * 1000) / 10 : 0;

    // Get billing/fee data
    const wallet = await db.prepare(`SELECT balance FROM wallets WHERE tenant_id = ?`).get<{ balance: number }>(tenantId);

    // Monthly margin trend derived from real campaign data (last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRows = await db.prepare(`
      SELECT strftime('%m', created_at) as mon, strftime('%Y', created_at) as yr, SUM(spend) as spend, SUM(revenue) as revenue
      FROM campaigns WHERE tenant_id = ? AND created_at >= datetime('now', '-6 months')
      GROUP BY yr, mon ORDER BY yr, mon
    `).all<{ mon: string; yr: string; spend: number; revenue: number }>(tenantId);
    const marginTrend = monthlyRows.map(r => ({
      month: monthNames[parseInt(r.mon) - 1] || `M${r.mon}`,
      margin: r.revenue > 0 ? Math.round(((r.revenue - r.spend) / r.revenue) * 1000) / 10 : 0,
    }));

    return Response.json({
      ok: true,
      data: {
        overview: {
          totalSpend,
          totalRevenue,
          netProfit: totalRevenue - totalSpend,
          grossProfit: totalRevenue - totalSpend,
          profitAdjCAC: totalConversions > 0 ? Math.max(0, Math.round(((2 * totalSpend - totalRevenue) / totalConversions) * 100) / 100) : 0,
          avgMargin,
          totalConversions,
          avgCpa: totalConversions > 0 ? Math.round(totalSpend / totalConversions * 100) / 100 : 0,
          walletBalance: wallet?.balance || 0,
        },
        byChannel,
        marginTrend,
      },
    });
  } catch (error) {
    logger.error("margin/handler", { message: error instanceof Error ? error.message : String(error) });
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

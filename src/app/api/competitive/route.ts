export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return jsonError("Unauthorized", 401);

    const db = await getDb();
    const tenantId = user.tenantId;

    // ── Our campaign performance (real) ─────────────────────
    const ourCampaigns = await db.prepare(`
      SELECT platform, spend, impressions, conversions, revenue, roas, target_roas, cpa
      FROM campaigns WHERE tenant_id = ?
    `).all(tenantId) as Array<{
      platform: string; spend: number; impressions: number; conversions: number;
      revenue: number; roas: number; target_roas: number; cpa: number;
    }>;

    const platformMetrics: Record<string, { spend: number; conversions: number; revenue: number; count: number }> = {};
    for (const c of ourCampaigns) {
      const p = c.platform || "unknown";
      if (!platformMetrics[p]) platformMetrics[p] = { spend: 0, conversions: 0, revenue: 0, count: 0 };
      platformMetrics[p].spend += c.spend || 0;
      platformMetrics[p].conversions += c.conversions || 0;
      platformMetrics[p].revenue += (c.revenue || 0);
      platformMetrics[p].count++;
    }

    const totalSpend = ourCampaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalRevenue = ourCampaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const platforms = Object.entries(platformMetrics).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      spend: data.spend,
      roas: data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0,
      conversions: data.conversions,
      cpa: data.conversions > 0 ? Math.round(data.spend / data.conversions * 100) / 100 : 0,
      // Real directional signal: revenue vs spend vs the campaign target.
      trend: totalRevenue > totalSpend ? "positive" : "neutral",
    }));

    // ── Recent signal volume by platform (real) ─────────────
    const recentSignals = await db.prepare(`
      SELECT platform, COUNT(*) as count, AVG(value) as avg_value
      FROM signals WHERE tenant_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY platform
    `).all(tenantId) as Array<{ platform: string; count: number; avg_value: number }>;

    // ── CPM benchmarks (real yours; benchmark/industry need an
    // external data source that is not connected — surfaced as null) ──
    const platformCpm: Record<string, { spend: number; impressions: number }> = {};
    for (const c of ourCampaigns) {
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
        benchmark: null,
        industry: null,
      }));

    // ── Competitors (real, from competitor monitoring snapshots) ──
    const competing = await db.prepare(`
      SELECT c.domain, c.product_category, s.avg_price, s.captured_at
      FROM competitor_configs c
      LEFT JOIN competitor_snapshots s ON s.competitor_id = c.id
        AND s.captured_at = (SELECT MAX(s2.captured_at) FROM competitor_snapshots s2 WHERE s2.competitor_id = c.id)
      WHERE c.tenant_id = ? AND c.status = 'active'
      ORDER BY c.created_at DESC
    `).all(tenantId) as Array<{
      domain: string; product_category: string;
      avg_price: number; captured_at: string;
    }>;

    // Tracked competitors: name = domain, spend/roas/cpa unknown (we only
    // monitor prices), marketShare unknown.
    const competitors = competing.map((c, i) => ({
      name: c.domain,
      platform: "web",
      spend: 0,
      roas: 0,
      cpa: 0,
      marketShare: null,
      avgPrice: c.avg_price,
      monitored: true,
      trend: c.avg_price ? "up" : "down",
      idx: i,
    }));

    // Market trends derived from real price movement vs first snapshot.
    const marketTrends: Array<{ metric: string; value: string; change: string; direction: string }> = [];
    for (const c of competing) {
      const snapshots = await db.prepare(`
        SELECT avg_price, captured_at FROM competitor_snapshots
        WHERE competitor_id = (
          SELECT id FROM competitor_configs WHERE tenant_id = ? AND domain = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1
        )
        ORDER BY captured_at ASC
      `).all(tenantId, c.domain) as Array<{ avg_price: number; captured_at: string }>;
      if (snapshots.length >= 2) {
        const first = snapshots[0].avg_price;
        const last = snapshots[snapshots.length - 1].avg_price;
        if (first > 0) {
          const pct = Math.round(((last - first) / first) * 1000) / 10;
          marketTrends.push({
            metric: `${c.domain} price trend`,
            value: `${snapshots.length} samples`,
            change: `${pct >= 0 ? "+" : ""}${pct}%`,
            direction: pct >= 0 ? "up" : "down",
          });
        }
      }
    }

    return json({
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
      competitors,
      competitorsTracked: competing.length,
      marketTrends,
      shareOfVoice: null,
      note: "Benchmark/industry CPM and market share require an external data source — reported as null rather than fabricated.",
    });
  } catch (error) {
    logger.error("competitive/handler", { message: error instanceof Error ? error.message : String(error) });
    return jsonError(String(error), 500);
  }
}
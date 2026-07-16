import { Router, Request, Response } from "express";
import { ServiceContext } from "../../../../packages/shared/src/service-template";
import { publishEvent } from "../../../../packages/shared/src/service-template";

const CPM_BENCHMARKS: Record<string, Record<string, { p50: number; p75: number; p90: number }>> = {
  meta: {
    ecommerce: { p50: 11.8, p75: 14.2, p90: 18.5 },
    saas: { p50: 15.2, p75: 19.8, p90: 25.0 },
    finance: { p50: 18.5, p75: 24.0, p90: 32.0 },
    health: { p50: 14.0, p75: 18.5, p90: 24.0 },
    travel: { p50: 12.5, p75: 16.0, p90: 21.0 },
  },
  google: {
    ecommerce: { p50: 7.2, p75: 9.1, p90: 12.0 },
    saas: { p50: 9.5, p75: 12.5, p90: 16.0 },
    finance: { p50: 12.0, p75: 16.0, p90: 22.0 },
    health: { p50: 8.5, p75: 11.0, p90: 15.0 },
    travel: { p50: 7.8, p75: 10.0, p90: 13.5 },
  },
  tiktok: {
    ecommerce: { p50: 5.9, p75: 7.4, p90: 10.0 },
    saas: { p50: 8.0, p75: 10.5, p90: 14.0 },
    finance: { p50: 10.0, p75: 13.0, p90: 17.0 },
    health: { p50: 7.0, p75: 9.0, p90: 12.0 },
    travel: { p50: 6.5, p75: 8.5, p90: 11.0 },
  },
  linkedin: {
    ecommerce: { p50: 25.0, p75: 32.0, p90: 42.0 },
    saas: { p50: 30.0, p75: 38.0, p90: 50.0 },
    finance: { p50: 35.0, p75: 45.0, p90: 60.0 },
    health: { p50: 28.0, p75: 36.0, p90: 48.0 },
    travel: { p50: 22.0, p75: 28.0, p90: 38.0 },
  },
};

function genId(): string {
  return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function competitiveRoutes(ctx: ServiceContext): Router {
  const router = Router();

  // POST /api/competitors — Add competitor to track
  router.post("/competitors", async (req: Request, res: Response) => {
    try {
      const { tenantId, name, domain, platforms, industry } = req.body;
      const id = genId();
      await ctx.db.query(`
        INSERT INTO competitor_tracks (id, tenant_id, name, domain, platforms, industry)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (tenant_id, domain) DO UPDATE SET name = $3, platforms = $5, industry = $6
        RETURNING id
      `, [id, tenantId, name, domain, platforms || ["meta"], industry || null]);
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/competitors — List tracked competitors
  router.get("/competitors", async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;
      const rows = await ctx.db.query(
        `SELECT * FROM competitor_tracks WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]
      );
      res.json({ success: true, data: rows.rows });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/competitors/:id/ads — Get competitor ads
  router.get("/competitors/:id/ads", async (req: Request, res: Response) => {
    try {
      const { platform, limit = "50" } = req.query;
      let where = "WHERE competitor_id = $1";
      const params: any[] = [req.params.id];
      if (platform) { where += ` AND platform = $${params.length + 1}`; params.push(platform); }

      const rows = await ctx.db.query(`
        SELECT * FROM competitor_ad_snapshots ${where}
        ORDER BY last_seen DESC LIMIT $${params.length + 1}
      `, [...params, parseInt(limit as string)]);

      res.json({ success: true, data: rows.rows });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/benchmarks — CPM benchmarks by platform/industry
  router.get("/benchmarks", async (req: Request, res: Response) => {
    try {
      const { platform, industry = "ecommerce" } = req.query;
      if (platform && CPM_BENCHMARKS[platform as string]) {
        const data = CPM_BENCHMARKS[platform as string][industry as string] || CPM_BENCHMARKS[platform as string].ecommerce;
        res.json({ success: true, data: { platform, industry, ...data } });
      } else {
        // Return all benchmarks
        const all: any[] = [];
        for (const [plat, industries] of Object.entries(CPM_BENCHMARKS)) {
          const bench = industries[industry as string] || industries.ecommerce;
          all.push({ platform: plat, industry, ...bench });
        }
        res.json({ success: true, data: all });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/analysis — AI-powered creative strategy analysis
  router.get("/analysis", async (req: Request, res: Response) => {
    try {
      const { tenantId, competitorId } = req.query;
      const ads = await ctx.db.query(`
        SELECT headline, body, creative_type, platform, ai_analysis
        FROM competitor_ad_snapshots
        WHERE competitor_id = $1
        ORDER BY last_seen DESC LIMIT 20
      `, [competitorId]);

      // Generate analysis from ad data
      const headlines = ads.rows.map((r: any) => r.headline).filter(Boolean);
      const bodies = ads.rows.map((r: any) => r.body).filter(Boolean);
      const types = ads.rows.reduce((acc: Record<string, number>, r: any) => { acc[r.creative_type] = (acc[r.creative_type] || 0) + 1; return acc; }, {});

      const themes = headlines.map((h: string) => {
        const lower = h.toLowerCase();
        if (lower.includes("free") || lower.includes("try")) return "free trial";
        if (lower.includes("save") || lower.includes("off")) return "discount";
        if (lower.includes("new") || lower.includes("launch")) return "new product";
        if (lower.includes("limited") || lower.includes("hurry")) return "urgency";
        return "brand";
      });

      const themeCount = themes.reduce((acc: Record<string, number>, t: string) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});

      res.json({
        success: true,
        data: {
          totalAds: ads.rows.length,
          topThemes: Object.entries(themeCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
          creativeMix: types,
          platforms: [...new Set(ads.rows.map((r: any) => r.platform))],
          avgHeadlineLength: headlines.length > 0 ? Math.round(headlines.reduce((s: number, h: string) => s + h.length, 0) / headlines.length) : 0,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/share-of-voice
  router.get("/share-of-voice", async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;
      const ourSpend = await ctx.db.query(
        `SELECT SUM(spend) as total FROM campaigns WHERE tenant_id = $1`, [tenantId]
      );
      const competitors = await ctx.db.query(
        `SELECT COUNT(*) as c FROM competitor_tracks WHERE tenant_id = $1`, [tenantId]
      );
      const ourTotal = parseFloat(ourSpend.rows[0]?.total || "0");
      const competitorCount = parseInt(competitors.rows[0]?.c || "0");
      const estimatedMarket = ourTotal * (1 + competitorCount * 0.3);
      const share = estimatedMarket > 0 ? (ourTotal / estimatedMarket) * 100 : 0;

      res.json({
        success: true,
        data: {
          yourShare: Math.round(share * 10) / 10,
          topCompetitor: Math.round((100 - share) / Math.max(competitorCount, 1) * 10) / 10,
          industryAvg: Math.round(100 / (competitorCount + 1) * 10) / 10,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

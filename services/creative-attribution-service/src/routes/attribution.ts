import { Router, Request, Response } from "express";
import { ServiceContext } from "../../../../packages/shared/src/service-template";
import { publishEvent } from "../../../../packages/shared/src/service-template";
function genId(): string {
  return `attr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function attributionRoutes(ctx: ServiceContext): Router {
  const router = Router();

  // POST /api/attributions — Record an attribution
  router.post("/attributions", async (req: Request, res: Response) => {
    try {
      const {
        tenantId, signalId, creativeId, adId, adsetId, campaignId,
        platform, model, attributedRevenue, attributedLtv,
        conversionValue, impressionTime, conversionTime, attributionWindow
      } = req.body;

      const id = genId();
      await ctx.db.query(`
        INSERT INTO signal_attribution_records
        (id, tenant_id, signal_id, creative_id, ad_id, adset_id, campaign_id,
         platform, attribution_model, attributed_revenue, attributed_ltv,
         conversion_value, impression_time, conversion_time, attribution_window)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      `, [id, tenantId, signalId, creativeId, adId, adsetId, campaignId,
         platform, model, attributedRevenue || 0, attributedLtv || 0,
         conversionValue || 0, new Date(impressionTime), new Date(conversionTime),
         attributionWindow || 24]);

      await publishEvent(ctx.producer, "kiki.attribution", {
        eventId: id, eventType: "attribution.recorded", topic: "kiki.attribution",
        tenantId, timestamp: Date.now(), version: "1.0",
        payload: { signalId, creativeId, adId, campaignId, platform, model, attributedRevenue, attributedLtv, conversionValue },
      });

      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/attributions/breakdown — Signal-to-variant breakdown
  router.get("/attributions/breakdown", async (req: Request, res: Response) => {
    try {
      const { tenantId, campaignId, platform, days = "30" } = req.query;
      let where = "WHERE tenant_id = $1";
      const params: any[] = [tenantId];
      if (campaignId) { where += ` AND campaign_id = $${params.length + 1}`; params.push(campaignId); }
      if (platform) { where += ` AND platform = $${params.length + 1}`; params.push(platform); }
      where += ` AND created_at >= NOW() - INTERVAL '${parseInt(days as string)} days'`;

      const rows = await ctx.db.query(`
        SELECT creative_id, ad_id, platform, attribution_model,
               COUNT(*) as attributions,
               SUM(attributed_revenue) as total_revenue,
               SUM(attributed_ltv) as total_ltv,
               AVG(conversion_value) as avg_conversion_value
        FROM signal_attribution_records ${where}
        GROUP BY creative_id, ad_id, platform, attribution_model
        ORDER BY total_revenue DESC
      `, params);

      res.json({ success: true, data: rows.rows });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/attributions/compare — A/B variant comparison
  router.get("/attributions/compare", async (req: Request, res: Response) => {
    try {
      const { tenantId, creativeA, creativeB, days = "30" } = req.query;
      const results = [];
      for (const creativeId of [creativeA, creativeB]) {
        const row = await ctx.db.query(`
          SELECT creative_id,
                 COUNT(*) as attributions,
                 COALESCE(SUM(attributed_revenue), 0) as total_revenue,
                 COALESCE(SUM(attributed_ltv), 0) as total_ltv,
                 COALESCE(AVG(conversion_value), 0) as avg_conversion
          FROM signal_attribution_records
          WHERE tenant_id = $1 AND creative_id = $2
            AND created_at >= NOW() - INTERVAL '${parseInt(days as string)} days'
          GROUP BY creative_id
        `, [tenantId, creativeId]);
        results.push(row.rows[0] || { creative_id: creativeId, attributions: 0, total_revenue: 0, total_ltv: 0, avg_conversion: 0 });
      }
      const [a, b] = results;
      res.json({
        success: true,
        data: {
          variantA: a, variantB: b,
          winner: a.total_revenue > b.total_revenue ? "A" : "B",
          revenueDiff: Math.abs(a.total_revenue - b.total_revenue),
          ltvDiff: Math.abs(a.total_ltv - b.total_ltv),
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/attributions/top-performers — Top creatives by LTV
  router.get("/attributions/top-performers", async (req: Request, res: Response) => {
    try {
      const { tenantId, platform, limit = "20" } = req.query;
      let where = "WHERE tenant_id = $1";
      const params: any[] = [tenantId];
      if (platform) { where += ` AND platform = $${params.length + 1}`; params.push(platform); }

      const rows = await ctx.db.query(`
        SELECT creative_id, platform,
               COUNT(*) as attributions,
               SUM(attributed_revenue) as total_revenue,
               SUM(attributed_ltv) as total_ltv,
               AVG(attributed_ltv) as avg_ltv_per_attrib,
               SUM(CASE WHEN conversion_value > 0 THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) as conversion_rate
        FROM signal_attribution_records ${where}
        GROUP BY creative_id, platform
        ORDER BY total_ltv DESC
        LIMIT $${params.length + 1}
      `, [...params, parseInt(limit as string)]);

      res.json({ success: true, data: rows.rows });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/attributions/settings — Model settings
  router.get("/attributions/settings", async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;
      const row = await ctx.db.query(
        `SELECT * FROM attribution_settings WHERE tenant_id = $1`, [tenantId]
      );
      res.json({ success: true, data: row.rows[0] || null });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /api/attributions/settings — Update model settings
  router.put("/attributions/settings", async (req: Request, res: Response) => {
    try {
      const { tenantId, defaultModel, metaWindowHours, googleWindowDays, tiktokWindowHours, positionWeights, decayHalfLifeDays } = req.body;
      await ctx.db.query(`
        INSERT INTO attribution_settings (tenant_id, default_model, meta_window_hours, google_window_days, tiktok_window_hours, position_weights, decay_half_life_days)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (tenant_id) DO UPDATE SET
          default_model = COALESCE($2, default_model),
          meta_window_hours = COALESCE($3, meta_window_hours),
          google_window_days = COALESCE($4, google_window_days),
          tiktok_window_hours = COALESCE($5, tiktok_window_hours),
          position_weights = COALESCE($6, position_weights),
          decay_half_life_days = COALESCE($7, decay_half_life_days),
          updated_at = NOW()
      `, [tenantId, defaultModel, metaWindowHours, googleWindowDays, tiktokWindowHours,
         positionWeights ? JSON.stringify(positionWeights) : null, decayHalfLifeDays]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

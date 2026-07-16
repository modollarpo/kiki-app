import { Router, Request, Response } from "express";
import { ServiceContext } from "../../../../packages/shared/src/service-template";
import { publishEvent } from "../../../../packages/shared/src/service-template";

export function marginRoutes(ctx: ServiceContext): Router {
  const router = Router();

  // POST /api/margins — Bulk upsert product margins (max 5000)
  router.post("/margins", async (req: Request, res: Response) => {
    try {
      const { tenantId, products } = req.body;
      if (!tenantId || !Array.isArray(products)) return res.status(400).json({ error: "tenantId and products[] required" });
      const items = products.slice(0, 5000);

      for (const p of items) {
        const cogs = p.cogs || 0;
        const price = p.price || 0;
        const marginPct = price > 0 ? ((price - cogs) / price) * 100 : 0;
        const marginAmount = price - cogs;

        await ctx.db.query(`
          INSERT INTO product_margins (tenant_id, sku, product_name, cogs, price, margin_pct, margin_amount, currency, category)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (tenant_id, sku) DO UPDATE SET
            product_name = $3, cogs = $4, price = $5, margin_pct = $6, margin_amount = $7,
            currency = $8, category = $9, last_updated = NOW()
        `, [tenantId, p.sku, p.productName || p.sku, cogs, price, marginPct, marginAmount, p.currency || "USD", p.category || null]);

        if (marginPct < 15) {
          await publishEvent(ctx.producer, "kiki.margin", {
            eventId: `margin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            eventType: "margin.threshold.breached", topic: "kiki.margin",
            tenantId, timestamp: Date.now(), version: "1.0",
            payload: { tenantId, sku: p.sku, marginPct, threshold: 15, direction: "below" },
          });
        }
      }

      res.json({ success: true, upserted: items.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/margins/portfolio — Portfolio summary
  router.get("/margins/portfolio", async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;
      const summary = await ctx.db.query(`
        SELECT
          COUNT(*) as total_skus,
          AVG(margin_pct) as avg_margin,
          SUM(cogs) as total_cogs,
          SUM(price) as total_revenue,
          SUM(margin_amount) as total_margin,
          COUNT(*) FILTER (WHERE margin_pct < 15) as low_margin_count,
          COUNT(*) FILTER (WHERE margin_pct >= 15 AND margin_pct < 40) as mid_margin_count,
          COUNT(*) FILTER (WHERE margin_pct >= 40) as high_margin_count
        FROM product_margins WHERE tenant_id = $1
      `, [tenantId]);

      const distribution = await ctx.db.query(`
        SELECT
          CASE
            WHEN margin_pct < 10 THEN '0-10%'
            WHEN margin_pct < 20 THEN '10-20%'
            WHEN margin_pct < 30 THEN '20-30%'
            WHEN margin_pct < 40 THEN '30-40%'
            WHEN margin_pct < 50 THEN '40-50%'
            ELSE '50%+'
          END as bucket,
          COUNT(*) as count,
          AVG(margin_pct) as avg_margin
        FROM product_margins WHERE tenant_id = $1
        GROUP BY bucket ORDER BY avg_margin
      `, [tenantId]);

      res.json({ success: true, data: { summary: summary.rows[0], distribution: distribution.rows } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/margins/campaign/:id — Profit-adjusted metrics for a campaign
  router.get("/margins/campaign/:id", async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;
      const campaign = await ctx.db.query(
        `SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]
      );
      if (!campaign.rows[0]) return res.status(404).json({ error: "Campaign not found" });

      const c = campaign.rows[0];
      const avgMargin = await ctx.db.query(
        `SELECT AVG(margin_pct) as avg_margin FROM product_margins WHERE tenant_id = $1`, [tenantId]
      );
      const marginPct = parseFloat(avgMargin.rows[0]?.avg_margin || "50") / 100;
      const revenue = parseFloat(c.revenue || "0");
      const spend = parseFloat(c.spend || "0");
      const cogs = revenue * (1 - marginPct);
      const grossProfit = revenue - cogs - spend;
      const profitRoas = spend > 0 ? grossProfit / spend : 0;
      const marginAdjustedLtv = parseFloat(c.ltv_predicted || "0") * marginPct;

      res.json({
        success: true,
        data: {
          campaignId: c.id,
          revenue, spend, cogs: Math.round(cogs * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          profitRoas: Math.round(profitRoas * 100) / 100,
          profitMarginPct: Math.round((1 - marginPct) * 1000) / 10,
          marginAdjustedLtv: Math.round(marginAdjustedLtv * 100) / 100,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

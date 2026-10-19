import { Router, Request, Response } from "express";
import { ServiceContext } from "../../../../packages/shared/src/service-template";
import { publishEvent } from "../../../../packages/shared/src/service-template";
import { tenantOf, parsePositiveInt } from "../../../../packages/shared/src/service-template/security";

function genId(): string {
  return `inf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generatePromoCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 6);
  return `KIKI${clean}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export function influencerRoutes(ctx: ServiceContext): Router {
  const router = Router();

  // POST /api/creators — Register creator
  router.post("/creators", async (req: Request, res: Response) => {
    try {
      const { name, handle, platform } = req.body;
      const tenantId = tenantOf(req, req.body.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const id = genId();
      const promoCode = generatePromoCode(name);
      const utmSource = handle.replace("@", "").replace(/\s/g, "_").toLowerCase();
      const utmMedium = "influencer";

      await ctx.db.query(`
        INSERT INTO influencer_creators (id, tenant_id, name, handle, platform, promo_code, utm_source, utm_medium)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [id, tenantId, name, handle, platform || "meta", promoCode, utmSource, utmMedium]);

      await publishEvent(ctx.producer, "kiki.influencer", {
        eventId: id, eventType: "influencer.creator.registered", topic: "kiki.influencer",
        tenantId, timestamp: Date.now(), version: "1.0",
        payload: { creatorId: id, tenantId, name, handle, platform: platform || "meta" },
      });

      res.json({ success: true, data: { id, promoCode, utmSource, utmMedium, utmUrl: `?utm_source=${utmSource}&utm_medium=${utmMedium}` } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/creators — List creators
  router.get("/creators", async (req: Request, res: Response) => {
    try {
      const tenantId = tenantOf(req, req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const rows = await ctx.db.query(
        `SELECT * FROM influencer_creators WHERE tenant_id = $1 ORDER BY total_revenue DESC`, [tenantId]
      );
      res.json({ success: true, data: rows.rows });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/creators/:id/performance — Creator performance
  router.get("/creators/:id/performance", async (req: Request, res: Response) => {
    try {
      const tenantId = tenantOf(req, req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const creator = await ctx.db.query(
        `SELECT * FROM influencer_creators WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]
      );
      if (!creator.rows[0]) return res.status(404).json({ error: "Creator not found" });

      const conversions = await ctx.db.query(`
        SELECT mechanism, COUNT(*) as count, SUM(revenue) as revenue, AVG(predicted_ltv) as avg_ltv
        FROM influencer_conversions WHERE creator_id = $1 AND tenant_id = $2
        GROUP BY mechanism
      `, [req.params.id, tenantId]);

      const dailyConversions = await ctx.db.query(`
        SELECT DATE(attributed_at) as day, COUNT(*) as conversions, SUM(revenue) as revenue
        FROM influencer_conversions WHERE creator_id = $1 AND tenant_id = $2
        GROUP BY DATE(attributed_at) ORDER BY day DESC LIMIT 30
      `, [req.params.id, tenantId]);

      res.json({
        success: true,
        data: {
          creator: creator.rows[0],
          byMechanism: conversions.rows,
          dailyTrend: dailyConversions.rows,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/conversions/attribute — Attribute conversion to creator
  router.post("/conversions/attribute", async (req: Request, res: Response) => {
    try {
      const { orderId, revenue, predictedLtv, ltvSegment, promoCode, utmSource, referrerDomain } = req.body;
      const tenantId = tenantOf(req, req.body.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      let creatorId: string | null = null;
      let mechanism: string = "utm";

      if (promoCode) {
        const creator = await ctx.db.query(
          `SELECT id FROM influencer_creators WHERE tenant_id = $1 AND promo_code = $2`, [tenantId, promoCode]
        );
        if (creator.rows[0]) { creatorId = creator.rows[0].id; mechanism = "promo_code"; }
      } else if (utmSource) {
        const creator = await ctx.db.query(
          `SELECT id FROM influencer_creators WHERE tenant_id = $1 AND utm_source = $2`, [tenantId, utmSource]
        );
        if (creator.rows[0]) { creatorId = creator.rows[0].id; mechanism = "utm"; }
      } else if (referrerDomain) {
        // Dark social — no direct creator match
        mechanism = "referrer";
      }

      if (!creatorId) {
        // Track as dark social
        await ctx.db.query(`
          INSERT INTO dark_social_groups (tenant_id, referrer_domain, unattributed_conversions, total_revenue, estimated_influencer_pct, period_start, period_end)
          VALUES ($1, $2, 1, $3, 0.5, DATE_TRUNC('week', NOW()), DATE_TRUNC('week', NOW()) + INTERVAL '7 days')
          ON CONFLICT (tenant_id, referrer_domain, period_start) DO UPDATE SET
            unattributed_conversions = dark_social_groups.unattributed_conversions + 1,
            total_revenue = dark_social_groups.total_revenue + $3
        `, [tenantId, referrerDomain || "direct", revenue || 0]);
        return res.json({ success: true, data: { attributed: false, mechanism: "dark_social" } });
      }

      const id = genId();
      await ctx.db.query(`
        INSERT INTO influencer_conversions (id, creator_id, tenant_id, mechanism, order_id, revenue, predicted_ltv, ltv_segment)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [id, creatorId, tenantId, mechanism, orderId, revenue || 0, predictedLtv || 0, ltvSegment || "mid"]);

      // Update creator totals (tenant-scoped so a crossed id cannot update)
      await ctx.db.query(`
        UPDATE influencer_creators SET
          total_conversions = total_conversions + 1,
          total_revenue = total_revenue + $2,
          total_ltv = total_ltv + $3
        WHERE id = $1 AND tenant_id = $4
      `, [creatorId, revenue || 0, predictedLtv || 0, tenantId]);

      await publishEvent(ctx.producer, "kiki.influencer", {
        eventId: id, eventType: "influencer.conversion.attributed", topic: "kiki.influencer",
        tenantId, timestamp: Date.now(), version: "1.0",
        payload: { creatorId, tenantId, mechanism, orderId, revenue, predictedLtv, ltvSegment: ltvSegment || "mid" },
      });

      res.json({ success: true, data: { attributed: true, creatorId, mechanism } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/dark-social/analysis
  router.get("/dark-social/analysis", async (req: Request, res: Response) => {
    try {
      const tenantId = tenantOf(req, req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const days = parsePositiveInt(req.query.days, 30, 365);
      const rows = await ctx.db.query(`
        SELECT referrer_domain, SUM(unattributed_conversions) as conversions, SUM(total_revenue) as revenue
        FROM dark_social_groups
        WHERE tenant_id = $1 AND period_start >= NOW() - ($2 * INTERVAL '1 day')
        GROUP BY referrer_domain
        ORDER BY revenue DESC LIMIT 20
      `, [tenantId, days]);

      const totalUnattributed = rows.rows.reduce((s: number, r: any) => s + parseInt(r.conversions || "0"), 0);
      const totalRevenue = rows.rows.reduce((s: number, r: any) => s + parseFloat(r.revenue || "0"), 0);

      res.json({
        success: true,
        data: {
          totalUnattributedConversions: totalUnattributed,
          totalUnattributedRevenue: totalRevenue,
          topReferrers: rows.rows,
          estimatedInfluencerImpact: Math.round(totalUnattributed * 0.2),
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

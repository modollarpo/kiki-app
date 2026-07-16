import { Router, Request, Response } from "express";
import { ServiceContext } from "../../../../packages/shared/src/service-template";
import { publishEvent } from "../../../../packages/shared/src/service-template";

type Intent = "cac_spike" | "top_campaign" | "budget_waste" | "signal_performance" | "platform_comparison" | "ltv_segment" | "creative_performance" | "time_comparison" | "anomaly_detection";

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  cac_spike: ["cac", "cost per acquisition", "acquisition cost", "cpa", "spike", "jumped", "increased"],
  top_campaign: ["best", "top", "highest", "performing", "campaign", "roas"],
  budget_waste: ["waste", "wasting", "spend", "burn", "low roas", "underperforming", "bad"],
  signal_performance: ["signal", "conversion", "enrichment", "ltv", "predicted"],
  platform_comparison: ["compare", "versus", "vs", "meta vs google", "platform", "channel"],
  ltv_segment: ["ltv", "lifetime value", "high value", "churn", "segment", "cohort"],
  creative_performance: ["creative", "ad", "variant", "image", "video", "headline", "copy"],
  time_comparison: ["yesterday", "last week", "last month", "trend", "over time", "compared to"],
  anomaly_detection: ["anomaly", "unusual", "weird", "spike", "drop", "sudden", "unexpected"],
};

function classifyIntent(question: string): Intent {
  const q = question.toLowerCase();
  let bestIntent: Intent = "top_campaign";
  let bestScore = 0;
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    const score = keywords.filter(k => q.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestIntent = intent; }
  }
  return bestIntent;
}

async function fetchDataForIntent(ctx: ServiceContext, tenantId: string, intent: Intent): Promise<string> {
  const db = ctx.db;
  switch (intent) {
    case "cac_spike": {
      const rows = await db.query(`
        SELECT platform, cpa, spend, conversions, created_at
        FROM campaigns WHERE tenant_id = $1 AND status = 'active'
        ORDER BY cpa DESC LIMIT 10
      `, [tenantId]);
      return JSON.stringify(rows.rows);
    }
    case "top_campaign": {
      const rows = await db.query(`
        SELECT name, platform, roas, cpa, spend, conversions, revenue
        FROM campaigns WHERE tenant_id = $1 AND status = 'active'
        ORDER BY roas DESC LIMIT 10
      `, [tenantId]);
      return JSON.stringify(rows.rows);
    }
    case "budget_waste": {
      const rows = await db.query(`
        SELECT name, platform, roas, spend, cpa
        FROM campaigns WHERE tenant_id = $1 AND status = 'active' AND roas < 2
        ORDER BY spend DESC LIMIT 10
      `, [tenantId]);
      return JSON.stringify(rows.rows);
    }
    case "signal_performance": {
      const rows = await db.query(`
        SELECT platform, event_type, COUNT(*) as count, AVG(value) as avg_value
        FROM signals WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY platform, event_type ORDER BY count DESC LIMIT 10
      `, [tenantId]);
      return JSON.stringify(rows.rows);
    }
    case "platform_comparison": {
      const rows = await db.query(`
        SELECT platform, SUM(spend) as total_spend, SUM(revenue) as total_revenue,
               SUM(conversions) as total_conversions,
               CASE WHEN SUM(spend) > 0 THEN ROUND(SUM(revenue)/SUM(spend)::numeric, 2) ELSE 0 END as roas
        FROM campaigns WHERE tenant_id = $1 AND status = 'active'
        GROUP BY platform ORDER BY total_revenue DESC
      `, [tenantId]);
      return JSON.stringify(rows.rows);
    }
    case "ltv_segment": {
      const rows = await db.query(`
        SELECT segment, COUNT(*) as count, AVG(predicted_ltv) as avg_ltv
        FROM ltv_predictions WHERE tenant_id = $1
        GROUP BY segment ORDER BY avg_ltv DESC
      `, [tenantId]);
      return JSON.stringify(rows.rows);
    }
    case "creative_performance": {
      const rows = await db.query(`
        SELECT name, platform, roas, conversions, spend
        FROM campaigns WHERE tenant_id = $1 AND status = 'active'
        ORDER BY roas DESC LIMIT 10
      `, [tenantId]);
      return JSON.stringify(rows.rows);
    }
    case "time_comparison": {
      const rows = await db.query(`
        SELECT DATE(created_at) as day, SUM(spend) as spend, SUM(revenue) as revenue, SUM(conversions) as conversions
        FROM campaigns WHERE tenant_id = $1
        GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 14
      `, [tenantId]);
      return JSON.stringify(rows.rows);
    }
    case "anomaly_detection": {
      const rows = await db.query(`
        SELECT DATE(created_at) as day, platform, SUM(spend) as spend, SUM(revenue) as revenue,
               CASE WHEN SUM(spend) > 0 THEN ROUND(SUM(revenue)/SUM(spend)::numeric, 2) ELSE 0 END as roas
        FROM campaigns WHERE tenant_id = $1
        GROUP BY DATE(created_at), platform ORDER BY day DESC LIMIT 30
      `, [tenantId]);
      return JSON.stringify(rows.rows);
    }
    default:
      return "[]";
  }
}

function generateFallbackAnswer(intent: Intent, data: string, question: string): string {
  const parsed = JSON.parse(data);
  if (!parsed.length) return `I don't have enough data yet to answer that question. Try connecting your ad accounts first.`;

  switch (intent) {
    case "cac_spike":
      return `Your current CPAs range from $${Math.min(...parsed.map((r: any) => r.cpa || 0)).toFixed(2)} to $${Math.max(...parsed.map((r: any) => r.cpa || 0)).toFixed(2)}. Top spender: ${parsed[0]?.platform || "N/A"} at $${parsed[0]?.cpa?.toFixed(2) || "0"}.`;
    case "top_campaign":
      return `Your best campaign is "${parsed[0]?.name}" on ${parsed[0]?.platform} with ${parsed[0]?.roas}x ROAS generating $${parsed[0]?.revenue?.toLocaleString() || 0} from $${parsed[0]?.spend?.toLocaleString() || 0} spend.`;
    case "budget_waste":
      return `${parsed.length} campaign(s) are spending with ROAS below 2x: ${parsed.map((c: any) => `${c.name} (${c.roas}x)`).join(", ")}. Consider pausing or reallocating budget.`;
    case "platform_comparison":
      return `Platform comparison: ${parsed.map((p: any) => `${p.platform} (${p.roas}x ROAS, $${p.total_spend?.toLocaleString()} spend)`).join(" vs ")}.`;
    default:
      return `Based on your data: ${JSON.stringify(parsed.slice(0, 3))}`;
  }
}

export function nlRoutes(ctx: ServiceContext): Router {
  const router = Router();

  // POST /api/query — Natural language question
  router.post("/query", async (req: Request, res: Response) => {
    const queryId = `nq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const { tenantId, question } = req.body;
      if (!tenantId || !question) return res.status(400).json({ error: "tenantId and question required" });

      const intent = classifyIntent(question);
      const data = await fetchDataForIntent(ctx, tenantId, intent);
      const answer = generateFallbackAnswer(intent, data, question);

      await publishEvent(ctx.producer, "kiki.nl.analytics", {
        eventId: queryId, eventType: "nl.query.answered", topic: "kiki.nl.analytics",
        tenantId, timestamp: Date.now(), version: "1.0",
        payload: { queryId, question, intent, answerLength: answer.length, groundedInData: true, responseTimeMs: 0 },
      });

      res.json({ success: true, data: { queryId, intent, answer, groundedInData: true } });
    } catch (e: any) {
      await publishEvent(ctx.producer, "kiki.nl.analytics", {
        eventId: queryId, eventType: "nl.query.failed", topic: "kiki.nl.analytics",
        tenantId: req.body?.tenantId || "unknown", timestamp: Date.now(), version: "1.0",
        payload: { queryId, question: req.body?.question || "", error: e.message },
      });
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/suggestions — Contextual question prompts
  router.get("/suggestions", async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;
      const suggestions: string[] = [];

      const lowRoas = await ctx.db.query(
        `SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = $1 AND status = 'active' AND roas < 2`, [tenantId]
      );
      if (parseInt(lowRoas.rows[0]?.c || "0") > 0) suggestions.push("Why are some campaigns underperforming?");

      const signals = await ctx.db.query(
        `SELECT COUNT(*) as c FROM signals WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`, [tenantId]
      );
      if (parseInt(signals.rows[0]?.c || "0") > 0) suggestions.push("How are my signals performing today?");

      const platforms = await ctx.db.query(
        `SELECT DISTINCT platform FROM campaigns WHERE tenant_id = $1`, [tenantId]
      );
      if (platforms.rows.length > 1) suggestions.push("Compare Meta vs Google performance");

      suggestions.push("What's my best campaign right now?");
      suggestions.push("Show me my LTV segment distribution");
      suggestions.push("Which platform has the best ROAS?");

      res.json({ success: true, data: suggestions.slice(0, 6) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

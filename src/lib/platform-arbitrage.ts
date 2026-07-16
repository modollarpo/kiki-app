import { getDb } from "./db";
import { logger } from "./logger";

export interface ArbitrageDecision {
  tenantId: string;
  fromPlatform: string;
  toPlatform: string;
  amount: number;
  reason: string;
  ltvPerDollarFrom: number;
  ltvPerDollarTo: number;
}

const GUARDRAILS = {
  minPlatformBudget: 100,
  maxPlatformShare: 0.70,
  minShiftAmount: 50,
  maxShiftPercentage: 0.30,
};

export async function runArbitrageCycle(): Promise<ArbitrageDecision[]> {
  const db = await getDb();
  const tenants = await db.prepare(`
    SELECT DISTINCT tenant_id FROM tenant_integrations WHERE status = 'active'
  `).all() as Array<{ tenant_id: string }>;

  const allDecisions: ArbitrageDecision[] = [];

  for (const { tenant_id: tenantId } of tenants) {
    const decisions = await evaluateArbitrage(tenantId);
    allDecisions.push(...decisions);

    for (const decision of decisions) {
      await executeArbitrageDecision(decision);
    }
  }

  if (allDecisions.length > 0) {
    logger.info(`Arbitrage cycle: ${allDecisions.length} budget shifts executed`);
  }
  return allDecisions;
}

async function evaluateArbitrage(tenantId: string): Promise<ArbitrageDecision[]> {
  const db = await getDb();
  const decisions: ArbitrageDecision[] = [];

  // Get latest metrics per platform
  const platformMetrics = await db.prepare(`
    SELECT DISTINCT ON (platform)
      platform, SUM(spend) as total_spend, SUM(revenue) as total_revenue,
      SUM(conversions) as total_conversions
    FROM campaign_metrics_snapshot
    WHERE tenant_id = ? AND collected_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    GROUP BY platform
  `).all(tenantId) as Array<{
    platform: string; total_spend: number; total_revenue: number; total_conversions: number;
  }>;

  if (platformMetrics.length < 2) return decisions;

  // Calculate LTV per dollar for each platform
  const ltvPerDollar = platformMetrics.map(pm => ({
    platform: pm.platform,
    ltvPerDollar: pm.total_spend > 0 ? pm.total_revenue / pm.total_spend : 0,
    spend: pm.total_spend,
    conversions: pm.total_conversions,
  }));

  // Sort by LTV per dollar descending
  ltvPerDollar.sort((a, b) => b.ltvPerDollar - a.ltvPerDollar);

  const best = ltvPerDollar[0];
  const worst = ltvPerDollar[ltvPerDollar.length - 1];

  if (!best || !worst || best.platform === worst.platform) return decisions;
  if (best.ltvPerDollar <= worst.ltvPerDollar * 1.2) return decisions; // Need 20%+ advantage to shift

  // Calculate shift amount
  const totalSpend = ltvPerDollar.reduce((sum, p) => sum + p.spend, 0);
  const maxShift = Math.min(
    worst.spend * GUARDRAILS.maxShiftPercentage,
    totalSpend * 0.15 // Never shift more than 15% of total
  );

  if (maxShift < GUARDRAILS.minShiftAmount) return decisions;

  // Check guardrails
  const worstNewSpend = worst.spend - maxShift;
  const bestNewSpend = best.spend + maxShift;
  const worstShare = worstNewSpend / (totalSpend);
  const bestShare = bestNewSpend / (totalSpend);

  if (worstNewSpend < GUARDRAILS.minPlatformBudget) return decisions;
  if (bestShare > GUARDRAILS.maxPlatformShare) return decisions;

  decisions.push({
    tenantId,
    fromPlatform: worst.platform,
    toPlatform: best.platform,
    amount: maxShift,
    reason: `${best.platform} delivers ${(best.ltvPerDollar / worst.ltvPerDollar).toFixed(1)}× better LTV per dollar than ${worst.platform}`,
    ltvPerDollarFrom: worst.ltvPerDollar,
    ltvPerDollarTo: best.ltvPerDollar,
  });

  return decisions;
}

async function executeArbitrageDecision(decision: ArbitrageDecision): Promise<void> {
  const db = await getDb();

  // Log the decision
  await db.prepare(`
    INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
    VALUES (?, 'arbitrage.shift', ?, ?, CURRENT_TIMESTAMP)
  `).run(
    decision.tenantId,
    decision.amount,
    JSON.stringify({
      from: decision.fromPlatform,
      to: decision.toPlatform,
      reason: decision.reason,
      ltvPerDollarFrom: decision.ltvPerDollarFrom,
      ltvPerDollarTo: decision.ltvPerDollarTo,
    })
  );

  // Get integrations and attempt to shift budget
  const integrations = await db.prepare(`
    SELECT platform, access_token FROM tenant_integrations
    WHERE tenant_id = ? AND platform IN (?, ?) AND status = 'active'
  `).all(decision.tenantId, decision.fromPlatform, decision.toPlatform) as Array<{
    platform: string; access_token: string;
  }>;

  const fromInteg = integrations.find(i => i.platform === decision.fromPlatform);
  const toInteg = integrations.find(i => i.platform === decision.toPlatform);

  if (fromInteg && toInteg) {
    try {
      const { getConnector } = await import("./connectors");
      const fromConnector = await getConnector(decision.fromPlatform as any);
      const toConnector = await getConnector(decision.toPlatform as any);

      // Reduce budget on underperforming platform
      if (fromConnector?.updateCampaign) {
        const campaigns = await fromConnector.listCampaigns!(fromInteg.access_token, decision.tenantId);
        if (campaigns.success && campaigns.data) {
          for (const c of campaigns.data) {
            if (c.status === "active" && c.dailyBudget > 0) {
              const reduction = Math.min(decision.amount / campaigns.data.length, c.dailyBudget * GUARDRAILS.maxShiftPercentage);
              await fromConnector.updateCampaign(fromInteg.access_token, c.id, {
                dailyBudget: c.dailyBudget - reduction,
              });
            }
          }
        }
      }

      // Increase budget on top performer
      if (toConnector?.updateCampaign) {
        const campaigns = await toConnector.listCampaigns!(toInteg.access_token, decision.tenantId);
        if (campaigns.success && campaigns.data) {
          for (const c of campaigns.data) {
            if (c.status === "active") {
              const increase = decision.amount / campaigns.data.length;
              await toConnector.updateCampaign(toInteg.access_token, c.id, {
                dailyBudget: c.dailyBudget + increase,
              });
            }
          }
        }
      }

      logger.info(`Arbitrage executed: $${decision.amount.toFixed(0)} from ${decision.fromPlatform} to ${decision.toPlatform}`, {
        tenantId: decision.tenantId,
      });
    } catch (error) {
      logger.error(`Arbitrage execution failed`, { tenantId: decision.tenantId, error: String(error) });
    }
  }
}

export async function getArbitrageHistory(
  tenantId: string,
  limit: number = 20
): Promise<Array<{
  from: string;
  to: string;
  amount: number;
  reason: string;
  timestamp: string;
}>> {
  const db = await getDb();
  const rows = await db.prepare(`
    SELECT metric_value, tags, created_at
    FROM system_metrics
    WHERE tenant_id = ? AND metric_name = 'arbitrage.shift'
    ORDER BY created_at DESC LIMIT ?
  `).all(tenantId, limit) as Array<{ metric_value: number; tags: string; created_at: string }>;

  return rows.map(r => {
    const tags = JSON.parse(r.tags);
    return {
      from: tags.from,
      to: tags.to,
      amount: r.metric_value,
      reason: tags.reason,
      timestamp: r.created_at,
    };
  });
}

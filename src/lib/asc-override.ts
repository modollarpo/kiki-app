import { getDb } from "./db";
import { logger } from "./logger";

export interface ProductSuppressionRule {
  field: string;
  operator: "gt" | "lt" | "eq" | "contains";
  value: number | string;
  reason: string;
}

const DEFAULT_SUPPRESSION_RULES: ProductSuppressionRule[] = [
  { field: "cac", operator: "gt", value: 200, reason: "High CAC" },
  { field: "repeat_rate", operator: "lt", value: 0.1, reason: "Low repeat purchase rate" },
  { field: "margin", operator: "lt", value: 0.15, reason: "Low margin" },
  { field: "ltv_contribution", operator: "lt", value: 50, reason: "Low LTV contribution" },
];

export async function evaluateCatalog(
  tenantId: string,
  rules: ProductSuppressionRule[] = DEFAULT_SUPPRESSION_RULES
): Promise<{
  totalProducts: number;
  suppressed: number;
  suppressedProducts: Array<{ id: string; name: string; reason: string }>;
  keptProducts: number;
}> {
  const db = await getDb();
  const products = await db.prepare(`
    SELECT id, name, price, ltv_contribution, cac, repeat_rate, margin
    FROM catalog_products
    WHERE tenant_id = ?
  `).all(tenantId) as Array<{
    id: string; name: string; price: number; ltv_contribution: number;
    cac: number; repeat_rate: number; margin: number;
  }>;

  let suppressed = 0;
  const suppressedProducts: Array<{ id: string; name: string; reason: string }> = [];

  for (const product of products) {
    for (const rule of rules) {
      const fieldValue = (product as any)[rule.field];
      if (fieldValue === undefined) continue;

      let matches = false;
      switch (rule.operator) {
        case "gt": matches = fieldValue > rule.value; break;
        case "lt": matches = fieldValue < rule.value; break;
        case "eq": matches = fieldValue === rule.value; break;
        case "contains": matches = String(fieldValue).includes(String(rule.value)); break;
      }

      if (matches) {
        await db.prepare(`
          UPDATE catalog_products SET suppressed = 1, suppression_reason = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(rule.reason, product.id);
        suppressedProducts.push({ id: product.id, name: product.name, reason: rule.reason });
        suppressed++;
        break;
      }
    }
  }

  const keptProducts = products.length - suppressed;

  logger.info(`Catalog evaluation: ${suppressed}/${products.length} products suppressed`, { tenantId });
  return { totalProducts: products.length, suppressed, suppressedProducts, keptProducts };
}

export async function buildLTVSeedAudience(
  tenantId: string,
  minLtv: number = 500,
  limit: number = 1000
): Promise<Array<{ email?: string; phone?: string; external_id?: string; predicted_ltv: number }>> {
  const db = await getDb();
  return await db.prepare(`
    SELECT email, phone, external_id, predicted_ltv
    FROM customer_profiles
    WHERE tenant_id = ? AND predicted_ltv >= ?
    ORDER BY predicted_ltv DESC
    LIMIT ?
  `).all(tenantId, minLtv, limit) as any[];
}

export async function getCatalogStats(tenantId: string): Promise<{
  total: number;
  suppressed: number;
  suppressionReasons: Record<string, number>;
  avgMargin: number;
  avgLtvContribution: number;
}> {
  const db = await getDb();
  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN suppressed = 1 THEN 1 ELSE 0 END) as suppressed,
      AVG(margin) as avg_margin,
      AVG(ltv_contribution) as avg_ltv
    FROM catalog_products WHERE tenant_id = ?
  `).get(tenantId) as { total: number; suppressed: number; avg_margin: number; avg_ltv: number };

  const reasons = await db.prepare(`
    SELECT suppression_reason, COUNT(*) as cnt
    FROM catalog_products
    WHERE tenant_id = ? AND suppressed = 1 AND suppression_reason IS NOT NULL
    GROUP BY suppression_reason
  `).all(tenantId) as Array<{ suppression_reason: string; cnt: number }>;

  const suppressionReasons: Record<string, number> = {};
  for (const r of reasons) suppressionReasons[r.suppression_reason] = r.cnt;

  return {
    total: stats.total,
    suppressed: stats.suppressed,
    suppressionReasons,
    avgMargin: stats.avg_margin || 0,
    avgLtvContribution: stats.avg_ltv || 0,
  };
}

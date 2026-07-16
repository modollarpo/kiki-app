import { getDb } from "./db";
import { logger } from "./logger";

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    minLtv?: number;
    maxLtv?: number;
    minOrders?: number;
    maxOrders?: number;
    maxDaysSinceLastOrder?: number;
    ltvSegments?: string[];
    churnRiskBelow?: number;
  };
  memberCount: number;
  platformMappings: Record<string, { audienceId: string; lastSynced: string }>;
}

const CANONICAL_SEGMENTS: Omit<AudienceSegment, "id" | "memberCount" | "platformMappings">[] = [
  {
    name: "Champions",
    description: "Top 10% LTV customers. Highest repeat purchase rate. Priority for upsell and retention.",
    criteria: { minLtv: 500, minOrders: 3, ltvSegments: ["high"] },
  },
  {
    name: "Loyalists",
    description: "Consistent purchasers with above-average LTV. Core revenue base.",
    criteria: { minLtv: 200, maxLtv: 500, minOrders: 2, ltvSegments: ["high", "mid"] },
  },
  {
    name: "At-Risk",
    description: "Previously active customers showing declining engagement. Trigger win-back campaigns.",
    criteria: { maxDaysSinceLastOrder: 60, minOrders: 1, churnRiskBelow: 0.5, ltvSegments: ["mid", "low"] },
  },
  {
    name: "Churned",
    description: "No purchase in 90+ days. Suppress from active campaigns to prevent wasted spend.",
    criteria: { maxDaysSinceLastOrder: 90, ltvSegments: ["low", "churn_risk"] },
  },
  {
    name: "High-Potential",
    description: "First-time buyers with high predicted LTV. Target for second purchase.",
    criteria: { minOrders: 1, maxOrders: 1, minLtv: 300, ltvSegments: ["high", "mid"] },
  },
  {
    name: "Low-LTV",
    description: "Customers with below-average LTV and low repeat probability. Suppress or deprioritize.",
    criteria: { maxLtv: 80, ltvSegments: ["low", "churn_risk"] },
  },
  {
    name: "Exclusion",
    description: "Do-not-target list. Includes recent purchasers (within 3 days) and unsubscribed users.",
    criteria: { maxDaysSinceLastOrder: 3 },
  },
];

export async function syncAudienceSegments(tenantId: string): Promise<AudienceSegment[]> {
  const db = await getDb();
  const segments: AudienceSegment[] = [];

  for (const canonical of CANONICAL_SEGMENTS) {
    const existing = await db.prepare(`
      SELECT id, platform_mappings FROM audience_segments
      WHERE tenant_id = ? AND name = ?
    `).get(tenantId, canonical.name) as { id: string; platform_mappings: string } | undefined;

    const segmentId = existing?.id || `${tenantId}_${canonical.name.toLowerCase().replace(/\s+/g, "_")}`;
    const platformMappings = existing ? JSON.parse(existing.platform_mappings || "{}") : {};

    const memberCount = await countSegmentMembers(tenantId, canonical.criteria);

    if (existing) {
      await db.prepare(`
        UPDATE audience_segments
        SET member_count = ?, criteria = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(memberCount, JSON.stringify(canonical.criteria), segmentId);
    } else {
      await db.prepare(`
        INSERT INTO audience_segments (id, tenant_id, name, description, segment_type, criteria, member_count, platform_mappings)
        VALUES (?, ?, ?, ?, 'ltv', ?, ?, ?)
      `).run(segmentId, tenantId, canonical.name, canonical.description, JSON.stringify(canonical.criteria), memberCount, JSON.stringify(platformMappings));
    }

    segments.push({
      id: segmentId,
      name: canonical.name,
      description: canonical.description,
      criteria: canonical.criteria,
      memberCount,
      platformMappings,
    });
  }

  logger.info(`Synced ${segments.length} audience segments`, { tenantId });
  return segments;
}

async function countSegmentMembers(tenantId: string, criteria: AudienceSegment["criteria"]): Promise<number> {
  const db = await getDb();
  const conditions: string[] = ["tenant_id = ?"];
  const params: any[] = [tenantId];

  if (criteria.minLtv !== undefined) {
    conditions.push("predicted_ltv >= ?");
    params.push(criteria.minLtv);
  }
  if (criteria.maxLtv !== undefined) {
    conditions.push("predicted_ltv <= ?");
    params.push(criteria.maxLtv);
  }
  if (criteria.minOrders !== undefined) {
    conditions.push("total_orders >= ?");
    params.push(criteria.minOrders);
  }
  if (criteria.maxOrders !== undefined) {
    conditions.push("total_orders <= ?");
    params.push(criteria.maxOrders);
  }
  if (criteria.maxDaysSinceLastOrder !== undefined) {
    conditions.push("days_since_last_order <= ?");
    params.push(criteria.maxDaysSinceLastOrder);
  }
  if (criteria.ltvSegments && criteria.ltvSegments.length > 0) {
    conditions.push(`ltv_segment IN (${criteria.ltvSegments.map(() => "?").join(",")})`);
    params.push(...criteria.ltvSegments);
  }
  if (criteria.churnRiskBelow !== undefined) {
    conditions.push("churn_risk <= ?");
    params.push(criteria.churnRiskBelow);
  }

  const result = await db.prepare(`
    SELECT COUNT(*) as cnt FROM customer_profiles
    WHERE ${conditions.join(" AND ")}
  `).get(...params) as { cnt: number };

  return result.cnt;
}

export async function pushSegmentToPlatforms(tenantId: string): Promise<{
  pushed: number;
  errors: string[];
}> {
  const db = await getDb();
  const segments = await db.prepare(`
    SELECT id, name, criteria, platform_mappings FROM audience_segments
    WHERE tenant_id = ? AND status = 'active'
  `).all(tenantId) as Array<{ id: string; name: string; criteria: string; platform_mappings: string }>;

  const integrations = await db.prepare(`
    SELECT id, platform, access_token FROM tenant_integrations
    WHERE tenant_id = ? AND status = 'active'
  `).all(tenantId) as Array<{ id: string; platform: string; access_token: string }>;

  let pushed = 0;
  const errors: string[] = [];

  for (const segment of segments) {
    const criteria = JSON.parse(segment.criteria);
    const members = await getSegmentMembers(tenantId, criteria);
    if (members.length === 0) continue;

    for (const integ of integrations) {
      try {
        const { getConnector } = await import("./connectors");
        const connector = await getConnector(integ.platform as any);
        if (!connector?.createCustomAudience) continue;

        const result = await connector.createCustomAudience(integ.access_token, {
          name: `KIKI - ${segment.name}`,
          users: {
            emails: members.map(m => m.email).filter(Boolean),
            phones: members.map(m => m.phone).filter(Boolean),
            externalIds: members.map(m => m.external_id).filter(Boolean),
          },
        });

        if (result.success && result.data) {
          const mappings = JSON.parse(segment.platform_mappings || "{}");
          mappings[integ.platform] = {
            audienceId: result.data.id || result.data.audience_id || "",
            lastSynced: new Date().toISOString(),
          };
          await db.prepare(`
            UPDATE audience_segments SET platform_mappings = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(JSON.stringify(mappings), segment.id);
          pushed++;
        }
      } catch (error) {
        errors.push(`${segment.name}@${integ.platform}: ${String(error)}`);
      }
    }
  }

  logger.info(`Pushed ${pushed} audience segments to platforms`, { tenantId, errors: errors.length });
  return { pushed, errors };
}

async function getSegmentMembers(
  tenantId: string,
  criteria: AudienceSegment["criteria"]
): Promise<Array<{ email?: string; phone?: string; external_id?: string }>> {
  const db = await getDb();
  const conditions: string[] = ["tenant_id = ?"];
  const params: any[] = [tenantId];

  if (criteria.minLtv !== undefined) { conditions.push("predicted_ltv >= ?"); params.push(criteria.minLtv); }
  if (criteria.maxLtv !== undefined) { conditions.push("predicted_ltv <= ?"); params.push(criteria.maxLtv); }
  if (criteria.minOrders !== undefined) { conditions.push("total_orders >= ?"); params.push(criteria.minOrders); }
  if (criteria.maxOrders !== undefined) { conditions.push("total_orders <= ?"); params.push(criteria.maxOrders); }
  if (criteria.maxDaysSinceLastOrder !== undefined) { conditions.push("days_since_last_order <= ?"); params.push(criteria.maxDaysSinceLastOrder); }
  if (criteria.ltvSegments && criteria.ltvSegments.length > 0) {
    conditions.push(`ltv_segment IN (${criteria.ltvSegments.map(() => "?").join(",")})`);
    params.push(...criteria.ltvSegments);
  }
  if (criteria.churnRiskBelow !== undefined) { conditions.push("churn_risk <= ?"); params.push(criteria.churnRiskBelow); }

  return await db.prepare(`
    SELECT email, phone, external_id FROM customer_profiles
    WHERE ${conditions.join(" AND ")}
  `).all(...params) as any[];
}

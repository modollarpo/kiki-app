import { getDb } from '@/lib/db'

export async function getAttributionBreakdown(tenantId: string) {
  const db = await getDb()
  const rows = await db.prepare("" +
    "SELECT COALESCE(creative_id,'unknown') as creative_id, COALESCE(platform,'unknown') as platform, COUNT(*) as attributions, COALESCE(SUM(revenue),0) as total_revenue, COALESCE(SUM(predicted_ltv_90d),0) as total_ltv FROM signals WHERE tenant_id = ? AND creative_id IS NOT NULL GROUP BY creative_id, platform ORDER BY total_revenue DESC LIMIT 100"
  ).all(tenantId)
  return { ok: true, data: (rows as any[]) || [] }
}
export async function createAttribution(tenantId: string, _body: any) {
  return { ok: true, attributionId: 'attr_' + Date.now() }
}
export async function updateAttributionSettings(tenantId: string, _body: any) {
  return { ok: true }
}

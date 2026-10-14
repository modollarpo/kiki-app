import { getDb } from '@/lib/db'

export async function createMargin(tenantId: string, _body: any) {
  return { ok: true, marginId: 'mgn_' + Date.now() }
}

export async function getPortfolio(tenantId: string) {
  const db = await getDb()
  const rows = await db.prepare("" +
    "SELECT sku, product_name, cogs, price, margin_pct, stock, updated_at FROM profit_margins WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 200"
  ).all(tenantId)
  const arr = (rows as any[]) || []
  const total = arr.length
  const sumMarg = arr.reduce((s: number, r: any) => s + (Number(r.margin_pct) || 0), 0)
  const low = arr.filter((r: any) => (Number(r.margin_pct) || 0) < 15).length
  const high = arr.filter((r: any) => (Number(r.margin_pct) || 0) > 40).length
  const mid = total - low - high
  return {
    ok: true,
    data: {
      summary: {
        total_skus: total,
        avg_margin: total ? Number((sumMarg / total).toFixed(1)) : 0,
        total_cogs: 0,
        total_revenue: 0,
        low_margin_count: low,
        mid_margin_count: mid,
        high_margin_count: high,
      },
      distribution: [
        { bucket: '<15%', count: low, avg_margin: 0 },
        { bucket: '15-40%', count: mid, avg_margin: 0 },
        { bucket: '>40%', count: high, avg_margin: 0 },
      ],
      products: arr,
    },
  }
}

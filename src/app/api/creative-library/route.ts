import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();

  // Use campaigns as creative assets (each campaign represents a creative)
  const assets = await db.prepare(`
    SELECT
      id, name, platform, status, roas, spend, impressions, clicks, conversions, cpa
    FROM campaigns
    WHERE tenant_id = ?
    ORDER BY roas DESC
  `).all(user.tenantId) as any[];

  // Calculate summary stats
  const totalAssets = assets.length;
  const avgCtr = assets.length > 0
    ? assets.reduce((sum: number, a: any) => sum + (a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0), 0) / assets.length
    : 0;
  const totalConversions = assets.reduce((sum: number, a: any) => sum + (a.conversions || 0), 0);
  const avgRoas = assets.length > 0
    ? assets.reduce((sum: number, a: any) => sum + (a.roas || 0), 0) / assets.length
    : 0;

  return json({
    assets: assets.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.platform === "youtube" || a.platform === "tiktok" ? "Video" : "Image",
      platform: a.platform,
      status: a.status,
      ctr: a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(1) : "0.0",
      conversions: a.conversions || 0,
      roas: a.roas || 0,
      spend: a.spend || 0,
    })),
    summary: {
      totalAssets,
      avgCtr: avgCtr.toFixed(1),
      totalConversions,
      avgRoas: avgRoas.toFixed(1),
    },
  });
}

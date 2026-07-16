import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();

    // AI-generated creatives from the creative agent
    const generatedCreatives = await db.prepare(`
      SELECT id, tenant_id, campaign_id, type, content, platform, status, ai_score, created_at
      FROM creatives
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `).all(user.tenantId) as any[];

    // Campaign-based assets (each campaign represents a creative)
    const campaignAssets = await db.prepare(`
      SELECT
        id, name, platform, status, roas, spend, impressions, clicks, conversions, cpa
      FROM campaigns
      WHERE tenant_id = ?
      ORDER BY roas DESC
    `).all(user.tenantId) as any[];

    // Merge: AI-generated creatives as standalone entries + campaign assets
    const aiCreatives = generatedCreatives.map((c: any) => {
      let parsed: Record<string, string> = {};
      try { parsed = JSON.parse(c.content); } catch { parsed = { headline: c.content }; }
      return {
        id: c.id,
        name: parsed.headline || parsed.text || "AI Creative",
        type: "AI Generated",
        platform: c.platform,
        status: c.status,
        ctr: "—",
        conversions: 0,
        roas: 0,
        spend: 0,
        aiScore: c.ai_score,
        createdAt: c.created_at,
      };
    });

    const campaignCreatives = campaignAssets.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.platform === "youtube" || a.platform === "tiktok" ? "Video" : "Image",
      platform: a.platform,
      status: a.status,
      ctr: a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(1) : "0.0",
      conversions: a.conversions || 0,
      roas: a.roas || 0,
      spend: a.spend || 0,
      aiScore: null,
      createdAt: null,
    }));

    const assets = [...aiCreatives, ...campaignCreatives];

    // Calculate summary stats
    const totalAssets = assets.length;
    const avgCtr = campaignAssets.length > 0
      ? campaignAssets.reduce((sum: number, a: any) => sum + (a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0), 0) / campaignAssets.length
      : 0;
    const totalConversions = campaignAssets.reduce((sum: number, a: any) => sum + (a.conversions || 0), 0);
    const avgRoas = campaignAssets.length > 0
      ? campaignAssets.reduce((sum: number, a: any) => sum + (a.roas || 0), 0) / campaignAssets.length
      : 0;

    return json({
      assets,
      summary: {
        totalAssets,
        avgCtr: avgCtr.toFixed(1),
        totalConversions,
        avgRoas: avgRoas.toFixed(1),
        aiGenerated: aiCreatives.length,
      },
    });
  } catch (error) {
    logger.error("creative-library/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load creative library", 500);
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const { campaignId, type, content, platform, status, aiScore } = body;

    if (!content || typeof content !== "string") {
      return jsonError("content is required");
    }

    const validTypes = ["headline", "cta", "description"];
    const creativeType = validTypes.includes(type) ? type : "headline";

    const validPlatforms = ["meta", "google", "tiktok", "youtube", "linkedin", "multi"];
    const creativePlatform = validPlatforms.includes(platform) ? platform : "multi";

    const validStatuses = ["draft", "approved", "rejected"];
    const creativeStatus = validStatuses.includes(status) ? status : "draft";

    const db = await getDb();
    const id = genId("cr");
    await db.prepare(`
      INSERT INTO creatives (id, tenant_id, campaign_id, type, content, platform, status, ai_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, user.tenantId, campaignId || null,
      creativeType, content, creativePlatform, creativeStatus,
      typeof aiScore === "number" ? aiScore : 0
    );

    return json({ ok: true, id }, 201);
  } catch (error) {
    logger.error("creative-library/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to save creative", 500);
  }
}

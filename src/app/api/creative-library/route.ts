export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { logger } from "@/lib/logger";

export interface CreativeRow {
  id: string;
  tenant_id: string;
  campaign_id: string | null;
  type: string;
  content: string;
  platform: string;
  status: string;
  ai_score: number;
  created_at: string;
}

export interface CampaignAssetRow {
  id: string;
  name: string;
  platform: string;
  status: string;
  roas: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
}

export interface CreativeSummary {
  totalAssets: number;
  avgCtr: string;
  totalConversions: number;
  avgRoas: string;
  aiGenerated: number;
}

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
    `).all<CreativeRow>(user.tenantId);

    // Campaign-based assets (each campaign represents a creative)
    const campaignAssets = await db.prepare(`
      SELECT
        id, name, platform, status, roas, spend, impressions, clicks, conversions, cpa
      FROM campaigns
      WHERE tenant_id = ?
      ORDER BY roas DESC
    `).all<CampaignAssetRow>(user.tenantId);

// Merge: AI-generated creatives as standalone entries + campaign assets
    const aiCreatives = generatedCreatives.map((c: CreativeRow) => {
      let parsed: { headline?: string; text?: string } = {};
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

    const campaignCreatives = campaignAssets.map((a: CampaignAssetRow) => ({
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
      ? campaignAssets.reduce((sum, a) => sum + (a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0), 0) / campaignAssets.length
      : 0;
    const totalConversions = campaignAssets.reduce((sum, a) => sum + (a.conversions || 0), 0);
    const avgRoas = campaignAssets.length > 0
      ? campaignAssets.reduce((sum, a) => sum + (a.roas || 0), 0) / campaignAssets.length
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

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  try {
    const body = await req.json();
    const { campaignId, type, content, platform, status, aiScore, name } = body;

    if (!content || typeof content !== "string") {
      return jsonError("content is required");
    }

    const validTypes = ["headline", "cta", "description", "image", "video", "copy"];
    const creativeType = validTypes.includes(type) ? type : "headline";

    const validPlatforms = ["meta", "google", "tiktok", "youtube", "linkedin", "multi", "pinterest"];
    const creativePlatform = validPlatforms.includes(platform) ? platform : "multi";

    const validStatuses = ["draft", "approved", "rejected"];
    const creativeStatus = validStatuses.includes(status) ? status : "draft";

    const db = await getDb();
    const id = genId("cr");
    const contentStr = typeof content === "object" ? JSON.stringify(content) : content;
    await db.prepare(`
      INSERT INTO creatives (id, tenant_id, campaign_id, type, content, platform, status, ai_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, user.tenantId, campaignId || null,
      creativeType, contentStr, creativePlatform, creativeStatus,
      typeof aiScore === "number" ? aiScore : 0
    );

    return json({ ok: true, id, asset: { id, name: name || (typeof content === "object" ? (content as any).headline : "Creative"), type: creativeType, platform: creativePlatform, status: creativeStatus } }, 201);
  } catch (error) {
    logger.error("creative-library/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to save creative", 500);
  }
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("id required", 400);
    const db = await getDb();
    await db.prepare("DELETE FROM creatives WHERE id = ? AND tenant_id = ?").run(id, user.tenantId);
    return json({ ok: true });
  } catch (error) {
    logger.error("creative-library/DELETE failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to delete creative", 500);
  }
}

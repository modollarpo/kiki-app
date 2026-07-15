import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError, sanitizeString } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");

  let query = "SELECT * FROM campaigns WHERE tenant_id = ?";
  const params: string[] = [user.tenantId];

  if (status) { query += " AND status = ?"; params.push(status); }
  if (platform) { query += " AND platform = ?"; params.push(platform); }

  const campaigns = await (await db.prepare(query)).all(...params) as Array<{
    id: string; tenant_id: string; name: string; platform: string; status: string;
    roas: number; spend: number; budget: number; impressions: number;
    clicks: number; conversions: number; cpa: number; ltv_predicted: number; created_at: string;
  }>;

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const avgRoas = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.length : 0;
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

  return json({
    campaigns: campaigns.map(c => ({
      id: c.id, tenantId: c.tenant_id, name: c.name, platform: c.platform,
      status: c.status, roas: c.roas, spend: c.spend, budget: c.budget,
      impressions: c.impressions, clicks: c.clicks, conversions: c.conversions,
      cpa: c.cpa, ltvPredicted: c.ltv_predicted, createdAt: c.created_at,
    })),
    summary: {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === "active").length,
      totalSpend, totalBudget,
      avgRoas: Math.round(avgRoas * 100) / 100,
      totalConversions,
    },
  });
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const { name, platform, budget } = body;

    if (!name || typeof name !== "string") return jsonError("Campaign name is required");
    if (name.length > 200) return jsonError("Campaign name too long");
    if (budget !== undefined && (typeof budget !== "number" || budget <= 0 || budget > 10_000_000)) {
      return jsonError("Invalid budget");
    }

    const validPlatforms = ["meta", "google", "tiktok", "linkedin", "youtube", "snapchat", "pinterest", "amazon", "reddit", "dv360", "x", "tradedesk", "criteo", "appnexus"];
    const platformStr = platform || "meta";
    if (!validPlatforms.includes(platformStr)) return jsonError("Invalid platform");

    const id = genId("cmp");
    const db = await getDb();
    await (await db.prepare(`
      INSERT INTO campaigns (id, tenant_id, name, platform, status, budget)
      VALUES (?, ?, ?, ?, 'draft', ?)
    `)).run(id, user.tenantId, sanitizeString(name, 200), platformStr, budget || 10000);

    const campaign = await (await db.prepare("SELECT * FROM campaigns WHERE id = ?")).get(id);
    return json(campaign, 201);
  } catch {
    return jsonError("Invalid request body", 400);
  }
}

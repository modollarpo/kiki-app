import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError, sanitizeString } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { validateSearchParams, validateBody, campaignCreateSchema, campaignQuerySchema } from "@/lib/validation";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const rl = checkRateLimit(`campaigns:GET:${getClientIp(req)}`, { maxRequests: 120 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const parsed = validateSearchParams(req, campaignQuerySchema);
    if (!parsed.ok) return parsed.response;
    const { page, limit, status, platform } = parsed.data;

    const db = await getDb();

  let countQuery = "SELECT COUNT(*) as total FROM campaigns WHERE tenant_id = ?";
  let dataQuery = "SELECT * FROM campaigns WHERE tenant_id = ?";
  const countParams: string[] = [user.tenantId];
  const dataParams: string[] = [user.tenantId];

  if (status) {
    countQuery += " AND status = ?";
    dataQuery += " AND status = ?";
    countParams.push(status);
    dataParams.push(status);
  }
  if (platform) {
    countQuery += " AND platform = ?";
    dataQuery += " AND platform = ?";
    countParams.push(platform);
    dataParams.push(platform);
  }

  const { total } = (await (await db.prepare(countQuery)).get(...countParams)) as { total: number };
  const offset = (page - 1) * limit;
  dataQuery += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  dataParams.push(String(limit), String(offset));

  const campaigns = await (await db.prepare(dataQuery)).all(...dataParams) as Array<{
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
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        total,
        active: campaigns.filter(c => c.status === "active").length,
        totalSpend, totalBudget,
        avgRoas: Math.round(avgRoas * 100) / 100,
        totalConversions,
      },
    });
  } catch (error) {
    logger.error("campaigns/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load campaigns", 500);
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = checkRateLimit(`campaigns:POST:${getClientIp(req)}`, { maxRequests: 20 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = await validateBody(req, campaignCreateSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { name, platform, budget } = parsed.data;
    const id = genId("cmp");
    const db = await getDb();
    await (await db.prepare(`
      INSERT INTO campaigns (id, tenant_id, name, platform, status, budget)
      VALUES (?, ?, ?, ?, 'draft', ?)
    `)).run(id, user.tenantId, sanitizeString(name, 200), platform, budget || 10000);

    const campaign = await (await db.prepare("SELECT * FROM campaigns WHERE id = ?")).get(id);
    return json(campaign, 201);
  } catch (e) {
    return handleApiError(e, "campaigns/POST failed");
  }
}

export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError, sanitizeString } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

interface CampaignRow {
  id: string; tenant_id: string; name: string; platform: string; status: string;
  roas: number; spend: number; budget: number; impressions: number;
  clicks: number; conversions: number; cpa: number; ltv_predicted: number;
  bid: number; target_cpa: number; target_roas: number; revenue: number;
  created_at: string; updated_at: string;
}

function mapCampaign(row: CampaignRow) {
  return {
    id: row.id, tenantId: row.tenant_id, name: row.name, platform: row.platform,
    status: row.status, roas: row.roas, spend: row.spend, budget: row.budget,
    impressions: row.impressions, clicks: row.clicks, conversions: row.conversions,
    cpa: row.cpa, ltvPredicted: row.ltv_predicted, bid: row.bid,
    targetCpa: row.target_cpa, targetRoas: row.target_roas, revenue: row.revenue,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const { id } = await params;
    const rl = checkRateLimit(`campaigns:GET:${getClientIp(_req)}`, { maxRequests: 120 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const db = await getDb();
    const row = await (await db.prepare(
      "SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?"
    )).get(id, user.tenantId) as CampaignRow | undefined;

    if (!row) return jsonError("Campaign not found", 404);

    return json({ ok: true, campaign: mapCampaign(row) });
  } catch (error) {
    return handleApiError(error, "campaigns/[id]/GET failed");
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = checkRateLimit(`campaigns:PUT:${getClientIp(req)}`, { maxRequests: 20 });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { id } = await params;
    const body = await req.json() as Record<string, unknown>;
    const db = await getDb();

    const existing = await (await db.prepare(
      "SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?"
    )).get(id, user.tenantId) as CampaignRow | undefined;
    if (!existing) return jsonError("Campaign not found", 404);

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = sanitizeString(String(body.name), 200);
      if (name.length === 0) return jsonError("Name cannot be empty", 400);
      updates.push("name = ?");
      values.push(name);
    }
    if (body.budget !== undefined) {
      const budget = Number(body.budget);
      if (isNaN(budget) || budget <= 0) return jsonError("Budget must be a positive number", 400);
      updates.push("budget = ?");
      values.push(budget);
    }
    if (body.status !== undefined) {
      const status = String(body.status);
      if (!["active", "paused", "draft"].includes(status)) {
        return jsonError("Invalid status. Must be: active, paused, or draft", 400);
      }
      updates.push("status = ?");
      values.push(status);
    }

    if (updates.length === 0) {
      return jsonError("No fields to update", 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id, user.tenantId);

    await (await db.prepare(
      `UPDATE campaigns SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
    )).run(...values);

    const updated = await (await db.prepare(
      "SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?"
    )).get(id, user.tenantId) as CampaignRow;

    return json({ ok: true, campaign: mapCampaign(updated) });
  } catch (error) {
    return handleApiError(error, "campaigns/[id]/PUT failed");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = checkRateLimit(`campaigns:PATCH:${getClientIp(req)}`, { maxRequests: 30 });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { id } = await params;
    const body = await req.json() as Record<string, unknown>;
    const db = await getDb();

    const existing = await (await db.prepare(
      "SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?"
    )).get(id, user.tenantId) as CampaignRow | undefined;
    if (!existing) return jsonError("Campaign not found", 404);

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = sanitizeString(String(body.name), 200);
      if (name.length === 0) return jsonError("Name cannot be empty", 400);
      updates.push("name = ?");
      values.push(name);
    }
    if (body.budget !== undefined) {
      const budget = Number(body.budget);
      if (isNaN(budget) || budget <= 0) return jsonError("Budget must be a positive number", 400);
      updates.push("budget = ?");
      values.push(budget);
    }
    if (body.status !== undefined) {
      const status = String(body.status);
      if (!["active", "paused", "draft"].includes(status)) {
        return jsonError("Invalid status. Must be: active, paused, or draft", 400);
      }
      updates.push("status = ?");
      values.push(status);
    }

    if (updates.length === 0) {
      return jsonError("No fields to update", 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id, user.tenantId);

    await (await db.prepare(
      `UPDATE campaigns SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
    )).run(...values);

    const updated = await (await db.prepare(
      "SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?"
    )).get(id, user.tenantId) as CampaignRow;

    return json({ ok: true, campaign: mapCampaign(updated) });
  } catch (error) {
    return handleApiError(error, "campaigns/[id]/PATCH failed");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return jsonError("Unauthorized", 401);

  const rl = checkRateLimit(`campaigns:DELETE:${getClientIp(_req)}`, { maxRequests: 10 });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { id } = await params;
    const db = await getDb();

    const existing = await (await db.prepare(
      "SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?"
    )).get(id, user.tenantId) as CampaignRow | undefined;
    if (!existing) return jsonError("Campaign not found", 404);

    await (await db.prepare(
      "UPDATE campaigns SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?"
    )).run(id, user.tenantId);

    return json({ ok: true, message: "Campaign deleted" });
  } catch (error) {
    return handleApiError(error, "campaigns/[id]/DELETE failed");
  }
}

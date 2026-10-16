export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { logger } from "@/lib/logger";

const SUPPORTED_MODELS = ["last_touch", "first_touch", "linear", "position", "time_decay"];

interface AttrRow {
  creative_id: string;
  platform: string;
  attributions: number;
  total_revenue: number;
  total_ltv: number;
}

interface AttrInput {
  creative_id?: string;
  creativeId?: string;
  platform?: string;
  campaignId?: string;
  campaign_id?: string;
  model?: string;
  attributions?: number;
  revenue?: number;
  ltv?: number;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    const rows = await db.prepare(`
      SELECT creative_id, platform,
             SUM(attributions) AS attributions,
             SUM(total_revenue) AS total_revenue,
             SUM(total_ltv) AS total_ltv
      FROM creative_attributions
      WHERE tenant_id = ?
      GROUP BY creative_id, platform
      ORDER BY total_revenue DESC
      LIMIT 100
    `).all<AttrRow>(user.tenantId);

    const setting = await db.prepare(
      "SELECT model FROM attribution_settings WHERE tenant_id = ?"
    ).get(user.tenantId) as { model: string } | undefined;

    return NextResponse.json({
      ok: true,
      model: setting?.model ?? "last_touch",
      data: rows.map((r) => ({
        creative_id: r.creative_id,
        platform: r.platform,
        attributions: Number(r.attributions),
        total_revenue: Number(r.total_revenue),
        total_ltv: Number(r.total_ltv),
      })),
    });
  } catch (error) {
    logger.error("attribution/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to load attribution breakdown" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

  let body: AttrInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const creativeId = String(body.creative_id ?? body.creativeId ?? "").trim();
  if (!creativeId) {
    return NextResponse.json({ ok: false, error: "creative_id is required" }, { status: 400 });
  }
  const platform = String(body.platform ?? "unknown").trim().toLowerCase();
  const campaignId = body.campaignId ?? body.campaign_id ?? null;
  const model = SUPPORTED_MODELS.includes(String(body.model)) ? String(body.model) : "last_touch";
  const attributions = Math.max(0, Math.round(Number(body.attributions) || 0));
  const revenue = Number(body.revenue) || 0;
  const ltv = Number(body.ltv) || 0;

  try {
    const db = await getDb();
    const id = genId("ca");
    await db.prepare(`
      INSERT INTO creative_attributions
        (id, tenant_id, creative_id, platform, campaign_id, model, attributions, total_revenue, total_ltv)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user.tenantId, creativeId, platform, campaignId, model, attributions, revenue, ltv);

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    logger.error("attribution/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to record attribution" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

  let body: { model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const model = String(body.model ?? "");
  if (!SUPPORTED_MODELS.includes(model)) {
    return NextResponse.json(
      { ok: false, error: `model must be one of: ${SUPPORTED_MODELS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const existing = await db.prepare(
      "SELECT tenant_id FROM attribution_settings WHERE tenant_id = ?"
    ).get(user.tenantId) as { tenant_id: string } | undefined;

    if (existing) {
      await db.prepare(
        "UPDATE attribution_settings SET model = ?, updated_at = datetime('now') WHERE tenant_id = ?"
      ).run(model, user.tenantId);
    } else {
      await db.prepare(
        "INSERT INTO attribution_settings (tenant_id, model) VALUES (?, ?)"
      ).run(user.tenantId, model);
    }

    return NextResponse.json({ ok: true, model });
  } catch (error) {
    logger.error("attribution/PUT failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to save attribution settings" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { logger } from "@/lib/logger";

interface CreatorRow {
  id: string;
  name: string;
  handle: string;
  platform: string;
  promo_code: string;
  cost: number;
  total_conversions: number;
  total_revenue: number;
  total_ltv: number;
}

function toCreator(r: CreatorRow) {
  const revenue = Number(r.total_revenue);
  const cost = Number(r.cost);
  return {
    id: r.id,
    name: r.name,
    handle: r.handle,
    platform: r.platform,
    promoCode: r.promo_code,
    totalConversions: Number(r.total_conversions),
    totalRevenue: revenue,
    totalLtv: Number(r.total_ltv),
    roi: cost > 0 ? Number((revenue / cost).toFixed(2)) : 0,
  };
}

function makePromoCode(handle: string): string {
  const base = handle.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "CREATOR";
  const suffix = genId("").slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "0");
  return `${base}${suffix}`;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    const rows = await db.prepare(
      "SELECT id, name, handle, platform, promo_code, cost, total_conversions, total_revenue, total_ltv FROM creators WHERE tenant_id = ? ORDER BY total_revenue DESC LIMIT 500"
    ).all<CreatorRow>(user.tenantId);

    return NextResponse.json({ ok: true, data: rows.map(toCreator) });
  } catch (error) {
    logger.error("influencer/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to load creators" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

  let body: { name?: string; handle?: string; platform?: string; promoCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const handle = String(body.handle ?? "").trim().replace(/^@?/, "@");
  const platform = String(body.platform ?? "meta").trim().toLowerCase();
  if (!name || !handle || handle === "@") {
    return NextResponse.json({ ok: false, error: "name and handle are required" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const id = genId("cr");
    const promoCode = (body.promoCode && String(body.promoCode).trim()) || makePromoCode(handle);
    await db.prepare(
      "INSERT INTO creators (id, tenant_id, name, handle, platform, promo_code) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, user.tenantId, name, handle, platform, promoCode);

    const row = await db.prepare(
      "SELECT id, name, handle, platform, promo_code, cost, total_conversions, total_revenue, total_ltv FROM creators WHERE id = ?"
    ).get<CreatorRow>(id);

    return NextResponse.json({ ok: true, data: row ? toCreator(row) : null });
  } catch (error) {
    logger.error("influencer/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to create creator" }, { status: 500 });
  }
}

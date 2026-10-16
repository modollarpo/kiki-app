export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { logger } from "@/lib/logger";

interface ProductRow {
  sku: string;
  product_name: string;
  cogs: number;
  price: number;
  margin_pct: number;
  stock: number;
  updated_at: string;
}

interface MarginInput {
  sku?: string;
  productName?: string;
  cogs?: number;
  price?: number;
  stock?: number;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    const rows = await db.prepare(
      "SELECT sku, product_name, cogs, price, margin_pct, stock, updated_at FROM profit_margins WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 500"
    ).all<ProductRow>(user.tenantId);

    const products = rows.map((r) => ({
      sku: r.sku,
      product_name: r.product_name,
      cogs: Number(r.cogs),
      price: Number(r.price),
      margin_pct: Number(r.margin_pct),
      stock: Number(r.stock),
      updated_at: r.updated_at,
    }));

    const total = products.length;
    const sumMargin = products.reduce((s, p) => s + p.margin_pct, 0);
    const sumCogs = products.reduce((s, p) => s + p.cogs, 0);
    const sumPrice = products.reduce((s, p) => s + p.price, 0);
    const low = products.filter((p) => p.margin_pct < 15).length;
    const high = products.filter((p) => p.margin_pct > 40).length;
    const mid = total - low - high;
    const avgOf = (pred: (p: (typeof products)[number]) => boolean) => {
      const xs = products.filter(pred);
      return xs.length ? Number((xs.reduce((s, p) => s + p.margin_pct, 0) / xs.length).toFixed(1)) : 0;
    };

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          total_skus: total,
          avg_margin: total ? Number((sumMargin / total).toFixed(1)) : 0,
          total_cogs: Number(sumCogs.toFixed(2)),
          total_revenue: Number(sumPrice.toFixed(2)),
          low_margin_count: low,
          mid_margin_count: mid,
          high_margin_count: high,
        },
        distribution: [
          { bucket: "<15%", count: low, avg_margin: avgOf((p) => p.margin_pct < 15) },
          { bucket: "15-40%", count: mid, avg_margin: avgOf((p) => p.margin_pct >= 15 && p.margin_pct <= 40) },
          { bucket: ">40%", count: high, avg_margin: avgOf((p) => p.margin_pct > 40) },
        ],
        products,
      },
    });
  } catch (error) {
    logger.error("profit-margin/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to load margin portfolio" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

  let body: { products?: MarginInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const products = Array.isArray(body.products) ? body.products : [];
  if (products.length === 0) {
    return NextResponse.json({ ok: false, error: "products array is required" }, { status: 400 });
  }

  try {
    const db = await getDb();
    let saved = 0;
    for (const p of products) {
      const sku = String(p.sku ?? "").trim();
      if (!sku) continue;
      const cogs = Number(p.cogs) || 0;
      const price = Number(p.price) || 0;
      const stock = Number(p.stock) || 0;
      const margin = price > 0 ? Number((((price - cogs) / price) * 100).toFixed(2)) : 0;
      const name = String(p.productName ?? sku);

      const existing = await db.prepare(
        "SELECT id FROM profit_margins WHERE tenant_id = ? AND sku = ?"
      ).get(user.tenantId, sku) as { id: string } | undefined;

      if (existing) {
        await db.prepare(
          "UPDATE profit_margins SET product_name = ?, cogs = ?, price = ?, margin_pct = ?, stock = ?, updated_at = datetime('now') WHERE tenant_id = ? AND sku = ?"
        ).run(name, cogs, price, margin, stock, user.tenantId, sku);
      } else {
        await db.prepare(
          "INSERT INTO profit_margins (id, tenant_id, sku, product_name, cogs, price, margin_pct, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(genId("pm"), user.tenantId, sku, name, cogs, price, margin, stock);
      }
      saved++;
    }

    return NextResponse.json({ ok: true, saved });
  } catch (error) {
    logger.error("profit-margin/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to save margins" }, { status: 500 });
  }
}

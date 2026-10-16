export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import { runMmmAnalysis } from "@/lib/mmm";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const analysis = await runMmmAnalysis(user.tenantId);
    return NextResponse.json({ ok: true, data: analysis });
  } catch (error) {
    logger.error("mmm-analysis/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to compute MMM analysis" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

  try {
    const analysis = await runMmmAnalysis(user.tenantId);
    return NextResponse.json({ ok: true, data: analysis });
  } catch (error) {
    logger.error("mmm-analysis/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to compute MMM analysis" }, { status: 500 });
  }
}

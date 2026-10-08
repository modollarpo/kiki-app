export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface DarkSocialEvent {
  id?: string | number;
  tenant_id?: string;
  campaign_id?: string | null;
  referrer?: string | null;
  share_count?: number | null;
  converted?: number | null;
  revenue?: number | null;
  created_at?: string;
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const days = parseInt(searchParams.get("days") || "30", 10);

    const { getDb } = await import("@/lib/db");
    const db = await getDb();

    let events: DarkSocialEvent[] = [];
    let hasTable = false;

    try {
      await db.prepare("SELECT 1 FROM dark_social_events LIMIT 1");
      hasTable = true;
    } catch {
      hasTable = false;
    }

    if (hasTable) {
      const query = campaignId
        ? "SELECT * FROM dark_social_events WHERE tenant_id = ? AND campaign_id = ? AND created_at >= datetime('now', ?)"
        : "SELECT * FROM dark_social_events WHERE tenant_id = ? AND created_at >= datetime('now', ?)";
      events = campaignId
        ? (await db.prepare(query).all(user.tenantId, campaignId, `-${days} days`) as DarkSocialEvent[])
        : (await db.prepare(query).all(user.tenantId, `-${days} days`) as DarkSocialEvent[]);
    }

    const shareCount = hasTable
      ? events.reduce((sum: number, e: DarkSocialEvent) => sum + (e.share_count || 0), 0)
      : 0;

    const converted = hasTable ? events.filter((e: DarkSocialEvent) => e.converted) : [];

    const estimatedRevenue = converted.reduce((sum: number, e: DarkSocialEvent) => sum + (e.revenue ?? 0), 0);

    const avgOrderValue = converted.length > 0 ? estimatedRevenue / converted.length : null;

    const topReferrers = hasTable
      ? Object.entries(
          events.reduce((acc: Record<string, number>, e: DarkSocialEvent) => {
            const referrer = e.referrer || "unknown";
            acc[referrer] = (acc[referrer] || 0) + 1;
            return acc;
          }, {})
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([source, count]) => ({ source, count: count as number }))
      : [];

    const dailyBreakdown = hasTable
      ? Object.entries(
          events.reduce((acc: Record<string, number>, e: DarkSocialEvent) => {
            const day = (e.created_at || "").slice(0, 10);
            if (day) acc[day] = (acc[day] || 0) + 1;
            return acc;
          }, {})
        )
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, count]) => ({ date, shares: count as number }))
      : [];

    return NextResponse.json({
      ok: true,
      data: {
        shareCount,
        darkSocialConversions: converted.length,
        conversionRate: shareCount > 0 ? +(converted.length / shareCount * 100).toFixed(2) : 0,
        estimatedRevenue: +estimatedRevenue.toFixed(2),
        avgOrderValue,
        topReferrers,
        dailyBreakdown,
        periodDays: days,
      },
    });
  } catch (error) {
    logger.error("dark-social/handler", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
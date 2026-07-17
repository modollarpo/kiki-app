import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface CountRow { count: number }
interface BalanceRow { balance: number }
interface MetricRow {
  metric_name: string; metric_value: number; tags: string; created_at: string;
}
interface CampaignStatRow {
  active: number; paused: number; draft: number; total_spend: number; total_revenue: number;
}
interface StatusCount { status: string; count: number }

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "admin" && user.role !== "superadmin") {
    return jsonError("Forbidden: admin access required", 403);
  }

  try {
    const db = await getDb();
    const tid = user.tenantId;

    const [userCount, agentCount, campaignCount, walletBalance, recentMetrics, campaignStats, agentStatuses] =
      await Promise.all([
        db.prepare("SELECT COUNT(*) as count FROM users WHERE tenant_id = ?").get(tid),
        db.prepare("SELECT COUNT(*) as count FROM agents WHERE tenant_id = ?").get(tid),
        db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE tenant_id = ?").get(tid),
        db.prepare("SELECT COALESCE(balance, 0) as balance FROM wallets WHERE tenant_id = ?").get(tid),
        db.prepare(`
          SELECT metric_name, metric_value, tags, created_at
          FROM system_metrics
          WHERE tenant_id = ? OR tenant_id IS NULL
          ORDER BY created_at DESC LIMIT 20
        `).all(tid),
        db.prepare(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'paused') as paused,
            COUNT(*) FILTER (WHERE status = 'draft') as draft,
            COALESCE(SUM(spend), 0) as total_spend,
            COALESCE(SUM(revenue), 0) as total_revenue
          FROM campaigns WHERE tenant_id = ?
        `).get(tid),
        db.prepare("SELECT status, COUNT(*) as count FROM agents WHERE tenant_id = ? GROUP BY status").all(tid),
      ]);

    const u = userCount as CountRow;
    const a = agentCount as CountRow;
    const c = campaignCount as CountRow;
    const w = walletBalance as BalanceRow | undefined;
    const metrics = recentMetrics as MetricRow[];
    const cs = campaignStats as CampaignStatRow;
    const statuses = agentStatuses as StatusCount[];

    return json({
      success: true,
      data: {
        users: { total: u.count },
        agents: {
          total: a.count,
          byStatus: statuses.reduce<Record<string, number>>((acc, s) => {
            acc[s.status] = s.count;
            return acc;
          }, {}),
        },
        campaigns: {
          total: c.count,
          active: cs.active,
          paused: cs.paused,
          draft: cs.draft,
          totalSpend: cs.total_spend,
          totalRevenue: cs.total_revenue,
        },
        wallet: { balance: w?.balance ?? 0 },
        systemMetrics: metrics.map((m) => ({
          name: m.metric_name,
          value: m.metric_value,
          tags: m.tags,
          createdAt: m.created_at,
        })),
      },
    });
  } catch (error) {
    logger.error("admin/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load admin health", 500);
  }
}

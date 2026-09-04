export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError, sanitizeString } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { logger, handleApiError } from "@/lib/logger";

interface PlanCount { plan: string; count: number }
interface CountRow { count: number }

const VALID_ACTIONS = ["opt_in", "opt_out", "withdraw", "update_preferences", "data_request", "data_deletion"] as const;
type ConsentAction = typeof VALID_ACTIONS[number];

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const tid = user.tenantId;

    const [planCounts, totalUsers, consentLog] = await Promise.all([
      db.prepare(`
        SELECT plan, COUNT(*) as count FROM users
        WHERE tenant_id = ? GROUP BY plan ORDER BY count DESC
      `).all(tid),
      db.prepare("SELECT COUNT(*) as count FROM users WHERE tenant_id = ?").get(tid),
      db.prepare("SELECT action_type, created_at FROM agent_actions WHERE tenant_id = ? AND agent_type = 'consent' ORDER BY created_at DESC LIMIT 1").get(tid),
    ]);

    const lastConsentAction = consentLog as { action_type: string; created_at: string } | undefined;

    return json({
      data: {
        totalUsers: (totalUsers as CountRow).count,
        byPlan: (planCounts as PlanCount[]).map((r) => ({
          plan: r.plan,
          count: r.count,
        })),
        compliance: {
          gdprEnabled: true,
          ccpaEnabled: true,
          dataRetentionDays: 365,
          consentVersion: "1.0",
          lastAuditDate: lastConsentAction?.created_at || new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error("consent/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load consent stats", 500);
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  try {
    const body = await req.json() as Record<string, unknown>;
    const action = sanitizeString(String(body.action || ""), 100);
    const details = sanitizeString(String(body.details || "{}"), 5000);

    if (!action) return jsonError("Action is required", 400);
    if (!(VALID_ACTIONS as readonly string[]).includes(action)) {
      return jsonError(`Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`, 400);
    }

    const db = await getDb();
    const id = genId("cns");

    await (await db.prepare(`
      INSERT INTO agent_actions (id, tenant_id, agent_type, action_type, input, output, status)
      VALUES (?, ?, 'consent', ?, ?, ?, 'success')
    `)).run(id, user.tenantId, action, JSON.stringify({ userId: user.id, details }), details);

    return json({
      data: { id, action, recordedAt: new Date().toISOString() },
    });
  } catch (error) {
    return handleApiError(error, "consent/POST failed");
  }
}

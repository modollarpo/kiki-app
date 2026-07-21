export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { ingestSignal, getSignalStats } from "@/lib/signals";
import { logger, handleApiError } from "@/lib/logger";
import { checkEnforcement, checkPlanLimit } from "@/lib/tenant";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const stats = await getSignalStats(user.tenantId);
    return json(stats);
  } catch (error) {
    logger.error("signals/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load signal stats", 500);
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enforcement = await checkEnforcement(user.tenantId);
  if (!enforcement.allowed) return jsonError(enforcement.reason!, 403);

  // Check daily signal limit
  const db = await getDb();
  const todaySignals =   await db.prepare(`
    SELECT COUNT(*) as count FROM signals
    WHERE tenant_id = ? AND date(created_at) = date('now')
  `).get(user.tenantId) as any;
  const limitCheck = await checkPlanLimit(user.tenantId, "signals", todaySignals.count);
  if (!limitCheck.allowed) {
    return jsonError(`Daily signal limit reached (${limitCheck.limit}). Upgrade your plan for higher limits.`, 403);
  }

  try {
    const body = await req.json();
    const { platform, eventType, value, userId, device, sessionDuration } = body;

    if (!platform || !eventType) return jsonError("platform and eventType required");

    const result = await ingestSignal(user.tenantId, {
      platform, eventType, value: value || 0, userId,
      device, sessionDuration,
    });

    return json(result, 201);
  } catch (e) {
    return handleApiError(e, "signals/POST failed");
  }
}

export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { getFraudStats, checkFraud } from "@/lib/fraud";
import { handleApiError, logger } from "@/lib/logger";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const stats = await getFraudStats(user.tenantId);
    return json(stats);
  } catch (error) {
    logger.error("fraud/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load fraud stats", 500);
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  try {
    const body = await req.json();
    const result = await checkFraud(user.tenantId, body);
    return json(result);
  } catch (e) {
    return handleApiError(e, "fraud/POST failed");
  }
}

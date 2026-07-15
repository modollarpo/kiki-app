import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { getFraudStats, checkFraud } from "@/lib/fraud";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const stats = await getFraudStats(user.tenantId);
  return json(stats);
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const result = await checkFraud(user.tenantId, body);
    return json(result);
  } catch {
    return jsonError("Invalid request body", 400);
  }
}

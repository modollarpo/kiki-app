import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { ingestSignal, getSignalStats } from "@/lib/signals";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const stats = await getSignalStats(user.tenantId);
  return json(stats);
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const { platform, eventType, value, userId, device, sessionDuration } = body;

    if (!platform || !eventType) return jsonError("platform and eventType required");

    const result = await ingestSignal(user.tenantId, {
      platform, eventType, value: value || 0, userId,
      device, sessionDuration,
    });

    return json(result, 201);
  } catch {
    return jsonError("Invalid request body", 400);
  }
}

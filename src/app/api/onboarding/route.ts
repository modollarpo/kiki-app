export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";

export async function GET(req: Request) {
  setRequestId(generateRequestId());
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const rows = await (await db.prepare("SELECT step_id, completed FROM onboarding_progress WHERE tenant_id = ?")).all(user.tenantId) as Array<{ step_id: string; completed: number }>;
    const progress: Record<string, boolean> = {};
    for (const row of rows) progress[row.step_id] = !!row.completed;
    return json({ progress });
  } catch (error) {
    logger.error("onboarding/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load onboarding progress", 500);
  }
}

export async function PUT(req: Request) {
  setRequestId(generateRequestId());
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const { step_id, completed } = await req.json();
    if (!step_id) return jsonError("step_id is required", 400);

    const db = await getDb();
    const existing = await (await db.prepare("SELECT id FROM onboarding_progress WHERE tenant_id = ? AND step_id = ?")).get(user.tenantId, step_id) as { id: string } | undefined;

    if (completed) {
      if (existing) {
        await (await db.prepare("UPDATE onboarding_progress SET completed = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?")).run(existing.id);
      } else {
        await (await db.prepare(`
          INSERT INTO onboarding_progress (id, tenant_id, step_id, completed) VALUES (?, ?, ?, 1)
        `)).run(genId("obp"), user.tenantId, step_id);
      }
    } else {
      if (existing) {
        await (await db.prepare("DELETE FROM onboarding_progress WHERE id = ?")).run(existing.id);
      }
    }

    return json({ step_id, completed: !!completed });
  } catch (error) {
    logger.error("onboarding/PUT failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to update onboarding progress", 500);
  }
}

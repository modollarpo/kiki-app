export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { handleApiError } from "@/lib/logger";

// Generate OaaS tasks from live underperforming campaigns when none are stored.
async function generateTasks(tenantId: string) {
  const db = await getDb();
  const campaigns = await db.prepare(`
    SELECT * FROM campaigns WHERE tenant_id = ? AND status = 'active'
  `).all(tenantId) as any[];

  const underperformers = campaigns.filter(
    (c: any) => (c.roas || 0) < (c.target_roas || 4)
  );

  const tasks = await Promise.all(underperformers.slice(0, 6).map(async (c: any, i: number) => {
    const id = genId("oaas");
    const title = `Reallocate budget from underperforming ${c.name}`;
    const expectedImpact = `+${Math.round(((c.target_roas || 4) - (c.roas || 0)) * 100)}% ROAS`;
    const details = `${c.name} on ${c.platform} has ROAS ${(c.roas || 0).toFixed(1)}× vs target ${(c.target_roas || 4).toFixed(1)}×. Redirecting $${Math.round((c.budget || 1000) / 30)}/day to top performers.`;
    await db.prepare(`
      INSERT INTO oaas_tasks
      (id, tenant_id, campaign_id, campaign_name, title, agent, type, status, expected_impact, confidence, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(
      id, tenantId, c.id, c.name, title, "Bid Optimizer",
      i % 2 === 0 ? "budget" : "bidding", expectedImpact, 75 + (i * 3) % 20, details
    );
    return { id, title, agent: "Bid Optimizer", type: i % 2 === 0 ? "budget" : "bidding", status: "pending", expectedImpact, confidence: 75 + (i * 3) % 20, createdAt: "now", details };
  }));

  return tasks;
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();
  let tasks = await db.prepare("SELECT * FROM oaas_tasks WHERE tenant_id = ? ORDER BY created_at DESC").all(user.tenantId) as any[];

  if (tasks.length === 0) {
    tasks = await generateTasks(user.tenantId);
  }

  return json({
    tasks: tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      agent: t.agent,
      type: t.type,
      status: t.status,
      expectedImpact: t.expected_impact,
      confidence: t.confidence,
      createdAt: t.created_at,
      details: t.details,
    })),
  });
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id || (action !== "approve" && action !== "reject")) {
      return jsonError("id and action ('approve'|'reject') are required", 400);
    }

    const db = await getDb();
    const existing = await db.prepare("SELECT * FROM oaas_tasks WHERE id = ? AND tenant_id = ?").get(id, user.tenantId) as any;
    if (!existing) return jsonError("Task not found", 404);

    const status = action === "approve" ? "approved" : "rejected";
    await db.prepare("UPDATE oaas_tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);

    return json({ id, status });
  } catch (e) {
    return handleApiError(e, "oaas/handler");
  }
}

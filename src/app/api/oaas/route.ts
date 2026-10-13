export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { handleApiError } from "@/lib/logger";

interface CampaignRow {
  id: string;
  tenant_id: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  roas: number;
  target_roas: number;
}

interface OaasTaskRow {
  id: string;
  tenant_id: string;
  campaign_id: string;
  campaign_name: string;
  title: string;
  agent: string;
  type: string;
  status: string;
  expected_impact: number | null;
  confidence: number | null;
  details: string | null;
  created_at: string;
}

// Generate OaaS tasks from live underperforming campaigns when none are stored.
// Titles/descriptions are derived from real campaign data. Impact and
// confidence are reported as null — no model has evaluated projected ROAS,
// so claiming a percentage would be fabrication.
async function generateTasks(tenantId: string) {
  const db = await getDb();
  const campaigns = await db.prepare(`
    SELECT * FROM campaigns WHERE tenant_id = ? AND status = 'active'
  `).all<CampaignRow>(tenantId);

  const underperformers = campaigns.filter(
    (c: CampaignRow) => (c.roas || 0) < (c.target_roas || 4)
  );

  const tasks = await Promise.all(underperformers.slice(0, 6).map(async (c: CampaignRow, i: number) => {
    const id = genId("oaas");
    const title = `Review underperforming ${c.name}`;
    const details = `${c.name} on ${c.platform} is at ROAS ${(c.roas || 0).toFixed(1)}× vs target ${(c.target_roas || 4).toFixed(1)}×. Pause, reallocate, or refresh creative before the next bid cycle.`;
    await db.prepare(`
      INSERT INTO oaas_tasks
      (id, tenant_id, campaign_id, campaign_name, title, agent, type, status, expected_impact, confidence, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?)
    `).run(
      id, tenantId, c.id, c.name, title, "Bid Optimizer",
      i % 2 === 0 ? "budget" : "bidding", details
    );
    return { id, tenant_id: tenantId, campaign_id: c.id, campaign_name: c.name, title, agent: "Bid Optimizer", type: i % 2 === 0 ? "budget" : "bidding", status: "pending", expected_impact: null, confidence: null, created_at: new Date().toISOString(), details };
  }));

  return tasks;
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();
  let tasks = await db.prepare("SELECT * FROM oaas_tasks WHERE tenant_id = ? ORDER BY created_at DESC").all<OaasTaskRow>(user.tenantId);

  if (tasks.length === 0) {
    tasks = await generateTasks(user.tenantId);
  }

  return json({
    tasks: tasks.map((t: OaasTaskRow) => ({
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
    const existing = await db.prepare("SELECT * FROM oaas_tasks WHERE id = ? AND tenant_id = ?").get<OaasTaskRow>(id, user.tenantId);
    if (!existing) return jsonError("Task not found", 404);

    const status = action === "approve" ? "approved" : "rejected";
    await db.prepare("UPDATE oaas_tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);

    return json({ id, status });
  } catch (e) {
    return handleApiError(e, "oaas/handler");
  }
}

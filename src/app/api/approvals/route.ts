// ============================================================
// KIKI Agent Platform — Bid Approvals API
//
// GET  /api/approvals  — list pending approvals for tenant
// POST /api/approvals  — resolve an approval (approve/reject)
//
// Used by the dashboard UI as a fallback when Slack is not
// configured, and by integration tests.
// ============================================================

import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { getPendingApprovals, resolveApproval, getApproval } from "@/lib/slack";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const pending = await getPendingApprovals(user.tenantId);
  return json({ ok: true, approvals: pending, count: pending.length });
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  let body: { approvalId: string; resolution: string };
  try {
    body = await req.json() as { approvalId: string; resolution: string };
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { approvalId, resolution } = body;
  if (!approvalId || !["approved", "rejected"].includes(resolution)) {
    return jsonError("approvalId and resolution ('approved' | 'rejected') are required", 400);
  }

  // Ensure approval belongs to this tenant
  const approval = await getApproval(approvalId);
  if (!approval) return jsonError("Approval not found", 404);
  if (approval.tenantId !== user.tenantId) return jsonError("Forbidden", 403);

  const resolved = await resolveApproval(
    approvalId,
    resolution as "approved" | "rejected",
    `dashboard:${user.id}`
  );

  if (!resolved) return jsonError("Could not resolve approval", 500);

  // If approved via dashboard, execute the bid change
  if (resolution === "approved") {
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    await db.prepare(
      `UPDATE campaigns SET bid = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(resolved.newBid, resolved.campaignId);
  }

  return json({ ok: true, approval: resolved });
}

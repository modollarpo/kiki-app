export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const tenantId = user.tenantId;

    // Get current campaign performance
    const campaigns = await db.prepare(`
      SELECT platform, spend, revenue, conversions, roas
      FROM campaigns WHERE tenant_id = ? AND status = 'active'
    `).all<{ platform: string; spend: number; revenue: number; conversions: number; roas: number }>(tenantId);

    const totalSpent = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
    const currentRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

// Scenarios are illustrative what-if projections built from real campaign
    // data with explicitly stated assumptions. They are NOT model predictions:
    // confidence is null until a calibrated planner is wired to platform data.
    const scenarios = [
      {
        id: "baseline",
        name: "Current Trajectory",
        description: "Maintain current spend and optimization levels",
        budgetChange: 0,
        projectedRevenue: Math.round(totalRevenue),
        projectedRoas: Math.round(currentRoas * 100) / 100,
        projectedConversions: totalConversions,
        confidence: null,
        risk: "low",
        basis: "Current campaign totals, no change applied.",
      },
      {
        id: "scale_up",
        name: "Scale Top Performers",
        description: "Increase budget 30% on campaigns with ROAS > 3×",
        budgetChange: 30,
        projectedRevenue: Math.round(totalRevenue * 1.35),
        projectedRoas: Math.round(currentRoas * 0.95 * 100) / 100,
        projectedConversions: Math.round(totalConversions * 1.25),
        confidence: null,
        risk: "medium",
        basis: "Hypothetical +30% budget shift to top performers; assumes +35% revenue, -5% ROAS under scale.",
      },
      {
        id: "optimize",
        name: "Optimize Efficiency",
        description: "Pause underperformers, reallocate to best channels",
        budgetChange: -15,
        projectedRevenue: Math.round(totalRevenue * 1.15),
        projectedRoas: Math.round(currentRoas * 1.2 * 100) / 100,
        projectedConversions: Math.round(totalConversions * 0.9),
        confidence: null,
        risk: "low",
        basis: "Hypothetical -15% underperformer budget removal; assumes +20% ROAS on remaining spend.",
      },
      {
        id: "expand",
        name: "Multi-Channel Expansion",
        description: "Add budget to underutilized platforms",
        budgetChange: 25,
        projectedRevenue: Math.round(totalRevenue * 1.5),
        projectedRoas: Math.round(currentRoas * 0.85 * 100) / 100,
        projectedConversions: Math.round(totalConversions * 1.4),
        confidence: null,
        risk: "high",
        basis: "Hypothetical +25% expansion across underutilized platforms; assumes +50% revenue, -15% ROAS.",
      },
    ];

    // Saved custom scenarios for this tenant.
    const savedRows = await db.prepare(`
      SELECT id, name, description, budget_change, risk, status, created_at, applied_at
      FROM scenario_plans WHERE tenant_id = ? ORDER BY created_at DESC
    `).all<{ id: string; name: string; description: string; budget_change: number; risk: string; status: string; created_at: string; applied_at: string | null }>(tenantId);

    const savedScenarios = savedRows.map((row) => {
      const change = row.budget_change || 0;
      const factor = 1 + change / 100;
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        budgetChange: change,
        projectedRevenue: Math.round(totalRevenue * factor),
        projectedRoas: Math.round(currentRoas * (change > 0 ? 0.95 : change < 0 ? 1.15 : 1) * 100) / 100,
        projectedConversions: Math.round(totalConversions * factor),
        confidence: null,
        risk: row.risk,
        basis: `Saved plan (${change > 0 ? "+" : ""}${change}% budget). Projection assumes revenue scales with budget and ROAS ${change > 0 ? "drops 5%" : change < 0 ? "improves 15%" : "stays flat"}.`,
        status: row.status,
        createdAt: row.created_at,
        appliedAt: row.applied_at,
        saved: true,
      };
    });

    // Risk assessment based on current metrics
    const riskFactors: string[] = [];
    if (currentRoas < 2) riskFactors.push("Current ROAS below 2× — scaling may increase losses");
    if (totalSpent > totalRevenue * 0.8) riskFactors.push("Spend approaching revenue — thin margins");
    if (campaigns.length < 3) riskFactors.push("Limited campaign diversity — high concentration risk");

    return Response.json({
      ok: true,
      data: {
        currentMetrics: {
          totalSpent,
          totalRevenue,
          totalConversions,
          currentRoas: Math.round(currentRoas * 100) / 100,
        },
        scenarios: [...savedScenarios, ...scenarios],
        savedScenarios,
        riskFactors,
        recommendation: scenarios.filter(s => s.risk === "low")[0] || scenarios[0],
      },
    });
  } catch (error) {
    logger.error("scenarios/handler", { message: error instanceof Error ? error.message : String(error) });
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = body.action;
    const db = await getDb();

    if (action === "save") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return Response.json({ ok: false, error: "name required" }, { status: 400 });
      if (name.length > 120) return Response.json({ ok: false, error: "name too long" }, { status: 400 });

      const budgetChange = Number(body.budgetChange);
      if (!Number.isFinite(budgetChange) || budgetChange < -100 || budgetChange > 500) {
        return Response.json({ ok: false, error: "budgetChange must be between -100 and 500" }, { status: 400 });
      }

      const risk = ["low", "medium", "high"].includes(body.risk) ? body.risk : "medium";
      const description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";
      const id = genId("scn");

      await db.prepare(`
        INSERT INTO scenario_plans (id, tenant_id, name, description, budget_change, risk, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'saved', ?)
      `).run(id, user.tenantId, name, description, budgetChange, risk, user.id);

      return Response.json({ ok: true, data: { id, name, budgetChange, risk, description, status: "saved" } });
    }

    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return Response.json({ ok: false, error: "id required" }, { status: 400 });

    const plan = await db.prepare(
      "SELECT * FROM scenario_plans WHERE id = ? AND tenant_id = ?"
    ).get<{ id: string; name: string; budget_change: number; status: string }>(id, user.tenantId);
    if (!plan) return Response.json({ ok: false, error: "Scenario not found" }, { status: 404 });

    if (action === "delete") {
      await db.prepare("DELETE FROM scenario_plans WHERE id = ? AND tenant_id = ?").run(id, user.tenantId);
      return Response.json({ ok: true, data: { id, deleted: true } });
    }

    if (action === "apply") {
      if (plan.status === "applied") {
        return Response.json({ ok: false, error: "Scenario already applied" }, { status: 400 });
      }

      const factor = 1 + (plan.budget_change || 0) / 100;
      const campaigns = await db.prepare(
        "SELECT id, budget FROM campaigns WHERE tenant_id = ? AND status = 'active'"
      ).all<{ id: string; budget: number }>(user.tenantId);

      if (campaigns.length === 0) {
        return Response.json({ ok: false, error: "No active campaigns to apply the scenario to" }, { status: 400 });
      }

      for (const c of campaigns) {
        const nextBudget = Math.max(0, Math.round((c.budget || 0) * factor * 100) / 100);
        await db.prepare("UPDATE campaigns SET budget = ? WHERE id = ? AND tenant_id = ?").run(nextBudget, c.id, user.tenantId);
      }

      await db.prepare(
        "UPDATE scenario_plans SET status = 'applied', applied_at = datetime('now') WHERE id = ? AND tenant_id = ?"
      ).run(id, user.tenantId);

      await db.prepare(`
        INSERT INTO agent_actions (id, tenant_id, agent_type, action_type, input, output, details, status, duration_ms)
        VALUES (?, ?, 'Scenario Planner', 'scenario.applied', ?, ?, ?, 'success', 0)
      `).run(
        genId("act"),
        user.tenantId,
        JSON.stringify({ scenarioId: id, name: plan.name, budgetChange: plan.budget_change }),
        JSON.stringify({ campaignsUpdated: campaigns.length }),
        `Applied scenario "${plan.name}" (${plan.budget_change > 0 ? "+" : ""}${plan.budget_change}% budget) to ${campaigns.length} active campaigns.`
      );

      return Response.json({ ok: true, data: { id, status: "applied", campaignsUpdated: campaigns.length } });
    }

    return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "scenarios/POST");
  }
}

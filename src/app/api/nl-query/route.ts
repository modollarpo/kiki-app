export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import { callAzureOpenAI, SYSTEM_PROMPTS } from "@/lib/azure-openai";

interface CampaignMetricRow {
  name: string;
  platform: string;
  status: string;
  roas: number;
  spend: number;
  revenue: number;
  conversions: number;
  cpa: number;
  ltv_predicted: number;
}

interface AgentRow {
  name: string;
  type: string;
  status: string;
}

async function buildContext(tenantId: string): Promise<string> {
  const db = await getDb();
  const campaigns = await db.prepare(
    "SELECT name, platform, status, roas, spend, revenue, conversions, cpa, ltv_predicted FROM campaigns WHERE tenant_id = ?"
  ).all<CampaignMetricRow>(tenantId);
  const wallet = await db.prepare(
    "SELECT COALESCE(balance, 0) AS balance FROM wallets WHERE tenant_id = ?"
  ).get<{ balance: number }>(tenantId);
  const agents = await db.prepare(
    "SELECT name, type, status FROM agents WHERE tenant_id = ?"
  ).all<AgentRow>(tenantId);

  const totalSpend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (Number(c.revenue) || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (Number(c.conversions) || 0), 0);

  return [
    `Wallet balance: $${Number(wallet?.balance || 0).toLocaleString()}`,
    `Total spend: $${totalSpend.toLocaleString()}, total revenue: $${totalRevenue.toLocaleString()}, overall ROAS: ${totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0"}`,
    `Total conversions: ${totalConversions}`,
    `Agents (${agents.length}): ${agents.map((a) => `${a.name} [${a.type}] ${a.status}`).join("; ") || "none"}`,
    `Campaigns (${campaigns.length}):`,
    ...campaigns.map(
      (c) =>
        `  - ${c.name} (${c.platform}, ${c.status}): spend $${Number(c.spend).toLocaleString()}, revenue $${Number(c.revenue).toLocaleString()}, ROAS ${Number(c.roas).toFixed(2)}, conversions ${c.conversions}, CPA $${Number(c.cpa).toFixed(2)}, predicted LTV $${Number(c.ltv_predicted).toFixed(2)}`
    ),
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const query = String(body.query ?? "").trim();
  if (!query) return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });

  try {
    const context = await buildContext(user.tenantId);
    const system = `${SYSTEM_PROMPTS.syncbrain}

Answer strictly from the account data below. If the answer is not present in the data, say so plainly. Keep the answer under 150 words.

ACCOUNT DATA:
${context}`;

    const { content, tokens } = await callAzureOpenAI(query, system, "standard", {
      maxTokens: 400,
      temperature: 0.2,
    });

    if (!content) {
      return NextResponse.json(
        { ok: false, code: "AI_UNAVAILABLE", error: "AI service is not available" },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, answer: content, tokens });
  } catch (error) {
    logger.error("nl-query/POST failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to answer query" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    const campaigns = await db.prepare(
      "SELECT name FROM campaigns WHERE tenant_id = ? ORDER BY spend DESC LIMIT 4"
    ).all<{ name: string }>(user.tenantId);

    const suggestions = [
      "What is my overall ROAS and CAC this period?",
      ...campaigns.map((c) => `How is "${c.name}" performing?`),
      "Which platform should I shift budget to?",
      "Are there any anomalies I should worry about?",
    ];

    return NextResponse.json({ ok: true, suggestions });
  } catch (error) {
    logger.error("nl-query/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to load suggestions" }, { status: 500 });
  }
}

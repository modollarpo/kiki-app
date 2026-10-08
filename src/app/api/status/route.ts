export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { json } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { tenantScope } from "@/lib/tenant";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "not_configured" | "unknown";
  p99: number | null;
  uptime: number | null;
  detail: string;
}

async function checkDatabase(): Promise<{ latencyMs: number | null; ok: boolean }> {
  const started = Date.now();
  try {
    const db = await getDb();
    await db.prepare("SELECT 1").get();
    return { latencyMs: Date.now() - started, ok: true };
  } catch (e) {
    logger.error("status/db check failed", { message: e instanceof Error ? e.message : String(e) });
    return { latencyMs: null, ok: false };
  }
}

function configured(envVar: string | undefined): boolean {
  return Boolean(envVar && envVar.trim().length > 0);
}

export async function GET(request: Request) {
  try {
    const user = await (await import("@/lib/auth")).getUserFromRequest(request);
    const dbCheck = await checkDatabase();

    const services: ServiceStatus[] = [
      {
        name: "Database",
        status: dbCheck.ok ? "operational" : "degraded",
        p99: null, // p99 requires percentile tracking infra (not measured)
        uptime: null,
        detail: dbCheck.ok ? `Query OK in ${dbCheck.latencyMs}ms` : "Query failed",
      },
      {
        name: "Signal Pipeline",
        status: "unknown",
        p99: null,
        uptime: null,
        detail: "Depends on tenant data",
      },
      {
        name: "LTV Prediction Engine",
        status: "unknown",
        p99: null,
        uptime: null,
        detail: "Depends on tenant data",
      },
      {
        name: "Agent Orchestrator",
        status: "unknown",
        p99: null,
        uptime: null,
        detail: "Depends on tenant data",
      },
      {
        name: "SyncBrain AI Router",
        status: "unknown",
        p99: null,
        uptime: null,
        detail: "Depends on tenant data",
      },
      {
        name: "Fraud Detection",
        status: "unknown",
        p99: null,
        uptime: null,
        detail: "Depends on tenant data",
      },
      {
        name: "Wallet Service",
        status: dbCheck.ok ? "operational" : "degraded",
        p99: null,
        uptime: null,
        detail: dbCheck.ok ? "DB-backed" : "DB unavailable",
      },
      {
        name: "Campaign Delivery",
        status: "unknown",
        p99: null,
        uptime: null,
        detail: "Depends on connected ad platforms",
      },
      {
        name: "WebSocket Gateway",
        status: "unknown",
        p99: null,
        uptime: null,
        detail: "Not measured",
      },
      {
        name: "CDN",
        status: "unknown",
        p99: null,
        uptime: null,
        detail: "Not measured",
      },
      {
        name: "Groq (fast AI tier)",
        status: configured(process.env.GROQ_API_KEY) ? "operational" : "not_configured",
        p99: null,
        uptime: null,
        detail: configured(process.env.GROQ_API_KEY) ? "GROQ_API_KEY present" : "GROQ_API_KEY missing",
      },
      {
        name: "Azure OpenAI (mini/standard)",
        status:
          configured(process.env.AZURE_OPENAI_API_KEY) && configured(process.env.AZURE_OPENAI_ENDPOINT)
            ? "operational"
            : "not_configured",
        p99: null,
        uptime: null,
        detail:
          configured(process.env.AZURE_OPENAI_API_KEY) && configured(process.env.AZURE_OPENAI_ENDPOINT)
            ? "Credentials present"
            : "API key or endpoint missing",
      },
    ];

    let stats: Record<string, unknown> | null = null;
    if (user && dbCheck.ok) {
      const db = await getDb();
      const { query: agentQuery, params: agentParams } = tenantScope("SELECT status, action_count FROM agents", user.tenantId);
      const agents = await (await db.prepare(agentQuery)).all(...agentParams) as Array<{ status: string; action_count: number }>;
      const { query: signalQuery, params: signalParams } = tenantScope("SELECT COUNT(*) as c FROM signals", user.tenantId);
      const signalCount = (await (await db.prepare(signalQuery)).get(...signalParams) as { c: number } | undefined)?.c ?? 0;
      const { query: ltvQuery, params: ltvParams } = tenantScope("SELECT COUNT(*) as c FROM ltv_predictions", user.tenantId);
      const ltvCount = (await (await db.prepare(ltvQuery)).get(...ltvParams) as { c: number } | undefined)?.c ?? 0;
      const { query: walletQuery, params: walletParams } = tenantScope("SELECT COUNT(*) as c FROM wallets", user.tenantId);
      const walletCount = (await (await db.prepare(walletQuery)).get(...walletParams) as { c: number } | undefined)?.c ?? 0;
      const { query: fraudQuery, params: fraudParams } = tenantScope("SELECT COUNT(*) as c FROM fraud_events WHERE blocked = 1", user.tenantId);
      const fraudBlocked = (await (await db.prepare(fraudQuery)).get(...fraudParams) as { c: number } | undefined)?.c ?? 0;

      const agentsRunning = agents.filter(a => a.status === "running").length;

      // Derive tenant-dependent statuses from real data.
      for (const s of services) {
        if (s.name === "Signal Pipeline") {
          s.status = signalCount > 0 ? "operational" : "unknown";
          s.detail = signalCount > 0 ? `${signalCount} signals indexed` : "No signals yet";
        } else if (s.name === "LTV Prediction Engine") {
          s.status = ltvCount > 0 ? "operational" : "unknown";
          s.detail = ltvCount > 0 ? `${ltvCount} predictions` : "No predictions yet";
        } else if (s.name === "Agent Orchestrator") {
          s.status = agentsRunning > 0 ? "operational" : "unknown";
          s.detail = agentsRunning > 0 ? `${agentsRunning}/${agents.length} agents running` : "No agents running";
        } else if (s.name === "SyncBrain AI Router") {
          s.status = configured(process.env.AZURE_OPENAI_API_KEY) ? "operational" : "not_configured";
          s.detail = s.status === "operational" ? "AI credentials present" : "AI credentials missing";
        } else if (s.name === "Fraud Detection") {
          s.status = fraudBlocked > 0 || signalCount > 0 ? "operational" : "unknown";
          s.detail = signalCount > 0 ? `${fraudBlocked} events blocked` : "No signals to screen";
        }
      }

      stats = {
        totalSignals: signalCount,
        ltvPredictions: ltvCount,
        wallets: walletCount,
        fraudBlocked,
        agentsRunning,
        totalActions: agents.reduce((s, a) => s + a.action_count, 0),
      };
    }

    const degraded = services.some(s => s.status === "degraded");
    const unconfigured = services.some(s => s.status === "not_configured");

    return json({
      status: degraded ? "degraded" : unconfigured ? "degraded" : "operational",
      lastUpdated: new Date().toISOString(),
      services,
      stats,
      note: "p99/uptime reflect live percentile infrastructure once wired; currently null — no fabricated values.",
    });
  } catch (error) {
    logger.error("status GET failed", { message: error instanceof Error ? error.message : String(error) });

    return json({
      status: "unknown",
      lastUpdated: new Date().toISOString(),
      services: [] as ServiceStatus[],
      stats: null,
      note: "Failed to evaluate service status",
    });
  }
}
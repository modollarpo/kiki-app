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

interface IntegrationStatus {
  id: string;
  name: string;
  category: string;
  configured: boolean;
  keys: { key: string; present: boolean }[];
}

// Every external integration and the env vars it requires. This is the single
// source of truth for "is this integration actually wired?" — surfaced via
// /api/status so no feature silently falls back to fabricated data.
const INTEGRATION_DEFS: { id: string; name: string; category: string; keys: string[] }[] = [
  { id: "database", name: "Database (PostgreSQL)", category: "core", keys: ["DATABASE_URL"] },
  { id: "kafka", name: "Kafka event bus", category: "core", keys: ["KAFKA_ENABLED", "KAFKA_BROKERS"] },
  { id: "groq", name: "Groq (fast AI tier)", category: "ai", keys: ["GROQ_API_KEY"] },
  { id: "azure-openai", name: "Azure OpenAI (mini/standard)", category: "ai", keys: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"] },
  { id: "opencode", name: "OpenCode agent backend", category: "ai", keys: ["OPENCODE_ENDPOINT"] },
  { id: "translator", name: "Azure Translator / Speech", category: "ai", keys: ["AZURE_TRANSLATOR_KEY", "AZURE_SPEECH_KEY"] },
  { id: "ml-service", name: "ML service", category: "ai", keys: ["ML_SERVICE_URL"] },
  { id: "stripe", name: "Stripe billing", category: "finance", keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
  { id: "slack", name: "Slack approvals", category: "ops", keys: ["SLACK_BOT_TOKEN", "SLACK_CHANNEL_ID", "SLACK_SIGNING_SECRET"] },
  { id: "smtp", name: "Transactional email (SMTP)", category: "ops", keys: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] },
  { id: "posthog", name: "PostHog analytics", category: "ops", keys: ["NEXT_PUBLIC_POSTHOG_KEY"] },
  { id: "ipqs", name: "IPQualityScore fraud", category: "fraud", keys: ["IPQS_API_KEY"] },
  { id: "scraper", name: "Competitor scraper", category: "intel", keys: ["SCRAPER_API_KEY"] },
  { id: "google-sso", name: "Google SSO", category: "auth", keys: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"] },
  { id: "meta", name: "Meta Ads", category: "ads", keys: ["META_APP_ID", "META_APP_SECRET"] },
  { id: "google-ads", name: "Google Ads", category: "ads", keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN"] },
  { id: "tiktok", name: "TikTok Ads", category: "ads", keys: ["TIKTOK_APP_ID", "TIKTOK_APP_SECRET"] },
  { id: "snap", name: "Snap Ads", category: "ads", keys: ["SNAP_CLIENT_ID", "SNAP_CLIENT_SECRET"] },
  { id: "pinterest", name: "Pinterest Ads", category: "ads", keys: ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET"] },
  { id: "linkedin", name: "LinkedIn Ads", category: "ads", keys: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"] },
  { id: "amazon", name: "Amazon Ads", category: "ads", keys: ["AMAZON_CLIENT_ID", "AMAZON_CLIENT_SECRET"] },
  { id: "ctv", name: "CTV", category: "ads", keys: ["CTV_CLIENT_ID", "CTV_CLIENT_SECRET"] },
  { id: "shopify", name: "Shopify commerce", category: "commerce", keys: ["SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"] },
  { id: "woocommerce", name: "WooCommerce commerce", category: "commerce", keys: ["WOO_CLIENT_ID", "WOO_CLIENT_SECRET"] },
  { id: "hubspot", name: "HubSpot CRM", category: "crm", keys: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"] },
  { id: "salesforce", name: "Salesforce CRM", category: "crm", keys: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"] },
  { id: "nl-analytics", name: "NL Analytics service", category: "service", keys: ["NL_ANALYTICS_URL"] },
  { id: "profit-margin", name: "Profit Margin service", category: "service", keys: ["PROFIT_MARGIN_URL"] },
  { id: "libre-translate", name: "LibreTranslate service", category: "service", keys: ["LIBRE_TRANSLATE_URL"] },
];

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

    const integrations: IntegrationStatus[] = INTEGRATION_DEFS.map((def) => {
      const keys = def.keys.map((key) => ({ key, present: configured(process.env[key]) }));
      return {
        id: def.id,
        name: def.name,
        category: def.category,
        configured: keys.every((k) => k.present),
        keys,
      };
    });
    const integrationsConfigured = integrations.filter((i) => i.configured).length;

    return json({
      status: degraded ? "degraded" : unconfigured ? "degraded" : "operational",
      lastUpdated: new Date().toISOString(),
      services,
      integrations,
      integrationsConfigured,
      integrationsTotal: integrations.length,
      stats,
      note: "p99/uptime reflect live percentile infrastructure once wired; currently null — no fabricated values.",
    });
  } catch (error) {
    logger.error("status GET failed", { message: error instanceof Error ? error.message : String(error) });

    return json({
      status: "unknown",
      lastUpdated: new Date().toISOString(),
      services: [] as ServiceStatus[],
      integrations: [] as IntegrationStatus[],
      integrationsConfigured: 0,
      integrationsTotal: INTEGRATION_DEFS.length,
      stats: null,
      note: "Failed to evaluate service status",
    });
  }
}
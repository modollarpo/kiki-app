import type { Metadata } from "next";

// ─── Shared brand constants ────────────────────────────────
const BRAND   = "KIKI Agent™";
const TAGLINE = "Autonomous LTV Campaign Execution Platform";
const BASE_URL = "https://keekii.net";
const OG_IMAGE = `${BASE_URL}/og/default.png`;

// ─── Helper ───────────────────────────────────────────────
function meta(
  title: string,
  description: string,
  keywords: string[],
  options: {
    path?: string;
    ogImage?: string;
    robots?: string;
    type?: "website" | "article";
  } = {}
): Metadata {
  const { path = "/", ogImage = OG_IMAGE, robots = "index,follow", type = "website" } = options;
  const fullTitle = title === BRAND ? title : `${title} | ${BRAND}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(", "),
    authors: [{ name: "KIKI Agent" }],
    creator: "KIKI Agent",
    publisher: "KIKI Agent (STOREGRILL INC LTD)",
    robots,
    alternates: { canonical: `${BASE_URL}${path}` },
    openGraph: {
      title: fullTitle,
      description,
      url: `${BASE_URL}${path}`,
      siteName: BRAND,
      images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }],
      locale: "en_US",
      type,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
      site: "@KIKIAgent",
      creator: "@KIKIAgent",
    },
  };
}

// ══════════════════════════════════════════════════════════
// PAGE METADATA — ALL 45 ROUTES
// ══════════════════════════════════════════════════════════

// ─── Marketing ────────────────────────────────────────────

export const homeMetadata = meta(
  "KIKI Agent™ — Autonomous LTV Campaign Execution Platform",
  "KIKI intercepts every ad conversion, predicts 90-day customer LTV with ML, and feeds enriched signals to Meta, Google, TikTok, and 5 other ad platforms. Bidding, pacing, and creative decisions run autonomously. GDPR & CCPA compliant.",
  [
    "LTV enrichment platform", "CAPI enrichment", "conversion API enrichment",
    "autonomous bid management", "AI ad optimization", "ROAS improvement",
    "customer lifetime value prediction", "Meta CAPI", "server-side conversion tracking",
    "ad signal enrichment", "performance marketing AI", "programmatic advertising AI",
    "CAC reduction", "media buying automation", "SyncBrain AI",
  ],
  { path: "/" }
);

export const featuresMetadata = meta(
  "Platform Features — LTV Enrichment, AI Agents & SyncBrain",
  "Explore every KIKI Agent feature: ML-powered LTV enrichment (sub-50ms prediction), 6 autonomous AI agents, SyncBrain multi-model routing, real-time fraud & IVT detection, cross-platform attribution, and virtual card spend control.",
  [
    "LTV enrichment features", "AI bidding agent", "SyncBrain AI routing",
    "fraud IVT detection", "conversion signal enrichment", "autonomous campaign optimization",
    "multi-model AI routing", "predictive LTV model", "ad fraud prevention",
    "smart budget pacing", "creative AI agent", "signals agent CAPI",
    "OaaS optimization", "marketing attribution models",
  ],
  { path: "/features" }
);

export const pricingMetadata = meta(
  "Pricing — Starter, Growth & Enterprise Plans",
  "Simple transparent pricing for every stage. Starter from $690/mo, Growth $2,000/mo, Enterprise custom. All plans include signal enrichment engine, fraud protection, and 14-day free trial. No credit card required.",
  [
    "KIKI Agent pricing", "LTV enrichment cost", "AI ad optimization pricing",
    "performance marketing SaaS pricing", "growth plan advertising AI",
    "enterprise ad tech pricing", "CAPI enrichment subscription",
    "ad signal platform pricing", "autonomous bidding platform cost",
    "14 day free trial ad platform", "no credit card ad AI",
  ],
  { path: "/pricing" }
);

export const enterpriseMetadata = meta(
  "Enterprise — Dedicated Infrastructure, Custom SLA & White-Label",
  "KIKI Enterprise delivers dedicated AKS clusters, 99.99% uptime SLA, white-label portals, custom data residency (EU/US/APAC), and a dedicated Customer Success Manager. Built for teams managing $10M+ in ad spend.",
  [
    "enterprise ad tech platform", "white label advertising platform",
    "dedicated ad infrastructure", "custom SLA ad platform",
    "enterprise LTV enrichment", "large scale CAPI enrichment",
    "ad platform data residency", "enterprise advertising security",
    "enterprise campaign management AI", "custom LTV model enterprise",
    "advertising AI white label", "multi-tenant ad platform enterprise",
  ],
  { path: "/enterprise" }
);

export const securityMetadata = meta(
  "Security — SOC 2 Programme, GDPR & Zero-Trust Architecture",
  "KIKI Agent is GDPR and CCPA compliant, with a SOC 2 Type II audit programme in progress. TLS 1.3 encryption in transit, AES-256 at rest, mTLS between microservices, zero-trust RBAC, quarterly penetration testing, and immutable audit logs.",
  [
    "GDPR compliant ad tech", "CCPA advertising platform",
    "zero trust ad platform security", "encrypted conversion data",
    "mTLS microservices advertising", "secure CAPI implementation",
    "ad data privacy compliance", "SOC 2 programme ad platform",
    "immutable audit log advertising", "penetration tested ad SaaS",
  ],
  { path: "/security" }
);

export const aboutMetadata = meta(
  "About KIKI — Our Mission, Team & Story",
  "KIKI is a new, founder-led product built by Dolapo Ariyo, a performance marketer who spent a decade optimizing for first-order value instead of real customer LTV. The corporate structure is being finalised.",
  [
    "KIKI Agent company", "ad tech startup", "LTV enrichment company founder",
    "performance marketing AI company", "advertising AI team",
    "CAPI enrichment startup founders", "ad tech mission statement",
    "programmatic advertising company story",
  ],
  { path: "/about", type: "article" }
);

export const contactMetadata = meta(
  "Contact — Talk to KIKI Agent Sales or Support",
  "Get in touch with the KIKI Agent team. Enterprise demos, technical questions, partnership inquiries — we respond within 4 hours. Book a 30-minute call with our team.",
  [
    "KIKI Agent contact", "ad tech demo request", "LTV enrichment demo",
    "book ad platform demo", "enterprise advertising AI sales",
    "CAPI enrichment consultation", "performance marketing AI support",
  ],
  { path: "/contact" }
);

export const blogMetadata = meta(
  "Blog — Performance Marketing & AI Insights",
  "Deep-dive articles on LTV enrichment, AI agents for advertising, fraud & IVT prevention, SyncBrain model routing, and campaign optimization strategies from the KIKI Agent team.",
  [
    "LTV enrichment blog", "ad tech insights", "performance marketing AI articles",
    "CAPI enrichment guide", "AI advertising strategy", "ad fraud prevention tips",
    "ROAS improvement guide", "marketing mix modelling blog",
    "autonomous bidding insights", "conversion signal optimization",
  ],
  { path: "/blog", type: "article" }
);

export const changelogMetadata = meta(
  "Changelog — What's New in KIKI Agent",
  "Track every KIKI Agent update: new AI agent capabilities, enrichment model improvements, platform integrations, bug fixes, and infrastructure upgrades. Updated with every release.",
  [
    "KIKI Agent changelog", "ad platform updates", "LTV enrichment release notes",
    "SyncBrain model updates", "new ad platform features", "bidding agent release",
  ],
  { path: "/changelog", type: "article" }
);

// ─── Auth ─────────────────────────────────────────────────

export const loginMetadata = meta(
  "Sign In — KIKI Agent Dashboard",
  "Sign in to your KIKI Agent account. Access the Command Center, live signal stream, AI agents, wallet, and campaign analytics. SSO supported for enterprise teams.",
  ["KIKI Agent login", "ad platform sign in", "marketing AI dashboard login"],
  { path: "/auth/login", robots: "noindex,nofollow" }
);

export const registerMetadata = meta(
  "Create Account — Start Your Free Trial",
  "Create your KIKI Agent account and start your 14-day free trial. No credit card required. Access LTV enrichment, AI agents, and autonomous campaign optimization.",
  ["KIKI Agent signup", "ad platform free trial", "create account"],
  { path: "/auth/register", robots: "noindex,nofollow" }
);

// ─── Dashboard ────────────────────────────────────────────

export const dashboardMetadata = meta(
  "Command Center — Dashboard Overview",
  "Your KIKI Agent Command Center: live ROAS, CAC, LTV metrics, active AI agent status, campaign performance, signal quality, and wallet balance — all in one view.",
  ["ad platform dashboard", "ROAS dashboard", "LTV enrichment dashboard"],
  { path: "/dashboard", robots: "noindex,nofollow" }
);

export const campaignsMetadata = meta(
  "Campaigns — Manage & Launch AI-Powered Campaigns",
  "Create, manage, and optimize campaigns with AI. Zero-shot campaign creation, Bidding Agent activation, budget allocation, ROAS tracking, and cross-platform audience management.",
  ["AI campaign management", "autonomous bid campaigns", "zero-shot campaign creator"],
  { path: "/dashboard/campaigns", robots: "noindex,nofollow" }
);

export const signalsMetadata = meta(
  "Signal Stream — Live CAPI Enrichment Pipeline",
  "Monitor your live conversion signal stream: enrichment status, LTV predictions, fraud scores, CAPI send confirmations, and consent flags — all in real-time at sub-50ms latency.",
  ["CAPI signal stream", "conversion API live monitoring", "LTV enrichment pipeline"],
  { path: "/dashboard/signals", robots: "noindex,nofollow" }
);

export const walletMetadata = meta(
  "Wallet & Cards — Campaign Budget Management",
  "Manage your KIKI wallet balance, issue virtual cards per campaign, set spend limits, monitor transactions, and top up with bank transfer or card. Multi-currency supported.",
  ["campaign wallet", "virtual card management", "ad spend control"],
  { path: "/dashboard/wallet", robots: "noindex,nofollow" }
);

export const agentsMetadata = meta(
  "AI Agents — Autonomous Campaign Execution",
  "Monitor and control your 6 autonomous AI agents: Bidding Agent, Creative Agent, Smart Pacing, Signals Agent, OaaS Optimizer, and SyncBrain Router. Live decisions, guardrails, and logs.",
  ["autonomous bidding agent", "AI marketing agents", "campaign automation AI"],
  { path: "/dashboard/agents", robots: "noindex,nofollow" }
);

export const syncbrainMetadata = meta(
  "SyncBrain™ — Multi-Model AI Orchestration Canvas",
  "Visualize your SyncBrain model routing: GPT-4o, GPT-4o-mini, Llama 3.1, and gpt-oss. Token budget controls, decision logs, metacognition scores, and real-time routing decisions.",
  ["multi-model AI routing", "SyncBrain orchestration", "AI model selection"],
  { path: "/dashboard/syncbrain", robots: "noindex,nofollow" }
);

export const analyticsMetadata = meta(
  "Performance Analytics — Attribution & ROAS Intelligence",
  "Cross-platform ROAS analysis, data-driven attribution modeling, spend vs LTV correlation, platform breakdown, and attribution waterfall — all powered by your enriched signals.",
  ["performance analytics", "ROAS analytics", "attribution analytics"],
  { path: "/dashboard/analytics", robots: "noindex,nofollow" }
);

export const oaasMetadata = meta(
  "OaaS — Optimization as a Service Tasks",
  "Review and approve autonomous optimization recommendations from KIKI Agent: budget shifts, audience expansions, bid adjustments, and creative rotations — with full reasoning transparency.",
  ["optimization as a service", "autonomous optimization tasks", "OaaS marketing"],
  { path: "/dashboard/oaas", robots: "noindex,nofollow" }
);

export const adminMetadata = meta(
  "Admin Health — Service Status & Guardrails",
  "Platform health dashboard: 37 service monitors, SLA tracking, latency percentiles, alert rules, emergency kill switches, and incident management for KIKI Agent infrastructure.",
  ["admin health dashboard", "platform monitoring", "service health"],
  { path: "/dashboard/admin", robots: "noindex,nofollow" }
);

export const developerMetadata = meta(
  "Developer Console — API, Webhooks & SDK",
  "KIKI Agent developer tools: REST API keys, webhook configuration, OpenAPI spec, SDK integration guides, rate limits, and event payload documentation for CAPI and LTV endpoints.",
  ["advertising API", "CAPI developer tools", "webhook ad platform"],
  { path: "/dashboard/developer", robots: "noindex,nofollow" }
);

export const crmMetadata = meta(
  "CRM — Contact Tracking & LTV-Weighted Pipeline",
  "Track contacts through your funnel with full attribution: ad touchpoints, LTV predictions, lead scores, buying committee visibility, and AI next-action recommendations.",
  ["CRM ad attribution", "LTV weighted CRM", "B2B contact tracking"],
  { path: "/dashboard/crm", robots: "noindex,nofollow" }
);

export const b2bMetadata = meta(
  "B2B Attribution — Account-Based Marketing Analytics",
  "Account-level attribution: buying committee mapping, multi-touch touchpoint timelines, LinkedIn and Google B2B attribution, and LTV revenue waterfall analysis.",
  ["B2B attribution", "account based marketing analytics", "buying committee attribution"],
  { path: "/dashboard/b2b", robots: "noindex,nofollow" }
);

export const mmmMetadata = meta(
  "Mix Modelling — MMM Saturation & Budget Analysis",
  "Run Marketing Mix Modelling: channel saturation curves, offline media impact, budget reallocation recommendations, and scenario simulation powered by SyncBrain Bayesian models.",
  ["marketing mix modelling", "MMM analysis", "media saturation curves"],
  { path: "/dashboard/mmm", robots: "noindex,nofollow" }
);

export const competitiveMetadata = meta(
  "Competitive Intelligence — Ad Tracker & CPM Benchmarks",
  "Track competitor ad creatives across Meta, Google, and TikTok. Monitor CPM benchmarks, creative theme analysis, ad frequency, and positioning gaps vs your campaigns.",
  ["competitive ad intelligence", "competitor ad tracking", "CPM benchmarks"],
  { path: "/dashboard/competitive", robots: "noindex,nofollow" }
);

export const scenariosMetadata = meta(
  "Scenario Planner — Budget Reallocation & What-If Analysis",
  "Model budget reallocation scenarios with SyncBrain: saturation curves, projected ROAS impact, channel shift simulations, and campaign pause impact analysis before committing.",
  ["budget scenario planning", "ad spend reallocation", "what-if campaign analysis"],
  { path: "/dashboard/scenarios", robots: "noindex,nofollow" }
);

export const fraudMetadata = meta(
  "Fraud & IVT — Real-Time Bot Detection Dashboard",
  "Monitor and block invalid traffic in real time: datacenter IPs, synthetic browsers, velocity anomalies, and geo mismatches. IP reputation, fingerprint, and velocity detection layers.",
  ["ad fraud detection", "IVT blocking", "invalid traffic prevention"],
  { path: "/dashboard/fraud", robots: "noindex,nofollow" }
);

export const anomalyMetadata = meta(
  "Anomaly Detection — Performance Outlier Alerts",
  "Configurable anomaly detection: ROAS drops, CTR spikes, CAC outliers, budget overpacing, and signal quality degradation — with automatic agent notifications and resolution workflows.",
  ["ad anomaly detection", "ROAS anomaly alerts", "campaign performance alerts"],
  { path: "/dashboard/anomaly", robots: "noindex,nofollow" }
);

export const reportsMetadata = meta(
  "Reports — Scheduled & Custom Performance Reports",
  "Build, schedule, and share performance reports: custom block builder, client-facing white-label exports, PDF generation, and weekly digests for campaigns, signals, and P&L.",
  ["ad performance reports", "custom marketing reports", "client ad reports"],
  { path: "/dashboard/reports", robots: "noindex,nofollow" }
);

export const auditMetadata = meta(
  "Audit Log — Immutable SOC 2 & GDPR Event Log",
  "Cryptographically hashed immutable audit log for every KIKI Agent action: agent decisions, billing events, API calls, GDPR requests, and admin actions. Supports SOC 2 and GDPR compliance requirements.",
  ["SOC 2 audit log", "GDPR compliance log", "immutable event log"],
  { path: "/dashboard/audit", robots: "noindex,nofollow" }
);

export const warehouseMetadata = meta(
  "Data Warehouse Export — BigQuery, Snowflake & Redshift",
  "Export enriched signal data, LTV predictions, and campaign analytics to BigQuery, Snowflake, Redshift, or S3. Configurable sync schedules, schema browser, and incremental export.",
  ["data warehouse export", "BigQuery ad data", "Snowflake marketing data"],
  { path: "/dashboard/warehouse", robots: "noindex,nofollow" }
);

export const marginMetadata = meta(
  "Profit Margin — SKU-Level Margin & CAC Analysis",
  "Profit-adjusted campaign analysis: SKU-level gross margins, margin-adjusted CAC by campaign, contribution margin by creative variant, and low-margin product flagging.",
  ["profit margin analytics", "SKU margin analysis", "contribution margin campaigns"],
  { path: "/dashboard/margin", robots: "noindex,nofollow" }
);

export const influencerMetadata = meta(
  "Influencer & Dark Social — Creator Attribution",
  "Track influencer conversions via promo codes, attribute dark social traffic, measure creator LTV uplift, and model untracked word-of-mouth revenue impact.",
  ["influencer attribution", "dark social analytics", "promo code tracking"],
  { path: "/dashboard/influencer", robots: "noindex,nofollow" }
);

export const settingsMetadata = meta(
  "Settings — Account, Security & Integrations",
  "Manage your KIKI Agent account: profile, MFA, team seats, SSO configuration, white-label settings, notification preferences, API access, and data export.",
  ["account settings", "ad platform settings", "MFA security"],
  { path: "/dashboard/settings", robots: "noindex,nofollow" }
);

export const billingMetadata = meta(
  "Billing & Plans — Subscription & Usage Management",
  "Manage your KIKI Agent subscription, view usage metrics, download invoices, upgrade your plan, and monitor signal volume against plan limits.",
  ["billing management", "subscription plan", "usage metering"],
  { path: "/dashboard/billing", robots: "noindex,nofollow" }
);

export const financeMetadata = meta(
  "Finance Operations — P&L, Revenue Streams & FX",
  "Platform P&L dashboard: revenue streams, per-tenant profitability, gross margin by account, exchange rate monitoring, and token cost attribution across AI models.",
  ["finance operations", "P&L dashboard", "revenue analytics"],
  { path: "/dashboard/finance", robots: "noindex,nofollow" }
);

export const aiopMetadata = meta(
  "AI Ops & MLOps — Model Registry & Training Queue",
  "Manage LTV prediction models: model registry, training queue, A/B model experiments, feature importance, R² and MAPE tracking, and automatic retraining triggers.",
  ["MLOps dashboard", "LTV model management", "AI model training"],
  { path: "/dashboard/aiops", robots: "noindex,nofollow" }
);

export const agencyMetadata = meta(
  "Agency Portfolio — Multi-Client Campaign Management",
  "Manage multiple clients from one view: portfolio ROAS, per-client margin analysis, white-label portal configuration, client billing, and bulk campaign management.",
  ["agency ad management", "multi-client dashboard", "agency ROAS portfolio"],
  { path: "/dashboard/agency", robots: "noindex,nofollow" }
);

export const partnersMetadata = meta(
  "Partner Management — Reseller & Referral Network",
  "Manage KIKI Agent reseller partners: tier status, revenue attribution, commission tracking, white-label portal activation, and co-marketing coordination.",
  ["ad platform partners", "reseller management", "referral commission"],
  { path: "/dashboard/partners", robots: "noindex,nofollow" }
);

export const consentMetadata = meta(
  "Consent & Privacy — Consent Management & UID2",
  "Manage consent rates by jurisdiction, configure cookie banners, monitor UID2 and Privacy Sandbox coverage, and handle GDPR/CCPA data subject requests.",
  ["consent management", "UID2 implementation", "GDPR consent tracking"],
  { path: "/dashboard/consent", robots: "noindex,nofollow" }
);

export const kycMetadata = meta(
  "KYC & AML — Identity Verification & Compliance",
  "Complete business KYC verification, upload compliance documents, run AML screening against OFAC/EU/UN sanctions lists, and unlock full platform spend capabilities.",
  ["KYC verification", "AML screening", "compliance verification"],
  { path: "/dashboard/kyc", robots: "noindex,nofollow" }
);

export const notificationsMetadata = meta(
  "Notifications — Platform Alerts & Agent Updates",
  "Manage all KIKI Agent notifications: critical ROAS alerts, agent decision updates, wallet warnings, anomaly detections, and model retraining completions.",
  ["platform notifications", "campaign alerts", "ROAS alert"],
  { path: "/dashboard/notifications", robots: "noindex,nofollow" }
);

export const workflowMetadata = meta(
  "Automation Builder — Visual Workflow & Trigger Engine",
  "Build no-code automation workflows: schedule triggers, Kafka event conditions, campaign pause actions, Slack alerts, wallet top-ups, and SyncBrain analysis runs.",
  ["marketing automation builder", "campaign workflow automation", "no-code ad automation"],
  { path: "/dashboard/workflow", robots: "noindex,nofollow" }
);

export const creativeLibraryMetadata = meta(
  "Creative Library — AI-Generated Ad Assets",
  "Manage your ad creative assets: upload, organize, and analyze performance by variant. Generate new creatives with AI using campaign brief and audience context.",
  ["ad creative management", "AI creative generation", "creative performance analytics"],
  { path: "/dashboard/creative-library", robots: "noindex,nofollow" }
);

export const savingsMetadata = meta(
  "Savings Center — Platform ROI & Efficiency Tracking",
  "Quantify KIKI Agent's impact: LTV enrichment revenue uplift, fraud savings, bid efficiency gains, token cost optimizations, and total platform ROI per agent.",
  ["ad platform ROI", "LTV uplift tracking", "marketing AI savings"],
  { path: "/dashboard/savings", robots: "noindex,nofollow" }
);

export const mobileMetadata = meta(
  "KIKI Agent Mobile — Campaign Management on iOS & Android",
  "Full-featured KIKI Agent mobile experience: live ROAS, AI agent controls, wallet management, real-time notifications, and SyncBrain voice interface.",
  ["advertising AI mobile app", "campaign management app", "ROAS mobile dashboard"],
  { path: "/mobile", robots: "noindex,nofollow" }
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface FetchOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOpts.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...fetchOpts,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }

    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Auth ────────────────────────────────────────────────
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    tenantName: string;
    plan: string;
    avatarInitials: string;
  };
}

export const auth = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (name: string, email: string, password: string, companyName?: string) =>
    request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, companyName }),
    }),
  me: (token: string) =>
    request<{ user: AuthResponse["user"] }>("/api/auth/me", { token }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
};

// ── Dashboard ───────────────────────────────────────────
export interface DashboardData {
  kpis: {
    roas: { value: number; delta: number; label: string };
    spend: { value: number; delta: number; label: string };
    conversions: { value: number; delta: number; label: string };
    ltv: { value: number; delta: number; label: string };
  };
  campaigns: Array<{
    id: string;
    name: string;
    platform: string;
    status: string;
    roas: number;
    spend: number;
    budget: number;
  }>;
  agents: Array<{
    id: string;
    name: string;
    status: string;
    task: string;
    metric: string;
    color: string;
  }>;
  wallet: { balance: number; cards: number };
  notifications: { unread: number; total: number };
  system: { status: string; agentsRunning: number; eventsToday: number; signalsTotal: number; fraudBlocked: number };
}

export const dashboard = {
  get: (token: string) => request<DashboardData>("/api/dashboard", { token }),
};

// ── Campaigns ───────────────────────────────────────────
export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  platform: string;
  status: string;
  roas: number;
  spend: number;
  budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  ltvPredicted: number;
  createdAt: string;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
  summary: {
    total: number;
    active: number;
    totalSpend: number;
    totalBudget: number;
    avgRoas: number;
    totalConversions: number;
  };
}

export const campaigns = {
  list: (token: string, params?: { status?: string; platform?: string }) => {
    const qs = new URLSearchParams(params).toString();
    return request<CampaignsResponse>(`/api/campaigns${qs ? `?${qs}` : ""}`, { token });
  },
  create: (token: string, data: { name: string; platform: string; budget: number }) =>
    request<Campaign>("/api/campaigns", { method: "POST", token, body: JSON.stringify(data) }),
};

// ── Agents ──────────────────────────────────────────────
export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  status: string;
  task: string;
  metric: string;
  color: string;
  lastAction: string;
  actionCount: number;
}

export const agents = {
  list: (token: string) =>
    request<{ agents: Agent[]; summary: { total: number; running: number; paused: number; totalActions: number }; guardrails: Array<{ label: string; value: string; status: string }> }>("/api/agents", { token }),
  toggle: (token: string, id: string, status: string) =>
    request<Agent>("/api/agents", { method: "PATCH", token, body: JSON.stringify({ id, status }) }),
};

// ── Wallet ──────────────────────────────────────────────
export interface WalletData {
  id: string;
  tenantId: string;
  balance: number;
  currency: string;
  cards: Array<{
    id: string;
    last4: string;
    brand: string;
    limit: number;
    spent: number;
    campaign: string;
    status: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    campaign: string | null;
    date: string;
    status: string;
  }>;
}

export const wallet = {
  get: (token: string) => request<WalletData>("/api/wallet", { token }),
  topUp: (token: string, amount: number) =>
    request<{ balance: number; transaction: unknown }>("/api/wallet", {
      method: "POST",
      token,
      body: JSON.stringify({ amount }),
    }),
};

// ── Notifications ───────────────────────────────────────
export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  severity: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  link: string | null;
}

export const notifications = {
  list: (token: string) =>
    request<{ notifications: Notification[]; unread: number }>("/api/notifications", { token }),
  markRead: (token: string, id: string) =>
    request("/api/notifications", { method: "PATCH", token, body: JSON.stringify({ id }) }),
  markAllRead: (token: string) =>
    request("/api/notifications", { method: "PATCH", token, body: JSON.stringify({ readAll: true }) }),
};

// ── Contacts ────────────────────────────────────────────
export const contacts = {
  submit: (data: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    message: string;
  }) => request<{ ok: boolean; id: string }>("/api/contacts", { method: "POST", body: JSON.stringify(data) }),
};

// ── Commerce (Closed-Loop LTV) ─────────────────────────
export interface CommerceConnection {
  id: string;
  platform: string;
  shopDomain: string;
  status: "connected" | "pending" | "error" | "syncing";
  lastSync: string | null;
  totalOrders: number;
  totalRevenue: number;
}

export interface PlatformCatalogItem {
  key: string;
  label: string;
  description: string;
}

export interface CommerceData {
  connections: CommerceConnection[];
  catalog: PlatformCatalogItem[];
}

export interface LtvSegment {
  segment: string;
  predictedLtv: number;
  realizedLtv: number;
  errorPct: number;
  count: number;
}

export interface LtvAccuracyData {
  overallAccuracy: number;
  predictionCoverage: number;
  bySegment: LtvSegment[];
}

export interface CommerceConnectBody {
  platform: string;
  shopDomain: string;
  apiKey: string;
  webhookSecret: string;
}

export const commerce = {
  list: (token: string) =>
    request<{ data: CommerceData }>("/api/commerce", { token }),
  ltvAccuracy: (token: string) =>
    request<{ data: LtvAccuracyData }>("/api/commerce/ltv-accuracy", { token }),
  connect: (token: string, body: CommerceConnectBody) =>
    request<{ ok: boolean; data?: CommerceConnection }>("/api/commerce", {
      method: "POST",
      token,
      body: JSON.stringify({ action: "connect", ...body }),
    }),
  disconnect: (token: string, connectionId: string) =>
    request<{ ok: boolean }>("/api/commerce", {
      method: "POST",
      token,
      body: JSON.stringify({ action: "disconnect", connectionId }),
    }),
  sync: (token: string, connectionId: string) =>
    request<{ ok: boolean }>("/api/commerce", {
      method: "POST",
      token,
      body: JSON.stringify({ action: "sync", connectionId }),
    }),
};

// ── Status ──────────────────────────────────────────────
export const status = {
  get: () => request<{ status: string; services: Array<{ name: string; status: string; p99: number; uptime: number }> }>("/api/status"),
};

// ── Insights ────────────────────────────────────────────
export const insights = {
  get: (token: string) => request<Record<string, unknown>>("/api/insights", { token }),
};

// ── AI Chat (Azure OpenAI) ──────────────────────────────
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  finishReason: string;
}

export const ai = {
  chat: (token: string | null | undefined, data: {
    messages: ChatMessage[];
    model?: "mini" | "standard";
    taskType?: "routing" | "classification" | "summarization" | "creative" | "analysis" | "general";
    maxTokens?: number;
    temperature?: number;
  }) =>
    request<ChatResponse>("/api/ai/chat", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),
};

// ── Signals ──────────────────────────────────────────────
export interface Signal {
  id: string;
  platform: string;
  eventType: string;
  ltvPredicted: number;
  ltvConfidence: number;
  segment: string;
  bidMultiplier: number;
  enriched: boolean;
}

export const signals = {
  list: (token: string, params?: { platform?: string; limit?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ signals: Signal[]; summary: { total: number; platforms: number; segments: Record<string, number> } }>(`/api/signals${qs ? `?${qs}` : ""}`, { token });
  },
};

// ── Analytics ────────────────────────────────────────────
export const analytics = {
  get: (token: string) => request<Record<string, unknown>>("/api/analytics", { token }),
};

// ── Campaigns (individual) ───────────────────────────────
export const campaign = {
  get: (token: string, id: string) => request<Campaign>(`/api/campaigns/${id}`, { token }),
  update: (token: string, id: string, data: Partial<Campaign>) =>
    request<Campaign>(`/api/campaigns/${id}`, { method: "PUT", token, body: JSON.stringify(data) }),
  delete: (token: string, id: string) =>
    request<{ ok: boolean }>(`/api/campaigns/${id}`, { method: "DELETE", token }),
};

// ── Bidding ──────────────────────────────────────────────
export const bidding = {
  get: (token: string) => request<Record<string, unknown>>("/api/bidding", { token }),
  override: (token: string, campaignId: string, multiplier: number) =>
    request<{ ok: boolean }>("/api/bidding", { method: "POST", token, body: JSON.stringify({ campaignId, multiplier }) }),
};

// ── LTV ──────────────────────────────────────────────────
export const ltv = {
  get: (token: string) => request<Record<string, unknown>>("/api/ltv", { token }),
  train: (token: string) => request<{ ok: boolean; jobId: string }>("/api/ltv/train", { method: "POST", token }),
  training: (token: string) => request<{ status: string; progress: number }>("/api/ltv/training", { token }),
};

// ── Billing ──────────────────────────────────────────────
export const billing = {
  get: (token: string) => request<Record<string, unknown>>("/api/billing", { token }),
  changePlan: (token: string, plan: string) =>
    request<{ success: boolean; subscription?: Record<string, unknown>; error?: string }>("/api/billing/change-plan", {
      method: "POST",
      token,
      body: JSON.stringify({ plan }),
    }),
};

// ── Fraud ────────────────────────────────────────────────
export const fraud = {
  get: (token: string) => request<Record<string, unknown>>("/api/fraud", { token }),
};

// ── Anomaly ──────────────────────────────────────────────
export const anomaly = {
  get: (token: string) => request<Record<string, unknown>>("/api/anomaly", { token }),
};

// ── CRM ──────────────────────────────────────────────────
export const crm = {
  list: (token: string) => request<Record<string, unknown>>("/api/crm", { token }),
  sync: (token: string) => request<{ ok: boolean }>("/api/crm/sync", { method: "POST", token }),
};

// ── Creative Library ─────────────────────────────────────
export const creativeLibrary = {
  list: (token: string) => request<Record<string, unknown>>("/api/creative-library", { token }),
};

// ── SyncBrain ────────────────────────────────────────────
export const syncbrain = {
  get: (token: string) => request<Record<string, unknown>>("/api/syncbrain", { token }),
};

// ── Reports ──────────────────────────────────────────────
export const reports = {
  list: (token: string) => request<Record<string, unknown>>("/api/reports", { token }),
};

// ── AIOps ────────────────────────────────────────────────
export const aiops = {
  get: (token: string) => request<Record<string, unknown>>("/api/aiops", { token }),
};

// ── Admin ────────────────────────────────────────────────
export const admin = {
  get: (token: string) => request<Record<string, unknown>>("/api/admin", { token }),
};

// ── Settings ─────────────────────────────────────────────
export const settings = {
  get: (token: string) => request<Record<string, unknown>>("/api/settings", { token }),
  update: (token: string, data: Record<string, unknown>) =>
    request<{ ok: boolean }>("/api/settings", { method: "PUT", token, body: JSON.stringify(data) }),
};

// ── Audit ────────────────────────────────────────────────
export const audit = {
  list: (token: string) => request<Record<string, unknown>>("/api/audit", { token }),
};

// ── Consent ──────────────────────────────────────────────
export const consent = {
  get: (token: string) => request<Record<string, unknown>>("/api/consent", { token }),
};

// ── Agency ───────────────────────────────────────────────
export const agency = {
  get: (token: string) => request<Record<string, unknown>>("/api/agency", { token }),
};

// ── Workflow ─────────────────────────────────────────────
export const workflow = {
  list: (token: string) => request<Record<string, unknown>>("/api/workflow", { token }),
};

// ── Scenarios ────────────────────────────────────────────
export const scenarios = {
  get: (token: string) => request<Record<string, unknown>>("/api/scenarios", { token }),
};

// ── Approvals ────────────────────────────────────────────
export const approvals = {
  list: (token: string) =>
    request<{ ok: boolean; approvals: Array<{ id: string; campaignId: string; type: string; status: string; requestedBy: string; reason: string; createdAt: string }>; count: number }>("/api/approvals", { token }),
  resolve: (token: string, id: string, action: "approve" | "reject") =>
    request<{ ok: boolean; approved: boolean }>("/api/approvals", { method: "POST", token, body: JSON.stringify({ id, action }) }),
};
export const mmm = {
  get: (token: string) => request<Record<string, unknown>>("/api/mmm", { token }),
};

// ── B2B Attribution ──────────────────────────────────────
export const b2b = {
  get: (token: string) => request<Record<string, unknown>>("/api/b2b", { token }),
};

// ── Margin ───────────────────────────────────────────────
export const margin = {
  get: (token: string) => request<Record<string, unknown>>("/api/margin", { token }),
};

// ── Profit Margin ────────────────────────────────────────
export const profitMargin = {
  get: (token: string) => request<Record<string, unknown>>("/api/profit-margin", { token }),
};

// ── Competitor ───────────────────────────────────────────
export const competitor = {
  list: (token: string) =>
    request<{ ok: boolean; configs: Array<{ id: string; domain: string; productCategory: string; priceDropThreshold: number; lastCheckedAt?: number; status: string }> }>("/api/competitor", { token }),
  runMonitor: (token: string) =>
    request<{ ok: boolean; configsChecked: number; dropsDetected: number; results: Array<{ competitorDomain: string; priceDropPct: number; defensiveActions: Array<{ platform: string; action: string; campaignName: string; reason: string; executed: boolean }>; creativeQueued: boolean; summary: string }> }>("/api/competitor", {
      method: "POST",
      token,
      body: JSON.stringify({ action: "run_monitor" }),
    }),
  addCompetitor: (token: string, domain: string, productCategory: string) =>
    request<{ ok: boolean }>("/api/competitor", {
      method: "POST",
      token,
      body: JSON.stringify({ action: "add_competitor", domain, productCategory }),
    }),
};

// ── Creative Generate ─────────────────────────────────────
export const creativeGenerate = {
  list: (token: string) =>
    request<{ ok: boolean; fatigued: Array<{ campaignId: string; campaignName: string; platform: string; currentRoas: number; targetRoas: number; consecutiveLowRoasDays: number }>; creatives: Array<{ id: string; campaignId: string; platform: string; type: string; copies: Array<{ id: string; headline: string; primaryText: string; callToAction: string; platform: string; characterCount: number }>; imagePrompt?: string; status: string; createdAt: number }>; counts: { fatigued: number; creatives: number } }>("/api/creative/generate", { token }),
  generate: (token: string) =>
    request<{ ok: boolean; generated: number; fatigued: number }>("/api/creative/generate", { method: "POST", token }),
};
export const competitive = {
  get: (token: string) => request<Record<string, unknown>>("/api/competitive", { token }),
};

// ── Intelligence ─────────────────────────────────────────
export const intelligence = {
  get: (token: string) => request<Record<string, unknown>>("/api/intelligence", { token }),
};

// ── Warehouse ────────────────────────────────────────────
export const warehouse = {
  get: (token: string) => request<Record<string, unknown>>("/api/warehouse", { token }),
};

// ── OaaS ─────────────────────────────────────────────────
export const oaas = {
  list: (token: string) => request<Record<string, unknown>>("/api/oaas", { token }),
};

// ── Developer ────────────────────────────────────────────
export const developer = {
  get: (token: string) => request<Record<string, unknown>>("/api/developer", { token }),
};

// ── KYC ──────────────────────────────────────────────────
export const kyc = {
  get: (token: string) => request<Record<string, unknown>>("/api/kyc", { token }),
};

// ── Integrations ─────────────────────────────────────────
export const integrations = {
  list: (token: string) => request<Record<string, unknown>>("/api/integrations", { token }),
};

// ── NL Query ─────────────────────────────────────────────
export const nlQuery = {
  query: (data: { query: string; context?: Record<string, unknown> }) =>
    request<{ answer: string }>("/api/nl-query", { method: "POST", body: JSON.stringify(data) }),
};

// ── Attribution ──────────────────────────────────────────
export const attribution = {
  get: (token: string) => request<Record<string, unknown>>("/api/attribution", { token }),
  breakdown: (token: string) =>
    request<{ success: boolean; data: unknown[] }>("/api/attribution?path=/api/attributions/breakdown", { token }),
};

// ── CAPI Enrich ──────────────────────────────────────────
export const capi = {
  enrich: (token: string, data: Record<string, unknown>) =>
    request<{ ok: boolean; enriched: Record<string, unknown> }>("/api/capi/enrich", { method: "POST", token, body: JSON.stringify(data) }),
};

// ── Catalog ──────────────────────────────────────────────
export const catalog = {
  stats: (token: string) => request<Record<string, unknown>>("/api/catalog/stats", { token }),
  evaluate: (token: string, data: Record<string, unknown>) =>
    request<{ ok: boolean }>("/api/catalog/evaluate", { method: "POST", token, body: JSON.stringify(data) }),
};

// ── Metacognition ────────────────────────────────────────
export const metacognition = {
  reflect: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/metacognition", { method: "POST", body: JSON.stringify(data) }),
};

// ── Arbitrage ────────────────────────────────────────────
export const arbitrage = {
  run: (token: string) => request<Record<string, unknown>>("/api/arbitrage/run", { method: "POST", token }),
  history: (token: string) => request<Record<string, unknown>>("/api/arbitrage/history", { token }),
};

// ── Influencer ───────────────────────────────────────────
export const influencer = {
  list: (token: string) => request<{ success: boolean; data: Array<{ id: string; name: string; handle: string; platform: string; promoCode: string; totalConversions: number; totalRevenue: number; totalLtv: number; roi: number }> }>("/api/influencer", { token }),
  create: (token: string, data: { name: string; handle: string; platform: string }) =>
    request<{ success: boolean; data?: unknown }>("/api/influencer", { method: "POST", token, body: JSON.stringify(data) }),
  darkSocial: (token: string) =>
    request<{ success: boolean; data: { totalUnattributedConversions: number; totalUnattributedRevenue: number } }>("/api/influencer/dark-social", { token }),
};

// ── Incrementality ───────────────────────────────────────
export const incrementality = {
  experiment: (token: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/incrementality/experiment", { method: "POST", token, body: JSON.stringify(data) }),
  results: (token: string, campaignId: string) =>
    request<Record<string, unknown>>(`/api/incrementality/results?campaignId=${campaignId}`, { token }),
};

// ── GDPR ─────────────────────────────────────────────────
export const gdpr = {
  request: (token: string, data: { action: "delete" | "export"; userId: string }) =>
    request<{ ok: boolean }>("/api/gdpr", { method: "POST", token, body: JSON.stringify(data) }),
};

// ── Sync ─────────────────────────────────────────────────
export const sync = {
  run: (token: string, data: { platform: string }) =>
    request<{ ok: boolean }>("/api/sync", { method: "POST", token, body: JSON.stringify(data) }),
};

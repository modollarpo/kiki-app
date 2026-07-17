const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOpts.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
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
  get: (token: string) => request<any>("/api/insights", { token }),
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
  chat: (data: {
    messages: ChatMessage[];
    model?: "mini" | "standard";
    taskType?: "routing" | "classification" | "summarization" | "creative" | "analysis" | "general";
    maxTokens?: number;
    temperature?: number;
  }) =>
    request<ChatResponse>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

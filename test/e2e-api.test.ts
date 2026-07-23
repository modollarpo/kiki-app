import { describe, it, expect, vi, beforeEach } from "vitest";

// ── In-memory SQLite mock ──────────────────────────────────
const CAMPAIGNS = [
  { id: "c1", tenant_id: "t_test", name: "Q4 Fitness Acq.", platform: "meta", status: "active", roas: 4.23, spend: 12000, budget: 20000, impressions: 500000, clicks: 8500, conversions: 320, cpa: 37.50, ltv_predicted: 312, revenue: 50760, created_at: "2026-01-01" },
  { id: "c2", tenant_id: "t_test", name: "Retargeting", platform: "google", status: "active", roas: 6.87, spend: 8000, budget: 15000, impressions: 300000, clicks: 6200, conversions: 180, cpa: 44.44, ltv_predicted: 280, revenue: 54960, created_at: "2026-01-15" },
  { id: "c3", tenant_id: "t_test", name: "Brand YouTube", platform: "tiktok", status: "paused", roas: 2.10, spend: 5000, budget: 10000, impressions: 200000, clicks: 3100, conversions: 95, cpa: 52.63, ltv_predicted: 180, revenue: 10500, created_at: "2026-02-01" },
];

const AGENTS = [
  { id: "a1", tenant_id: "t_test", name: "Bidding Agent", status: "running", action_count: 142, task: "Optimizing bids", color: "#4ECDC4" },
  { id: "a2", tenant_id: "t_test", name: "Creative Agent", status: "running", action_count: 87, task: "Generating variants", color: "#7C3AED" },
  { id: "a3", tenant_id: "t_test", name: "Fraud Agent", status: "idle", action_count: 23, task: "Monitoring IVT", color: "#EF4444" },
];

const tables: Record<string, any[]> = {
  campaigns: [...CAMPAIGNS],
  agents: [...AGENTS],
  signals: [
    { id: "s1", tenant_id: "t_test", platform: "meta", event_name: "Purchase", value: 89.99, created_at: "2026-07-10" },
    { id: "s2", tenant_id: "t_test", platform: "google", event_name: "Purchase", value: 124.50, created_at: "2026-07-11" },
  ],
  fraud_events: [
    { id: "f1", tenant_id: "t_test", blocked: 1, event_type: "click_fraud" },
    { id: "f2", tenant_id: "t_test", blocked: 0, event_type: "suspicious_ip" },
  ],
  wallets: [{ tenant_id: "t_test", balance: 84200 }],
  notifications: [
    { id: "n1", tenant_id: "t_test", title: "Budget Alert", body: "at 60%", severity: "warning", read: false, time: "2h ago", created_at: "2026-07-15" },
  ],
  oauth_states: [],
  tenant_integrations: [],
  subscriptions: [],
};

function findTable(sql: string): string | null {
  const l = sql.toLowerCase();
  for (const t of Object.keys(tables)) {
    if (l.includes(`from ${t}`) || l.includes(`into ${t}`) || l.includes(`update ${t}`)) return t;
  }
  return null;
}

function execQuery(sql: string, ...params: any[]): any[] {
  const l = sql.toLowerCase();
  const tn = findTable(sql);
  if (!tn) return [];
  let rows = [...tables[tn]];
  const tid = params.find((p: any) => typeof p === "string" && p.startsWith("t_"));
  if (l.includes("tenant_id") && tid) rows = rows.filter(r => r.tenant_id === tid);
  if (l.includes("and status = ?")) {
    const sp = params.find((p: any) => typeof p === "string" && ["active", "paused"].includes(p));
    if (sp) rows = rows.filter(r => r.status === sp);
  }
  if (l.includes("group by platform")) {
    const g: Record<string, any> = {};
    for (const r of rows) {
      const k = r.platform || "x";
      if (!g[k]) g[k] = { platform: k, count: 0, avg_value: 0, sum: 0 };
      g[k].count++; g[k].sum += r.value || 0;
    }
    return Object.values(g).map(v => ({ ...v, avg_value: v.count > 0 ? v.sum / v.count : 0 }));
  }
  if (l.includes("count(*)")) return [{ total: rows.length }];
  if (l.includes("select balance")) return rows.map(r => ({ balance: r.balance }));
  return rows;
}

function execGet(sql: string, ...p: any[]) { return execQuery(sql, ...p)[0] || undefined; }

function execRun(sql: string, ...params: any[]): { changes: number } {
  const l = sql.toLowerCase();
  const tn = findTable(sql);
  if (!tn) return { changes: 0 };
  if (l.startsWith("insert")) {
    const m = sql.match(/\(([^)]+)\)\s*VALUES/i);
    if (m) {
      const cols = m[1].split(",").map(c => c.trim());
      const row: any = {};
      cols.forEach((c, i) => { row[c] = params[i]; });
      tables[tn].push(row);
    }
    return { changes: 1 };
  }
  if (l.startsWith("update")) return { changes: 1 };
  if (l.startsWith("delete")) {
    const idx = tables[tn].findIndex(r => Object.values(r).includes(params[0]));
    if (idx >= 0) { tables[tn].splice(idx, 1); return { changes: 1 }; }
    return { changes: 0 };
  }
  return { changes: 0 };
}

const mockDb = {
  prepare: vi.fn((sql: string) => ({
    all: (...a: any[]) => Promise.resolve(execQuery(sql, ...a)),
    get: (...a: any[]) => Promise.resolve(execGet(sql, ...a)),
    run: (...a: any[]) => Promise.resolve(execRun(sql, ...a)),
  })),
};

// ── Module Mocks ───────────────────────────────────────────
vi.mock("@/lib/db", () => ({ getDb: () => Promise.resolve(mockDb), genId: () => `id_${Date.now()}` }));

vi.mock("@/lib/auth", () => ({
  getUserFromRequest: vi.fn((req: any) => {
    const a = req?.headers?.get?.("authorization");
    if (!a || !a.includes("Bearer")) return null;
    return { tenantId: "t_test", email: "test@acmecorp.com", id: "u1", name: "Test", role: "advertiser" };
  }),
  json: (d: any, s = 200) => new Response(JSON.stringify(d && typeof d === "object" && !Array.isArray(d) && !("ok" in d) ? { ok: true, ...d } : d), { status: s, headers: { "Content-Type": "application/json" } }),
  jsonError: (e: string, s = 400) => new Response(JSON.stringify({ error: e }), { status: s, headers: { "Content-Type": "application/json" } }),
  sanitizeString: (s: string) => s,
}));

vi.mock("@/lib/tenant", () => ({
  tenantScope: (q: string, tid: string) => ({ query: q + " WHERE tenant_id = ?", params: [tid] }),
  checkEnforcement: vi.fn().mockResolvedValue({ allowed: true }),
  checkPlanLimit: vi.fn().mockResolvedValue({ allowed: true, limit: 20, usage: 2 }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  handleApiError: vi.fn(),
}));

vi.mock("@/lib/bidding", () => ({
  runBiddingCycle: vi.fn().mockResolvedValue([
    { campaignId: "c1", action: "increase", newBid: 45, stopLossTriggered: false },
    { campaignId: "c3", action: "pause", newBid: 0, stopLossTriggered: true },
  ]),
  getBiddingStats: vi.fn().mockResolvedValue({
    totalCampaigns: 3, activeCampaigns: 2, avgBid: 42.5,
    stopLossesTriggered: 1, lastCycleAt: new Date().toISOString(),
  }),
  getDayPartingWeights: vi.fn().mockResolvedValue({
    weights: Array(24).fill(0).map((_, i) => i < 6 ? 0.3 : i < 12 ? 1.0 : i < 18 ? 1.2 : 0.6),
  }),
  initBiddingEventWiring: vi.fn(),
}));

vi.mock("@/lib/events", () => ({ eventBus: { emit: vi.fn(), on: vi.fn() } }));

// ── Helper ─────────────────────────────────────────────────
const H = { authorization: "Bearer fake-token" };
function req(url: string, method = "GET", body?: any): any {
  return { url: `http://localhost:3000${url}`, method, headers: new Headers(H), json: () => Promise.resolve(body) } as any;
}

// ============================================================
// E2E Tests
// ============================================================

describe("E2E: Status", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns 12 services", async () => {
    const { GET } = await import("@/app/api/status/route");
    const data = await (await GET(req("/api/status") as any)).json();
    expect(data.services).toHaveLength(12);
    expect(data.stats.agentsRunning).toBe(2);
  });
  it("returns public health data without auth", async () => {
    const { getUserFromRequest } = await import("@/lib/auth");
    vi.mocked(getUserFromRequest).mockReturnValueOnce(null as any);
    const res = await (await import("@/app/api/status/route")).GET(req("/api/status") as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.services).toHaveLength(12);
    expect(data.stats).toBeNull();
  });
});

describe("E2E: Campaigns", () => {
  beforeEach(() => vi.clearAllMocks());
  it("lists campaigns with summary", async () => {
    const data = await (await (await import("@/app/api/campaigns/route")).GET(req("/api/campaigns"))).json();
    expect(data.campaigns).toHaveLength(3);
    expect(data.summary.total).toBe(3);
    expect(data.summary.active).toBe(2);
  });
  it("filters by status=active", async () => {
    const data = await (await (await import("@/app/api/campaigns/route")).GET(req("/api/campaigns?status=active"))).json();
    expect(data.campaigns.every((c: any) => c.status === "active")).toBe(true);
    expect(data.campaigns).toHaveLength(2);
  });
  it("creates a campaign", async () => {
    const res = await (await import("@/app/api/campaigns/route")).POST(req("/api/campaigns", "POST", { name: "New", platform: "meta", budget: 5000 }));
    expect(res.status).toBeLessThan(500);
  });
  it("rejects without name", async () => {
    const res = await (await import("@/app/api/campaigns/route")).POST(req("/api/campaigns", "POST", { platform: "meta" }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("E2E: Bidding", () => {
  beforeEach(() => vi.clearAllMocks());
  it("GET returns stats", async () => {
    const data = await (await (await import("@/app/api/bidding/route")).GET(req("/api/bidding"))).json();
    expect(data.ok).toBe(true);
    expect(data.data.totalCampaigns).toBe(3);
  });
  it("GET daypart returns 24h weights", async () => {
    const data = await (await (await import("@/app/api/bidding/route")).GET(req("/api/bidding?action=daypart"))).json();
    expect(data.data.weights).toHaveLength(24);
  });
  it("POST triggers cycle", async () => {
    const data = await (await (await import("@/app/api/bidding/route")).POST(req("/api/bidding", "POST", { action: "run_cycle" }))).json();
    expect(data.data.cycleCompleted).toBe(true);
    expect(data.data.stopLosses).toBe(1);
  });
});

describe("E2E: Wallet", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns balance", async () => {
    const data = await (await (await import("@/app/api/wallet/route")).GET(req("/api/wallet"))).json();
    expect(data.balance).toBe(84200);
  });
});

describe("E2E: MMM (lite)", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns channels + model fit", async () => {
    const data = await (await (await import("@/app/api/mmm/route")).GET(req("/api/mmm"))).json();
    expect(data.ok).toBe(true);
    expect(data.data.channels).toHaveLength(3);
    expect(data.data.modelFit).toBeDefined();
    expect(data.data.summary.totalSpend).toBe(25000);
    expect(data.data.summary.totalRevenue).toBeGreaterThan(0);
    expect(data.data.diminishingReturns).toHaveLength(3);
  });
  it("google has highest efficiency", async () => {
    const data = await (await (await import("@/app/api/mmm/route")).GET(req("/api/mmm"))).json();
    const google = data.data.channels.find((c: any) => c.name === "Google");
    expect(google.efficiency).toBe(6.87);
  });
});

describe("E2E: Margin (lite)", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns margins by channel", async () => {
    const data = await (await (await import("@/app/api/margin/route")).GET(req("/api/margin"))).json();
    expect(data.ok).toBe(true);
    expect(data.data.overview.totalSpend).toBe(25000);
    expect(data.data.overview.totalRevenue).toBeGreaterThan(0);
    expect(data.data.overview.netProfit).toBeGreaterThan(0);
    expect(data.data.byChannel).toHaveLength(3);
  });
  it("each channel has positive ROI", async () => {
    const data = await (await (await import("@/app/api/margin/route")).GET(req("/api/margin"))).json();
    for (const ch of data.data.byChannel) {
      expect(ch.roi).toBeGreaterThan(0);
    }
  });
});

describe("E2E: Competitive (lite)", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns platform comparison", async () => {
    const data = await (await (await import("@/app/api/competitive/route")).GET(req("/api/competitive"))).json();
    expect(data.ok).toBe(true);
    expect(data.platforms).toHaveLength(3);
    expect(data.ourPerformance.totalSpend).toBe(25000);
  });
  it("positive trend when revenue > spend", async () => {
    const data = await (await (await import("@/app/api/competitive/route")).GET(req("/api/competitive"))).json();
    const google = data.platforms.find((p: any) => p.name === "Google");
    expect(google?.trend).toBe("positive");
  });
});

describe("E2E: Integrations OAuth PKCE", () => {
  beforeEach(() => vi.clearAllMocks());
  it("generates URL + code_verifier", async () => {
    const data = await (await (await import("@/app/api/integrations/route")).GET(req("/api/integrations?action=oauth_url&platform=meta"))).json();
    expect(data.ok).toBe(true);
    expect(data.data.url).toContain("facebook.com");
    expect(data.data.codeVerifier.length).toBe(43);
  });
});

describe("E2E: Auth guard", () => {
  beforeEach(() => vi.clearAllMocks());
  it("all protected routes return 401 without token", async () => {
    const { getUserFromRequest } = await import("@/lib/auth");
    vi.mocked(getUserFromRequest).mockReturnValue(null as any);
    const imports = [
      () => import("@/app/api/campaigns/route").then(m => m.GET(req("/api/campaigns"))),
      () => import("@/app/api/bidding/route").then(m => m.GET(req("/api/bidding"))),
      () => import("@/app/api/mmm/route").then(m => m.GET(req("/api/mmm"))),
      () => import("@/app/api/margin/route").then(m => m.GET(req("/api/margin"))),
      () => import("@/app/api/competitive/route").then(m => m.GET(req("/api/competitive"))),
    ];
    for (const fn of imports) {
      const res = await fn();
      expect(res.status).toBe(401);
    }
  });
});

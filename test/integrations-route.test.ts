import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ────────────────────────────────────────────────
const mockDb = {
  prepare: vi.fn(() => ({
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue({ changes: 0 }),
  })),
};

vi.mock("@/lib/db", () => ({ getDb: () => Promise.resolve(mockDb) }));

// ── Mock auth ──────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  getUserFromRequest: vi.fn(() => ({
    tenantId: "t_test",
    email: "test@test.com",
    id: "u1",
    name: "Test",
    role: "advertiser",
  })),
}));

// ── Mock connectors ────────────────────────────────────────
const mockConnector = {
  listCampaigns: vi.fn().mockResolvedValue({ success: true, data: [], latencyMs: 0 }),
  getAccountInfo: vi.fn().mockResolvedValue({ success: true, data: { id: "123", name: "Test" }, latencyMs: 0 }),
  generateOAuthUrl: vi.fn().mockResolvedValue({ url: "https://oauth.example.com", state: "abc123", codeVerifier: "verifier123" }),
  handleCallback: vi.fn().mockResolvedValue({ accessToken: "tok", expiresAt: Date.now() + 3600000, tokenType: "bearer", scope: [] }),
  refreshToken: vi.fn().mockResolvedValue({ accessToken: "tok_new", expiresAt: Date.now() + 3600000, tokenType: "bearer", scope: [] }),
  sendConversion: vi.fn().mockResolvedValue({ platform: "meta", success: true, latencyMs: 50 }),
};

vi.mock("@/lib/connectors", () => ({
  getConnector: () => mockConnector,
  getConnectorConfig: () => ({}),
  listConnectors: () => [],
  getSupportedPlatforms: () => ["meta", "google", "tiktok"],
  isPlatformSupported: (p: string) => ["meta", "google", "tiktok"].includes(p),
  sendConversionToAllPlatforms: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/connectors/base", () => ({
  encryptToken: (t: string) => `enc_${t}`,
  decryptToken: (t: string) => t.replace("enc_", ""),
}));

vi.mock("@/lib/events", () => ({
  eventBus: { emit: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  handleApiError: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────
function makeRequest(url: string, method = "GET", body?: any): any {
  const headers = new Headers({ authorization: "Bearer fake-token" });
  return {
    url,
    method,
    headers,
    json: () => Promise.resolve(body),
    nextUrl: new URL(url),
  } as any;
}

// ============================================================
// Integration Route Tests
// ============================================================

describe("GET /api/integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for DB queries
    mockDb.prepare.mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined),
      run: vi.fn().mockResolvedValue({ changes: 0 }),
    });
  });

  it("returns 401 without auth", async () => {
    const { getUserFromRequest } = await import("@/lib/auth");
    vi.mocked(getUserFromRequest).mockReturnValueOnce(null as any);
    const req = makeRequest("http://localhost:3000/api/integrations");
    const { GET } = await import("@/app/api/integrations/route");
    const res = await GET(req);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("lists connected platforms (default action)", async () => {
    const mockAll = vi.fn().mockResolvedValue([
      { id: "int_1", platform: "meta", status: "active", config: '{"accountName":"Acme"}', connected_at: "2026-01-01" },
    ]);
    mockDb.prepare.mockReturnValue({ all: mockAll, get: vi.fn(), run: vi.fn() });
    const req = makeRequest("http://localhost:3000/api/integrations");
    const { GET } = await import("@/app/api/integrations/route");
    const res = await GET(req);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].platform).toBe("meta");
  });

  it("generates OAuth URL for valid platform", async () => {
    const req = makeRequest("http://localhost:3000/api/integrations?action=oauth_url&platform=meta");
    const { GET } = await import("@/app/api/integrations/route");
    const res = await GET(req);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.url).toBe("https://oauth.example.com");
    expect(data.data.codeVerifier).toBe("verifier123");
  });

  it("rejects invalid platform for oauth_url", async () => {
    const req = makeRequest("http://localhost:3000/api/integrations?action=oauth_url&platform=invalid");
    const { GET } = await import("@/app/api/integrations/route");
    const res = await GET(req);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });
});

describe("POST /api/integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.prepare.mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined),
      run: vi.fn().mockResolvedValue({ changes: 0 }),
    });
  });

  it("handles OAuth callback with valid state", async () => {
    mockDb.prepare.mockReturnValue({
      all: vi.fn(),
      get: vi.fn().mockResolvedValue({
        state: "valid_state",
        tenant_id: "t_test",
        platform: "meta",
        code_verifier: "stored_verifier",
        expires_at: "2099-01-01",
      }),
      run: vi.fn().mockResolvedValue({ changes: 1 }),
    });

    const req = makeRequest("http://localhost:3000/api/integrations", "POST", {
      action: "oauth_callback",
      platform: "meta",
      code: "auth_code_123",
      state: "valid_state",
    });
    const { POST } = await import("@/app/api/integrations/route");
    const res = await POST(req);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.integrationId).toMatch(/^int_/);
    // Verify handleCallback was called with the code_verifier
    expect(mockConnector.handleCallback).toHaveBeenCalledWith("auth_code_123", "valid_state", "stored_verifier");
  });

  it("rejects OAuth callback with expired/missing state", async () => {
    mockDb.prepare.mockReturnValue({
      all: vi.fn(),
      get: vi.fn().mockResolvedValue(undefined),
      run: vi.fn(),
    });

    const req = makeRequest("http://localhost:3000/api/integrations", "POST", {
      action: "oauth_callback",
      platform: "meta",
      code: "code",
      state: "bad_state",
    });
    const { POST } = await import("@/app/api/integrations/route");
    const res = await POST(req);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/expired|Invalid/i);
  });

  it("disconnects a platform", async () => {
    const mockRun = vi.fn().mockResolvedValue({ changes: 1 });
    mockDb.prepare.mockReturnValue({ all: vi.fn(), get: vi.fn(), run: mockRun });

    const req = makeRequest("http://localhost:3000/api/integrations", "POST", {
      action: "disconnect",
      platform: "meta",
    });
    const { POST } = await import("@/app/api/integrations/route");
    const res = await POST(req);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("rejects OAuth callback without code/state", async () => {
    const req = makeRequest("http://localhost:3000/api/integrations", "POST", {
      action: "oauth_callback",
      platform: "meta",
    });
    const { POST } = await import("@/app/api/integrations/route");
    const res = await POST(req);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });
});

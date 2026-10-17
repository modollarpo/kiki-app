import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { isDbAvailable } from "./db-env";

// ============================================================
// Real critical-flow E2E — NO module mocks.
// Drives actual route handlers against the real database layer
// (PostgreSQL in CI/prod, local SQLite file otherwise) and the
// real auth/JWT implementation.
// ============================================================

const dbAvailable = await isDbAvailable();

let e2eToken = "";

describe.skipIf(!dbAvailable)("Critical flows — real DB, no mocks", () => {
  let token = "";
  let createdId = "";

  beforeAll(async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonReq("/api/auth/login", "POST", {
      email: "demo@keekii.net",
      password: "password123",
    }));
    const data = await res.json();
    token = data.token ?? "";
    e2eToken = token;
    expect(token.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    if (createdId) {
      const db = await getDb();
      await db.prepare("DELETE FROM campaigns WHERE id = ?").run(createdId);
    }
  });

  // ── Auth ────────────────────────────────────────────────

  it("login returns a real JWT and /me resolves the same user", async () => {
    const { GET } = await import("@/app/api/auth/me/route");
    const res = await GET(authReq("/api/auth/me"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe("demo@keekii.net");
    expect(data.user.tenantId).toBe("t1");
  });

  it("rejects a bad password", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonReq("/api/auth/login", "POST", {
      email: "demo@keekii.net",
      password: "wrong-password",
    }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it("rejects protected routes without a token", async () => {
    const { GET } = await import("@/app/api/campaigns/route");
    const res = await GET(plainReq("/api/campaigns"));
    expect(res.status).toBe(401);
  });

  // ── Campaigns CRUD ──────────────────────────────────────

  it("creates, reads, updates and deletes a campaign end-to-end", async () => {
    const listMod = await import("@/app/api/campaigns/route");
    const idMod = await import("@/app/api/campaigns/[id]/route");

    const unique = `E2E ${Date.now()}`;
    const createRes = await listMod.POST(jsonReq("/api/campaigns", "POST", {
      name: unique,
      platform: "meta",
      budget: 4321,
    }));
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    createdId = created.id;
    expect(created.name).toBe(unique);
    expect(created.status).toBe("draft");
    expect(created.tenant_id).toBe("t1");

    const getRes = await idMod.GET(authReq(`/api/campaigns/${createdId}`), { params: Promise.resolve({ id: createdId }) });
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.campaign.id).toBe(createdId);
    expect(fetched.campaign.budget).toBe(4321);

    const putRes = await idMod.PUT(jsonReq(`/api/campaigns/${createdId}`, "PUT", { budget: 9999 }), { params: Promise.resolve({ id: createdId }) });
    expect(putRes.status).toBe(200);
    const updated = await putRes.json();
    expect(updated.campaign.budget).toBe(9999);

    const delRes = await idMod.DELETE(authReq(`/api/campaigns/${createdId}`), { params: Promise.resolve({ id: createdId }) });
    expect(delRes.status).toBe(200);

    const gone = await idMod.GET(authReq(`/api/campaigns/${createdId}`), { params: Promise.resolve({ id: createdId }) });
    const goneData = await gone.json();
    expect(goneData.campaign.status).toBe("deleted");
  });

  it("lists campaigns scoped to the caller's tenant", async () => {
    const { GET } = await import("@/app/api/campaigns/route");
    const res = await GET(authReq("/api/campaigns"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.campaigns)).toBe(true);
    expect(data.summary.total).toBeGreaterThanOrEqual(0);
  });

  // ── Dashboard / Wallet / Signals / Bidding reads ────────

  it("dashboard returns KPIs + agents for the tenant", async () => {
    const { GET } = await import("@/app/api/dashboard/route");
    const res = await GET(authReq("/api/dashboard"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("wallet returns a numeric balance", async () => {
    const { GET } = await import("@/app/api/wallet/route");
    const res = await GET(authReq("/api/wallet"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.balance).toBe("number");
  });

  it("signals returns a real stats payload", async () => {
    const { GET } = await import("@/app/api/signals/route");
    const res = await GET(authReq("/api/signals"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("bidding stats + day-parting weights load from the real engine", async () => {
    const mod = await import("@/app/api/bidding/route");
    const statsRes = await mod.GET(nextReq("/api/bidding", e2eToken));
    expect(statsRes.status).toBe(200);
    const stats = await statsRes.json();
    expect(stats.ok).toBe(true);

    const daypartRes = await mod.GET(nextReq("/api/bidding?action=daypart", e2eToken));
    const daypart = await daypartRes.json();
    expect(daypart.data).toHaveLength(168);
    expect(daypart.data[0]).toHaveProperty("weight");
  });
});

// ── Request helpers ────────────────────────────────────────

function plainReq(url: string): Request {
  return {
    url: `http://localhost:3000${url}`,
    method: "GET",
    headers: new Headers(),
  } as unknown as Request;
}

function nextReq(url: string, token: string): NextRequest {
  return {
    url: `http://localhost:3000${url}`,
    method: "GET",
    headers: new Headers({ authorization: `Bearer ${token}` }),
  } as unknown as NextRequest;
}

function authReq(url: string): Request {
  return {
    url: `http://localhost:3000${url}`,
    method: "GET",
    headers: new Headers({ authorization: `Bearer ${e2eToken}` }),
  } as unknown as Request;
}

function jsonReq(url: string, method: string, body: unknown): Request {
  return {
    url: `http://localhost:3000${url}`,
    method,
    headers: new Headers({ authorization: `Bearer ${e2eToken}`, "content-type": "application/json" }),
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

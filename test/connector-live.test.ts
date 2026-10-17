import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { MetaConnector } from "../src/lib/connectors/meta";

interface Captured {
  method: string;
  url: string;
  body: Record<string, unknown> | null;
}

const requests: Captured[] = [];
let server: http.Server;
let baseUrl: string;

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise(resolve => {
    let data = "";
    req.on("data", c => (data += c));
    req.on("end", () => resolve(data));
  });
}

beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    const raw = await readBody(req);
    let body: Record<string, unknown> | null = null;
    if (raw) {
      try {
        body = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        body = { _raw: raw };
      }
    }
    requests.push({ method: req.method ?? "", url: req.url ?? "", body });

    res.setHeader("Content-Type", "application/json");

    if (req.method === "GET" && /\/adsets(\?|$)/.test(req.url ?? "")) {
      res.end(JSON.stringify({
        data: [
          { id: "as_1", name: "Adset One", status: "ACTIVE", bid_amount: "250", daily_budget: "5000" },
          { id: "as_2", name: "Adset Two", status: "ACTIVE", bid_amount: "400", daily_budget: "8000" },
        ],
      }));
      return;
    }

    // Any POST is an object update (campaign or ad set) → echo the id back.
    res.end(JSON.stringify({ id: "ok" }));
  });

  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://127.0.0.1:${port}/v19.0`;
});

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe("MetaConnector live HTTP path", () => {
  it("lists ad sets via GET {campaignId}/adsets and parses cents to dollars", async () => {
    const connector = new MetaConnector();
    connector.config.apiBaseUrl = baseUrl;

    const res = await connector.getAdSets("test-token", "camp_1");

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    expect(res.data?.[0]).toMatchObject({ id: "as_1", campaignId: "camp_1", bidAmount: 2.5, dailyBudget: 50 });
    expect(res.data?.[1]).toMatchObject({ id: "as_2", bidAmount: 4 });

    const listReq = requests.find(r => r.method === "GET" && r.url.includes("/adsets"));
    expect(listReq?.url).toContain("camp_1/adsets");
  });

  it("pushes a bid as bid_amount (cents) and NEVER sends daily_budget", async () => {
    const connector = new MetaConnector();
    connector.config.apiBaseUrl = baseUrl;

    const res = await connector.updateAdSet("test-token", "as_1", { bidAmount: 3.5 });

    expect(res.success).toBe(true);

    const push = requests.find(r => r.method === "POST" && r.url.endsWith("/as_1"));
    expect(push).toBeDefined();
    expect(push?.body).toEqual({ bid_amount: 350 });
    expect(push?.body).not.toHaveProperty("daily_budget");
  });

  it("applies a bid through applyBidDecision against the mock (end-to-end object path)", async () => {
    const connector = new MetaConnector();
    connector.config.apiBaseUrl = baseUrl;

    const adSets = await connector.getAdSets("test-token", "camp_1");
    expect(adSets.success).toBe(true);

    for (const adSet of adSets.data ?? []) {
      const r = await connector.updateAdSet("test-token", adSet.id, { bidAmount: 3.5 });
      expect(r.success).toBe(true);
    }

    const pushes = requests.filter(r => r.method === "POST");
    expect(pushes.length).toBeGreaterThanOrEqual(2);
    for (const p of pushes) {
      expect(p.body).toHaveProperty("bid_amount");
      expect(p.body).not.toHaveProperty("daily_budget");
    }
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { getDb, genId } from "@/lib/db";
import {
  createVirtualCard,
  recordCardTransaction,
  getCampaignCards,
  getWalletBalance,
} from "@/lib/wallet";
import { isDbAvailable } from "./db-env";

const dbAvailable = await isDbAvailable();

const TENANT = "t1";
const WALLET = "w1"; // seeded Acme Corp wallet

describe.skipIf(!dbAvailable)("wallet — virtual cards", () => {
  it("creates a virtual card for a campaign", async () => {
    const card = await createVirtualCard(TENANT, WALLET, genId("cmp"), "Test Campaign", 100, 5000);
    expect(card.id).toBeTruthy();
    expect(card.limit).toBe(5000);
    expect(card.dailyLimit).toBe(100);
    expect(card.status).toBe("active");

    const db = await getDb();
    const stored = db.prepare("SELECT * FROM wallet_cards WHERE id = ?").get(card.id) as any;
    expect(stored).toBeTruthy();
    expect(stored.status).toBe("active");
  });

  it("charges a card and decrements wallet balance", async () => {
    const card = await createVirtualCard(TENANT, WALLET, genId("cmp"), "Charge Campaign", 100, 5000);
    const before = (await getWalletBalance(TENANT)).balance;

    const res = await recordCardTransaction(card.id, 250, "Ad network spend");
    expect(res.success).toBe(true);

    const after = (await getWalletBalance(TENANT)).balance;
    expect(after).toBeCloseTo(before - 250, 2);
  });

  it("rejects charges on a frozen card", async () => {
    const card = await createVirtualCard(TENANT, WALLET, genId("cmp"), "Frozen Campaign", 100, 5000);
    const db = await getDb();
    db.prepare("UPDATE wallet_cards SET status = 'frozen' WHERE id = ?").run(card.id);

    const res = await recordCardTransaction(card.id, 10, "should fail");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/frozen/i);
  });

  it("lists cards for the tenant", async () => {
    const cards = await getCampaignCards(TENANT);
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);
  });
});

beforeAll(async () => {
  await getDb();
});

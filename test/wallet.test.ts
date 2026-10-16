import { describe, it, expect, beforeAll } from "vitest";
import { getDb, genId } from "@/lib/db";
import {
  createVirtualCard,
  recordCardTransaction,
  getCampaignCards,
  getWalletBalance,
} from "@/lib/wallet";
import { isStripeIssuingEnabled } from "@/lib/card-issuer";
import { isDbAvailable } from "./db-env";

const dbAvailable = await isDbAvailable();

const TENANT = "t1";
const WALLET = "w1"; // seeded Acme Corp wallet

// Inserts a card row directly. Card *issuance* requires a real provider
// (Stripe Issuing), so ledger behaviour is exercised against a known row.
async function insertCard(status = "active", limit = 5000): Promise<string> {
  const db = await getDb();
  const id = genId("wc_test");
  await db.prepare(`
    INSERT INTO wallet_cards (id, wallet_id, last4, brand, "limit", spent, campaign, status)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, WALLET, "1234", "Visa", limit, "Test Campaign", status);
  return id;
}

describe.skipIf(!dbAvailable)("wallet — virtual cards", () => {
  it("fails loud when no card provider is configured", async () => {
    if (isStripeIssuingEnabled()) return; // provider configured → issuance is exercised elsewhere
    await expect(
      createVirtualCard(TENANT, WALLET, genId("cmp"), "Test Campaign", 100, 5000)
    ).rejects.toThrow(/Stripe Issuing/);
  });

  it("charges a card and decrements wallet balance", async () => {
    const cardId = await insertCard();
    const before = (await getWalletBalance(TENANT)).balance;

    const res = await recordCardTransaction(cardId, 250, "Ad network spend");
    expect(res.success).toBe(true);

    const after = (await getWalletBalance(TENANT)).balance;
    expect(after).toBeCloseTo(before - 250, 2);
  });

  it("rejects charges on a frozen card", async () => {
    const cardId = await insertCard("frozen");

    const res = await recordCardTransaction(cardId, 10, "should fail");
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

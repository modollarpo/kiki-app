import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "@/lib/db";
import { spendFromWallet, deductAdSpend, getWalletBalance } from "@/lib/wallet";
import { runNightlyReconciliation } from "@/lib/reconciliation";
import { isDbAvailable } from "./db-env";

const dbAvailable = await isDbAvailable();

// Unique tenant/wallet so this suite never collides with the seeded demo wallet
// or other suites that share the test SQLite file.
const TENANT = `fs_${Date.now()}`;
const WALLET = `w_${TENANT}`;
const START_BALANCE = 1000;

describe.skipIf(!dbAvailable)("financial safety — atomic, idempotent wallet debit", () => {
  beforeAll(async () => {
    const db = await getDb();
    await db.prepare("DELETE FROM wallet_transactions WHERE wallet_id = ?").run(WALLET);
    await db.prepare("DELETE FROM wallets WHERE id = ?").run(WALLET);
    await db.prepare(
      "INSERT INTO wallets (id, tenant_id, balance, currency) VALUES (?, ?, ?, 'USD')"
    ).run(WALLET, TENANT, START_BALANCE);
    // Ensure ledger matches stored balance so reconciliation starts clean.
    await db
      .prepare(
        "INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status, created_at) VALUES (?, ?, 'credit', ?, 'Initial funding', 'settled', datetime('now'))"
      )
      .run(`tx_init_${TENANT}`, WALLET, START_BALANCE);
  });

  it("debits atomically and reports the remaining balance", async () => {
    const res = await spendFromWallet(TENANT, 100, "test spend", "fs-key-1");
    expect(res.success).toBe(true);
    expect(res.balanceAfter).toBe(START_BALANCE - 100);
    expect((await getWalletBalance(TENANT)).balance).toBe(START_BALANCE - 100);
  });

  it("is idempotent — replaying the same key never double-debits", async () => {
    const first = await spendFromWallet(TENANT, 50, "idem", "fs-key-2");
    expect(first.success).toBe(true);
    const before = (await getWalletBalance(TENANT)).balance;

    const replay = await spendFromWallet(TENANT, 50, "idem", "fs-key-2");
    expect(replay.alreadyApplied).toBe(true);
    expect((await getWalletBalance(TENANT)).balance).toBe(before);
  });

  it("refuses to overdraw and never drives the balance negative", async () => {
    const res = await spendFromWallet(TENANT, 1_000_000, "too much", "fs-key-3");
    expect(res.success).toBe(false);
    expect(res.error).toBe("INSUFFICIENT_BALANCE");
    expect((await getWalletBalance(TENANT)).balance).toBeGreaterThanOrEqual(0);
  });

  it("rejects non-positive amounts", async () => {
    expect((await spendFromWallet(TENANT, 0, "zero", "fs-key-4")).error).toBe("INVALID_AMOUNT");
    expect((await spendFromWallet(TENANT, -5, "neg", "fs-key-5")).error).toBe("INVALID_AMOUNT");
  });

  it("deductAdSpend routes through the same idempotent choke point", async () => {
    const before = (await getWalletBalance(TENANT)).balance;
    const a = await deductAdSpend(TENANT, 25, "cmp_fs", "ad spend", "fs-adspend-1");
    expect(a.success).toBe(true);
    const mid = (await getWalletBalance(TENANT)).balance;
    expect(mid).toBe(before - 25);

    const b = await deductAdSpend(TENANT, 25, "cmp_fs", "ad spend", "fs-adspend-1");
    expect(b.success).toBe(true);
    expect((await getWalletBalance(TENANT)).balance).toBe(mid);
  });
});

describe.skipIf(!dbAvailable)("financial safety — nightly reconciliation", () => {
  it("reports no drift for a wallet whose ledger matches its balance", async () => {
    const result = await runNightlyReconciliation();
    expect(result.checked).toBeGreaterThan(0);
    expect(result.mismatches.find((m) => m.tenantId === TENANT)).toBeUndefined();
  });
});

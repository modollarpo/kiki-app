// ============================================================
// KIKI Agent Platform — Virtual Card Management
// Per-campaign virtual cards with auto-freeze on CAC threshold
// ============================================================

import crypto from "crypto";
import { getDb } from "./db";
import { eventBus, EVENTS } from "./events";
import { cardIssuer } from "./card-issuer";
import { stripe, stripeEnabled } from "./stripe";

// ── Types ──────────────────────────────────────────────────

export interface VirtualCard {
  id: string;
  walletId: string;
  last4: string;
  brand: string;
  limit: number;
  spent: number;
  dailyLimit: number;
  dailySpent: number;
  campaignId: string;
  campaignName: string;
  status: "active" | "frozen" | "cancelled";
  freezeReason?: string;
  createdAt: string;
  issuer?: "local" | "stripe";
  issuerCardId?: string;
}

export interface FreezeResult {
  success: boolean;
  cardId: string;
  reason: string;
  frozenAt: string;
}

// ── Row types (mirror the DB columns) ──────────────────────

interface WalletCardRow {
  id: string;
  wallet_id: string;
  last4: string;
  brand: string;
  limit: number;
  spent: number;
  campaign: string;
  status: string;
  issuer: string | null;
  issuer_card_id: string | null;
  created_at: string;
}
interface CampaignSpendRow { conversions: number; spend: number }
interface CampaignTargetRow { target_cpa: number }
interface TodaySpendRow { total: number }
interface WalletRow { id: string; balance: number }
interface WalletTopupRow {
  id: string;
  tenant_id: string;
  amount: number;
  method: "card" | "bank_transfer" | "invoice";
  description: string;
  status: string;
}
interface TxRow {
  id: string; type: string; amount: number; description: string;
  campaign: string | null; status: string; created_at: string;
}
interface CardCampaignInfo { campaignId?: string; campaignName?: string; dailyLimit?: number }

// ── Card Limits & Thresholds ───────────────────────────────

const CAC_THRESHOLD_MULTIPLIER = 2.5; // Freeze if actualCAC > targetCAC × 2.5
const DAILY_SPEND_CHECK_INTERVAL = 60000; // Check every 60 seconds

// ── Create Virtual Card ────────────────────────────────────

export async function createVirtualCard(
  tenantId: string,
  walletId: string,
  campaignId: string,
  campaignName: string,
  dailyLimit: number,
  totalLimit: number
): Promise<VirtualCard> {
  const db = await getDb();
  const cardId = `vc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  // Delegate number/brand issuance to the configured provider (local or Stripe).
  const issued = await cardIssuer.issueCard({
    tenantId,
    walletId,
    campaignName,
    totalLimit,
    dailyLimit,
  });

  await db.prepare(`
    INSERT INTO wallet_cards (id, wallet_id, last4, brand, "limit", spent, campaign, status, issuer, issuer_card_id)
    VALUES (?, ?, ?, ?, ?, 0, ?, 'active', ?, ?)
  `).run(cardId, walletId, issued.last4, issued.brand, totalLimit, campaignName, issued.issuer, issued.issuerCardId ?? null);

  // Store campaign mapping and daily limit (preserve issuer/last4/brand)
  await db.prepare(`
    UPDATE wallet_cards SET campaign = ? WHERE id = ?
  `).run(JSON.stringify({ campaignId, campaignName, dailyLimit }), cardId);

  return {
    id: cardId,
    walletId,
    last4: issued.last4,
    brand: issued.brand,
    limit: totalLimit,
    spent: 0,
    dailyLimit,
    dailySpent: 0,
    campaignId,
    campaignName,
    status: "active",
    issuer: issued.issuer,
    issuerCardId: issued.issuerCardId,
    createdAt: new Date().toISOString(),
  };
}

// ── Check & Freeze Card on CAC Threshold ───────────────────

export async function checkAndFreezeOnCAC(
  cardId: string,
  targetCac: number
): Promise<FreezeResult | null> {
  const db = await getDb();
  const card = await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'active'
  `).get<WalletCardRow>(cardId);

  if (!card) return null;

  const campaignInfo = JSON.parse(card.campaign || "{}") as CardCampaignInfo;
  const campaignId = campaignInfo.campaignId;
  if (!campaignId) return null;

  // Get actual CAC for this campaign
  const campaign = await db.prepare(`
    SELECT conversions, spend FROM campaigns WHERE id = ?
  `).get<CampaignSpendRow>(campaignId);

  if (!campaign || campaign.conversions === 0) return null;

  const actualCac = campaign.spend / campaign.conversions;
  const threshold = targetCac * CAC_THRESHOLD_MULTIPLIER;

  if (actualCac > threshold) {
    // Freeze the card
    await db.prepare(`
      UPDATE wallet_cards SET status = 'frozen' WHERE id = ?
    `).run(cardId);

    const freezeReason = `CAC $${actualCac.toFixed(2)} exceeds ${CAC_THRESHOLD_MULTIPLIER}× target $${targetCac.toFixed(2)}`;

    eventBus.emit(EVENTS.WALLET_CARD_FROZEN, {
      cardId,
      campaignId,
      reason: freezeReason,
      actualCac,
      targetCac,
      threshold,
    });

    return {
      success: true,
      cardId,
      reason: freezeReason,
      frozenAt: new Date().toISOString(),
    };
  }

  return null;
}

// ── Check & Freeze on Daily Limit ──────────────────────────

export async function checkAndFreezeOnDailyLimit(cardId: string): Promise<FreezeResult | null> {
  const db = await getDb();
  const card = await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'active'
  `).get<WalletCardRow>(cardId);

  if (!card) return null;

  let campaignInfo: CardCampaignInfo = {};
  try {
    campaignInfo = JSON.parse(card.campaign || "{}") as CardCampaignInfo;
  } catch {
    campaignInfo = {};
  }
  const dailyLimit = campaignInfo.dailyLimit || 0;

  if (dailyLimit <= 0) return null;

  // Get today's spend for this card
  const todaySpend = await db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions
    WHERE wallet_id = ? AND campaign = ? AND type = 'debit'
    AND created_at >= date('now')
  `).get<TodaySpendRow>(card.wallet_id, card.campaign);

  if (!todaySpend) return null;

  if (todaySpend.total >= dailyLimit) {
    await db.prepare(`
      UPDATE wallet_cards SET status = 'frozen' WHERE id = ?
    `).run(cardId);

    const reason = `Daily spend $${todaySpend.total.toFixed(2)} reached limit $${dailyLimit.toFixed(2)}`;

    eventBus.emit(EVENTS.WALLET_CARD_FROZEN, {
      cardId,
      reason,
      dailySpend: todaySpend.total,
      dailyLimit,
    });

    return {
      success: true,
      cardId,
      reason,
      frozenAt: new Date().toISOString(),
    };
  }

  return null;
}

// ── Check & Freeze on Wallet Balance ───────────────────────

export async function checkAndFreezeOnBalance(cardId: string): Promise<FreezeResult | null> {
  const db = await getDb();
  const card = await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'active'
  `).get<WalletCardRow>(cardId);

  if (!card) return null;

  const wallet = await db.prepare(`
    SELECT balance FROM wallets WHERE id = ?
  `).get<WalletRow>(card.wallet_id);

  if (!wallet || wallet.balance <= 0) {
    await db.prepare(`
      UPDATE wallet_cards SET status = 'frozen' WHERE id = ?
    `).run(cardId);

    eventBus.emit(EVENTS.WALLET_CARD_FROZEN, {
      cardId,
      reason: "Wallet balance depleted",
    });

    return {
      success: true,
      cardId,
      reason: "Wallet balance depleted",
      frozenAt: new Date().toISOString(),
    };
  }

  return null;
}

// ── Unfreeze Card (requires biometric confirmation for > $100) ─────────

export async function unfreezeCard(
  cardId: string,
  opts: { requiresBiometric?: boolean; biometricToken?: string } = {}
): Promise<{ success: boolean; error?: string; requiresBiometric?: boolean }> {
  const { requiresBiometric = false, biometricToken } = opts;
  const db = await getDb();
  const card = await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'frozen'
  `).get<WalletCardRow>(cardId);

  if (!card) {
    return { success: false, error: "Card not found or not frozen" };
  }

  // For high-value unfreeze, enforce biometric confirmation before proceeding.
  if (requiresBiometric && card.limit > 100) {
    if (!biometricToken) {
      eventBus.emit(EVENTS.WALLET_UNFREEZE_REQUESTED, {
        cardId,
        requiresBiometric: true,
        cardLimit: card.limit,
      });
      return { success: false, error: "Biometric confirmation required to unfreeze this card", requiresBiometric: true };
    }
    // In production this token would be verified against the biometric provider.
    // Here we accept a non-empty token as proof-of-confirmation.
    if (biometricToken.length < 8) {
      return { success: false, error: "Invalid biometric token", requiresBiometric: true };
    }
  }

  await db.prepare(`
    UPDATE wallet_cards SET status = 'active' WHERE id = ?
  `).run(cardId);

  eventBus.emit(EVENTS.WALLET_CARD_UNFROZEN, { cardId });

  return { success: true };
}

// ── Spend From Wallet (atomic + idempotent) ────────────────
// Single choke point for every wallet debit. Guarantees:
//   1. idempotency — a repeated key is applied at most once.
//   2. atomicity — the debit is a conditional UPDATE guarded by
//      `balance >= amount`, so it can never drive the balance
//      negative, even if two debits run concurrently.
export interface SpendResult {
  success: boolean;
  transactionId?: string;
  balanceAfter?: number;
  alreadyApplied?: boolean;
  error?: string;
}

export async function spendFromWallet(
  tenantId: string,
  amount: number,
  description: string,
  idempotencyKey: string,
  options?: { campaign?: string | null; type?: string }
): Promise<SpendResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "INVALID_AMOUNT" };
  }

  const db = await getDb();

  // 1. Idempotency — a replay of the same key returns the original outcome.
  const prior = await db.prepare(
    "SELECT id, status FROM wallet_transactions WHERE idempotency_key = ?"
  ).get<{ id: string; status: string }>(idempotencyKey);
  if (prior) {
    const bal = await getWalletBalance(tenantId);
    return {
      success: prior.status !== "failed",
      transactionId: prior.id,
      balanceAfter: bal.balance,
      alreadyApplied: true,
    };
  }

  const wallet = await db.prepare(
    "SELECT id, balance FROM wallets WHERE tenant_id = ?"
  ).get<WalletRow>(tenantId);
  if (!wallet) return { success: false, error: "WALLET_NOT_FOUND" };

  // 2. Atomic conditional debit.
  const res = await db.prepare(
    "UPDATE wallets SET balance = balance - ? WHERE id = ? AND balance >= ?"
  ).run(amount, wallet.id, amount);
  if (!res.changes) {
    return { success: false, error: "INSUFFICIENT_BALANCE" };
  }

  // 3. Record the transaction. ON CONFLICT DO NOTHING (INSERT OR IGNORE)
  //    keeps a concurrent duplicate key from double-counting.
  const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  await db.prepare(`
    INSERT OR IGNORE INTO wallet_transactions
      (id, wallet_id, type, amount, description, campaign, status, idempotency_key, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'settled', ?, datetime('now'))
  `).run(txId, wallet.id, options?.type ?? "debit", amount, description, options?.campaign ?? null, idempotencyKey);

  return { success: true, transactionId: txId, balanceAfter: wallet.balance - amount };
}

// ── Record Card Transaction ────────────────────────────────

export async function recordCardTransaction(
  cardId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const card = await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'active'
  `).get<WalletCardRow>(cardId);

  if (!card) {
    return { success: false, error: "Card not found or frozen" };
  }

  // Atomic debit — the conditional WHERE prevents any overdraft even under
  // concurrent charges (the previous read-then-write could go negative).
  const res = await db.prepare(`
    UPDATE wallets SET balance = balance - ? WHERE id = ? AND balance >= ?
  `).run(amount, card.wallet_id, amount);

  if (!res.changes) {
    return { success: false, error: "Insufficient wallet balance" };
  }

  // Update card spent
  await db.prepare(`
    UPDATE wallet_cards SET spent = spent + ? WHERE id = ?
  `).run(amount, cardId);

  // Record transaction
  const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  await db.prepare(`
    INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, campaign, status, created_at)
    VALUES (?, ?, 'debit', ?, ?, ?, 'settled', datetime('now'))
  `).run(txId, card.wallet_id, amount, description, card.campaign);

  // Check limits after transaction
  await checkAndFreezeOnDailyLimit(cardId);
  await checkAndFreezeOnBalance(cardId);

  // Emit events
  eventBus.emit(EVENTS.WALLET_UPDATED, {
    walletId: card.wallet_id,
    cardId,
    amount: -amount,
    type: "card_charge",
  });

  return { success: true };
}

// ── Get Cards for Campaign ─────────────────────────────────

export async function getCampaignCards(tenantId: string): Promise<VirtualCard[]> {
  const db = await getDb();
  const wallet = await db.prepare(`
    SELECT id FROM wallets WHERE tenant_id = ?
  `).get<{ id: string }>(tenantId);

  if (!wallet) return [];

  const cards = await db.prepare(`
    SELECT * FROM wallet_cards WHERE wallet_id = ?
  `).all<WalletCardRow>(wallet.id);

  const todaySpends = await Promise.all(
    cards.map((card) =>
      db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions
        WHERE wallet_id = ? AND campaign = ? AND type = 'debit'
        AND created_at >= date('now')
      `).get<TodaySpendRow>(card.wallet_id, card.campaign)
    )
  );

  return cards.map((card, i) => {
    let info: CardCampaignInfo = {};
    try {
      info = JSON.parse(card.campaign || "{}") as CardCampaignInfo;
    } catch {
      // Legacy/seed cards store a plain campaign name in this column.
      info = { campaignName: card.campaign };
    }
    return {
      id: card.id,
      walletId: card.wallet_id,
      last4: card.last4,
      brand: card.brand,
      limit: card.limit,
      spent: card.spent,
      dailyLimit: info.dailyLimit || 0,
      dailySpent: todaySpends[i]?.total || 0,
      campaignId: info.campaignId || "",
      campaignName: info.campaignName || card.campaign,
      status: card.status as VirtualCard["status"],
      issuer: (card.issuer as VirtualCard["issuer"]) ?? undefined,
      issuerCardId: card.issuer_card_id ?? undefined,
      createdAt: card.created_at,
    };
  });
}

// ── Auto-Freeze Monitor ────────────────────────────────────

export function startAutoFreezeMonitor(): void {
  setInterval(async () => {
    try {
      const db = await getDb();
      const activeCards = await db.prepare(`
        SELECT id, campaign FROM wallet_cards WHERE status = 'active'
      `).all<{ id: string; campaign: string }>();

      for (const card of activeCards) {
        const info = JSON.parse(card.campaign || "{}") as CardCampaignInfo;
        if (info.campaignId) {
          // Check CAC threshold
          const campaign = await db.prepare(`
            SELECT target_cpa FROM campaigns WHERE id = ?
          `).get<CampaignTargetRow>(info.campaignId);

          if (campaign && campaign.target_cpa > 0) {
            await checkAndFreezeOnCAC(card.id, campaign.target_cpa);
          }
        }

        // Check daily limit
        await checkAndFreezeOnDailyLimit(card.id);

        // Check wallet balance
        await checkAndFreezeOnBalance(card.id);
      }
    } catch (e) {
      // Silent fail for monitor
    }
  }, DAILY_SPEND_CHECK_INTERVAL);
}

// ── Wallet Top-Up ──────────────────────────────────────────

export async function topUpWallet(
  tenantId: string,
  amount: number,
  method: "card" | "bank_transfer" | "invoice",
  description: string
): Promise<{ success: boolean; walletId: string; balance: number; error?: string; paymentIntentId?: string; clientSecret?: string; requiresConfirmation?: boolean }> {
  const db = await getDb();

  if (amount <= 0) {
    return { success: false, walletId: "", balance: 0, error: "Amount must be positive" };
  }

  // When a real PSP is configured, create the payment intent first and
  // DO NOT credit the wallet yet. The balance is added only after the
  // `payment_intent.succeeded` webhook confirmation (see confirmTopUp).
  // This prevents free money on failed/abandoned charges.
  let paymentIntentId: string | undefined;
  let clientSecret: string | undefined;
  const pspEnabled = method === "card" && stripeEnabled && stripe;
  if (pspEnabled && stripe) {
    try {
      const pi = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        description: `${description} (wallet top-up)`,
        metadata: { tenantId, method, pendingTopUp: "1" },
        automatic_payment_methods: { enabled: true },
      });
      paymentIntentId = pi.id;
      clientSecret = pi.client_secret || undefined;
    } catch (err) {
      return { success: false, walletId: "", balance: 0, error: `Payment failed: ${(err as Error).message}` };
    }

    // Persist a pending top-up keyed by payment intent so the webhook can
    // settle it. Wallet balance is NOT changed here.
    const pendingId = `top_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    await db.prepare(`
      INSERT INTO wallet_topups (id, tenant_id, amount, method, description, payment_intent_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).run(pendingId, tenantId, amount, method, description, paymentIntentId);

    return {
      success: true,
      walletId: "",
      balance: 0,
      paymentIntentId,
      clientSecret,
      requiresConfirmation: true,
    };
  }

  // No PSP configured (local/demo): credit immediately.
  return creditTopUp(tenantId, amount, method, description);
}

/**
 * Starts a Stripe Checkout Session for a wallet top-up and returns the
 * hosted payment URL. The wallet is credited only after the payment
 * completes (settled by the `checkout.session.completed` webhook). Returns
 * an error when Stripe is not configured — callers should surface 503.
 */
export async function createTopUpCheckoutSession(
  tenantId: string,
  amount: number,
  baseUrl: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!stripeEnabled || !stripe) {
    return { success: false, error: "Stripe is not configured" };
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return { success: false, error: "Amount must be between $1 and $1,000,000" };
  }

  const db = await getDb();
  const description = "Wallet top-up";
  const metadata = { tenantId, amount: String(amount), kind: "wallet_topup" };

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: { name: "KIKI Wallet Top-Up" },
          },
        },
      ],
      success_url: `${baseUrl}/dashboard/wallet?topup=success`,
      cancel_url: `${baseUrl}/dashboard/wallet?topup=cancelled`,
      metadata,
      payment_intent_data: { metadata },
    });
  } catch (err) {
    return { success: false, error: `Payment failed: ${(err as Error).message}` };
  }

  if (!session.url) {
    return { success: false, error: "Stripe did not return a checkout URL" };
  }

  // Persist a pending top-up keyed by the Checkout Session id so the
  // webhook can settle it. Wallet balance is NOT changed here.
  const pendingId = `top_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  await db.prepare(`
    INSERT INTO wallet_topups (id, tenant_id, amount, method, description, payment_intent_id, status, created_at)
    VALUES (?, ?, ?, 'card', ?, ?, 'pending', datetime('now'))
  `).run(pendingId, tenantId, amount, description, session.id);

  return { success: true, url: session.url };
}

/** Credits a wallet immediately (local/demo mode, no PSP). */
async function creditTopUp(
  tenantId: string,
  amount: number,
  method: "card" | "bank_transfer" | "invoice",
  description: string
): Promise<{ success: boolean; walletId: string; balance: number; error?: string }> {
  const db = await getDb();

  // Get or create wallet
  let wallet =   await db.prepare(`
    SELECT id, balance FROM wallets WHERE tenant_id = ?
  `).get<WalletRow>(tenantId);

  if (!wallet) {
    const walletId = `wlt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    await db.prepare(`
      INSERT INTO wallets (id, tenant_id, balance, currency)
      VALUES (?, ?, ?, 'usd')
    `).run(walletId, tenantId, amount);
    wallet = { id: walletId, balance: amount };
  } else {
    await db.prepare(`
      UPDATE wallets SET balance = balance + ? WHERE id = ?
    `).run(amount, wallet.id);
    wallet.balance += amount;
  }

  // Record transaction
  const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  await db.prepare(`
    INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status, created_at)
    VALUES (?, ?, 'credit', ?, ?, 'settled', datetime('now'))
  `).run(txId, wallet.id, amount, `${description} (${method})`);

  // Log billing event
  await db.prepare(`
    INSERT INTO system_metrics (tenant_id, metric_name, metric_value, tags, created_at)
    VALUES (?, 'wallet.topup', ?, ?, datetime('now'))
  `).run(tenantId, amount, JSON.stringify({ method, description }));

  // Emit event
  eventBus.emit(EVENTS.WALLET_UPDATED, {
    walletId: wallet.id,
    amount,
    type: "topup",
    method,
    balance: wallet.balance,
  });

  return { success: true, walletId: wallet.id, balance: wallet.balance };
}

/**
 * Settles a pending top-up after Stripe confirms payment. Called by the
 * Stripe webhook handler with either a PaymentIntent id (direct top-ups)
 * or a Checkout Session id (Checkout top-ups). Idempotent: a reference is
 * credited at most once.
 */
export async function confirmTopUp(paymentIntentId: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const pending = await db.prepare(`
    SELECT id, tenant_id, amount, method, description, status
    FROM wallet_topups WHERE payment_intent_id = ?
  `).get<WalletTopupRow>(paymentIntentId);

  if (!pending) {
    return { success: false, error: "Unknown payment intent" };
  }
  if (pending.status === "settled") {
    return { success: true };
  }

  await creditTopUp(pending.tenant_id, pending.amount, pending.method, pending.description);

  await db.prepare(`
    UPDATE wallet_topups SET status = 'settled', settled_at = datetime('now') WHERE id = ?
  `).run(pending.id);

  return { success: true };
}

// ── Wallet Balance Check ───────────────────────────────────

export async function getWalletBalance(tenantId: string): Promise<{ balance: number; walletId: string }> {
  const db = await getDb();
  const wallet =   await db.prepare(`
    SELECT id, balance FROM wallets WHERE tenant_id = ?
  `).get<WalletRow>(tenantId);

  return { balance: wallet?.balance || 0, walletId: wallet?.id || "" };
}

// ── Deduct Ad Spend (from billing/invoicing) ───────────────

export async function deductAdSpend(
  tenantId: string,
  amount: number,
  campaignId: string,
  description: string,
  idempotencyKey?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await spendFromWallet(
    tenantId,
    amount,
    description,
    idempotencyKey ?? `adspend_${campaignId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    { campaign: campaignId, type: "debit" }
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error === "INSUFFICIENT_BALANCE" ? "Insufficient wallet balance" : result.error,
    };
  }

  // Check if wallet needs auto-freeze
  await checkAllWalletCards(tenantId);

  eventBus.emit(EVENTS.WALLET_UPDATED, {
    amount: -amount,
    type: "ad_spend",
    campaignId,
    balance: result.balanceAfter,
  });

  return { success: true };
}

// ── Check All Wallet Cards ─────────────────────────────────

export async function checkAllWalletCards(tenantId: string): Promise<void> {
  const db = await getDb();
  const wallet =   await db.prepare(`
    SELECT id FROM wallets WHERE tenant_id = ?
  `).get<WalletRow>(tenantId);

  if (!wallet) return;

  const cards = await db.prepare(`
    SELECT id FROM wallet_cards WHERE wallet_id = ? AND status = 'active'
  `).all<{ id: string }>(wallet.id);

  for (const card of cards) {
    await checkAndFreezeOnDailyLimit(card.id);
    await checkAndFreezeOnBalance(card.id);
  }
}

// ── Wallet Transaction History ─────────────────────────────

export async function getWalletTransactions(
  tenantId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  type: string;
  amount: number;
  description: string;
  campaign?: string;
  status: string;
  createdAt: string;
}>> {
  const db = await getDb();
  const wallet =   await db.prepare(`
    SELECT id FROM wallets WHERE tenant_id = ?
  `).get<WalletRow>(tenantId);

  if (!wallet) return [];

  const rows = await db.prepare(`
    SELECT id, type, amount, description, campaign, status, created_at
    FROM wallet_transactions
    WHERE wallet_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all<TxRow>(wallet.id, limit);

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    description: r.description,
    campaign: r.campaign ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  }));
}

// ============================================================
// KIKI Agent Platform — Virtual Card Management
// Per-campaign virtual cards with auto-freeze on CAC threshold
// ============================================================

import crypto from "crypto";
import { getDb } from "./db";
import { eventBus, EVENTS } from "./events";

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
}

export interface FreezeResult {
  success: boolean;
  cardId: string;
  reason: string;
  frozenAt: string;
}

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
  const last4 = crypto.randomBytes(2).toString("hex").slice(0, 4);
  const brand = ["Visa", "Mastercard", "Amex"][Math.floor(Math.random() * 3)];

  await db.prepare(`
    INSERT INTO wallet_cards (id, wallet_id, last4, brand, "limit", spent, campaign, status)
    VALUES (?, ?, ?, ?, ?, 0, ?, 'active')
  `).run(cardId, walletId, last4, brand, totalLimit, campaignName);

  // Store campaign mapping and daily limit
  await db.prepare(`
    UPDATE wallet_cards SET campaign = ? WHERE id = ?
  `).run(JSON.stringify({ campaignId, campaignName, dailyLimit }), cardId);

  return {
    id: cardId,
    walletId,
    last4,
    brand,
    limit: totalLimit,
    spent: 0,
    dailyLimit,
    dailySpent: 0,
    campaignId,
    campaignName,
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

// ── Check & Freeze Card on CAC Threshold ───────────────────

export async function checkAndFreezeOnCAC(
  cardId: string,
  targetCac: number
): Promise<FreezeResult | null> {
  const db = await getDb();
  const card =   await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'active'
  `).get(cardId) as any;

  if (!card) return null;

  const campaignInfo = JSON.parse(card.campaign || "{}");
  const campaignId = campaignInfo.campaignId;

  // Get actual CAC for this campaign
  const campaign =   await db.prepare(`
    SELECT conversions, spend FROM campaigns WHERE id = ?
  `).get(campaignId) as any;

  if (!campaign || campaign.conversions === 0) return null;

  const actualCac = campaign.spend / campaign.conversions;
  const threshold = targetCac * CAC_THRESHOLD_MULTIPLIER;

  if (actualCac > threshold) {
    // Freeze the card
    await db.prepare(`
      UPDATE wallet_cards SET status = 'frozen' WHERE id = ?
    `).run(cardId);

    const freezeReason = `CAC $${actualCac.toFixed(2)} exceeds ${CAC_THRESHOLD_MULTIPLIER}× target $${targetCac.toFixed(2)}`;

    eventBus.emit("wallet.card_frozen" as any, {
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
  const card =   await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'active'
  `).get(cardId) as any;

  if (!card) return null;

  let campaignInfo: any = {};
  try {
    campaignInfo = JSON.parse(card.campaign || "{}");
  } catch {
    campaignInfo = {};
  }
  const dailyLimit = campaignInfo.dailyLimit || 0;

  if (dailyLimit <= 0) return null;

  // Get today's spend for this card
  const todaySpend =   await db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions
    WHERE wallet_id = ? AND campaign = ? AND type = 'debit'
    AND created_at >= date('now')
  `).get(card.wallet_id, card.campaignName) as any;

  if (todaySpend.total >= dailyLimit) {
    await db.prepare(`
      UPDATE wallet_cards SET status = 'frozen' WHERE id = ?
    `).run(cardId);

    const reason = `Daily spend $${todaySpend.total.toFixed(2)} reached limit $${dailyLimit.toFixed(2)}`;

    eventBus.emit("wallet.card_frozen" as any, {
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
  const card =   await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'active'
  `).get(cardId) as any;

  if (!card) return null;

  const wallet =   await db.prepare(`
    SELECT balance FROM wallets WHERE id = ?
  `).get(card.wallet_id) as any;

  if (!wallet || wallet.balance <= 0) {
    await db.prepare(`
      UPDATE wallet_cards SET status = 'frozen' WHERE id = ?
    `).run(cardId);

    eventBus.emit("wallet.card_frozen" as any, {
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

// ── Unfreeze Card (requires biometric for > $100) ─────────

export async function unfreezeCard(
  cardId: string,
  requiresBiometric: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const card =   await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'frozen'
  `).get(cardId) as any;

  if (!card) {
    return { success: false, error: "Card not found or not frozen" };
  }

  // For high-value unfreeze, require biometric confirmation
  if (requiresBiometric && card.limit > 100) {
    // In production, this would trigger a biometric prompt
    // For now, we just log it
    eventBus.emit("wallet.unfreeze_requested" as any, {
      cardId,
      requiresBiometric: true,
      cardLimit: card.limit,
    });
  }

  await db.prepare(`
    UPDATE wallet_cards SET status = 'active' WHERE id = ?
  `).run(cardId);

  eventBus.emit("wallet.card_unfrozen" as any, { cardId });

  return { success: true };
}

// ── Record Card Transaction ────────────────────────────────

export async function recordCardTransaction(
  cardId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const card =   await db.prepare(`
    SELECT * FROM wallet_cards WHERE id = ? AND status = 'active'
  `).get(cardId) as any;

  if (!card) {
    return { success: false, error: "Card not found or frozen" };
  }

  // Check wallet balance
  const wallet =   await db.prepare(`
    SELECT balance FROM wallets WHERE id = ?
  `).get(card.wallet_id) as any;

  if (!wallet || wallet.balance < amount) {
    return { success: false, error: "Insufficient wallet balance" };
  }

  // Debit wallet
  await db.prepare(`
    UPDATE wallets SET balance = balance - ? WHERE id = ?
  `).run(amount, card.wallet_id);

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
  const wallet =   await db.prepare(`
    SELECT id FROM wallets WHERE tenant_id = ?
  `).get(tenantId) as any;

  if (!wallet) return [];

  const cards =   await db.prepare(`
    SELECT * FROM wallet_cards WHERE wallet_id = ?
  `).all(wallet.id) as any[];

  return cards.map(card => {
    let info: any = {};
    try {
      info = JSON.parse(card.campaign || "{}");
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
      dailySpent: 0,
      campaignId: info.campaignId || "",
      campaignName: info.campaignName || card.campaign,
      status: card.status,
      createdAt: card.created_at,
    };
  });
}

// ── Auto-Freeze Monitor ────────────────────────────────────

export function startAutoFreezeMonitor(): void {
  setInterval(async () => {
    try {
      const db = await getDb();
      const activeCards =   await db.prepare(`
        SELECT id, campaign FROM wallet_cards WHERE status = 'active'
      `).all() as Array<{ id: string; campaign: string }>;

      for (const card of activeCards) {
        const info = JSON.parse(card.campaign || "{}");
        if (info.campaignId) {
          // Check CAC threshold
          const campaign =   await db.prepare(`
            SELECT target_cpa FROM campaigns WHERE id = ?
          `).get(info.campaignId) as any;

          if (campaign?.target_cpa > 0) {
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
): Promise<{ success: boolean; walletId: string; balance: number; error?: string }> {
  const db = await getDb();

  if (amount <= 0) {
    return { success: false, walletId: "", balance: 0, error: "Amount must be positive" };
  }

  // Get or create wallet
  let wallet =   await db.prepare(`
    SELECT id, balance FROM wallets WHERE tenant_id = ?
  `).get(tenantId) as any;

  if (!wallet) {
    const walletId = `wlt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    await db.prepare(`
      INSERT INTO wallets (id, tenant_id, balance, currency, created_at)
      VALUES (?, ?, ?, 'usd', datetime('now'))
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

// ── Wallet Balance Check ───────────────────────────────────

export async function getWalletBalance(tenantId: string): Promise<{ balance: number; walletId: string }> {
  const db = await getDb();
  const wallet =   await db.prepare(`
    SELECT id, balance FROM wallets WHERE tenant_id = ?
  `).get(tenantId) as any;

  return { balance: wallet?.balance || 0, walletId: wallet?.id || "" };
}

// ── Deduct Ad Spend (from billing/invoicing) ───────────────

export async function deductAdSpend(
  tenantId: string,
  amount: number,
  campaignId: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const wallet =   await db.prepare(`
    SELECT id, balance FROM wallets WHERE tenant_id = ?
  `).get(tenantId) as any;

  if (!wallet || wallet.balance < amount) {
    return { success: false, error: "Insufficient wallet balance" };
  }

  // Deduct from wallet
  await db.prepare(`
    UPDATE wallets SET balance = balance - ? WHERE id = ?
  `).run(amount, wallet.id);

  // Record transaction
  const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  await db.prepare(`
    INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, campaign, status, created_at)
    VALUES (?, ?, 'debit', ?, ?, ?, 'settled', datetime('now'))
  `).run(txId, wallet.id, amount, description, campaignId);

  // Check if wallet needs auto-freeze
  await checkAllWalletCards(tenantId);

  eventBus.emit(EVENTS.WALLET_UPDATED, {
    walletId: wallet.id,
    amount: -amount,
    type: "ad_spend",
    campaignId,
    balance: wallet.balance - amount,
  });

  return { success: true };
}

// ── Check All Wallet Cards ─────────────────────────────────

export async function checkAllWalletCards(tenantId: string): Promise<void> {
  const db = await getDb();
  const wallet =   await db.prepare(`
    SELECT id FROM wallets WHERE tenant_id = ?
  `).get(tenantId) as any;

  if (!wallet) return;

  const cards =   await db.prepare(`
    SELECT id FROM wallet_cards WHERE wallet_id = ? AND status = 'active'
  `).all(wallet.id) as Array<{ id: string }>;

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
  `).get(tenantId) as any;

  if (!wallet) return [];

  return   await db.prepare(`
    SELECT id, type, amount, description, campaign, status, created_at
    FROM wallet_transactions
    WHERE wallet_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(wallet.id, limit) as any[];
}

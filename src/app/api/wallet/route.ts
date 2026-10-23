export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { createVirtualCard, topUpWallet, freezeCard, cancelCard, unfreezeCard, withdrawFromWallet } from "@/lib/wallet";
import { isStripeIssuingEnabled, SERVICE_NOT_CONFIGURED } from "@/lib/card-issuer";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { checkRateLimitDistributed } from "@/lib/rate-limit-redis";
import { validateBody, walletTopUpSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const rl = await checkRateLimitDistributed(`wallet:GET:${getClientIp(req)}`, { maxRequests: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const db = await getDb();
  let wallet = await (await db.prepare("SELECT * FROM wallets WHERE tenant_id = ?")).get(user.tenantId) as {
    id: string; tenant_id: string; balance: number; currency: string;
  } | undefined;

  if (!wallet) {
    const walletId = genId("wlt");
    await (await db.prepare("INSERT INTO wallets (id, tenant_id, balance, currency) VALUES (?, ?, 0, 'USD')")).run(walletId, user.tenantId);
    wallet = { id: walletId, tenant_id: user.tenantId, balance: 0, currency: "USD" };
  }

  const cards = await (await db.prepare("SELECT * FROM wallet_cards WHERE wallet_id = ?")).all(wallet.id) as Array<{
    id: string; last4: string; brand: string; limit: number; spent: number; campaign: string; status: string; issuer: string;
  }>;

  const transactions = await (await db.prepare("SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 20")).all(wallet.id) as Array<{
    id: string; type: string; amount: number; description: string; campaign: string | null; status: string; created_at: string;
  }>;

  const parseCampaign = (raw: string) => {
    try {
      const p = JSON.parse(raw || "{}");
      if (typeof p === "object" && p && p.campaignName) return p.campaignName;
      if (typeof p === "string") return p;
      return raw || "—";
    } catch {
      return raw || "—";
    }
  };

  return json({
    id: wallet.id, tenantId: wallet.tenant_id, balance: wallet.balance,
    currency: wallet.currency,
    issuingEnabled: isStripeIssuingEnabled(),
    cards: cards.map(c => ({
      id: c.id, last4: c.last4, brand: c.brand, limit: c.limit,
      spent: c.spent, campaign: parseCampaign(c.campaign), status: c.status, issuer: c.issuer,
    })),
    transactions: transactions.map(t => ({
      id: t.id, type: t.type, amount: t.amount, description: t.description,
      campaign: t.campaign, date: t.created_at, status: t.status,
    })),
  });
  } catch (error) {
    logger.error("wallet/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load wallet", 500);
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  const rl = await checkRateLimitDistributed(`wallet:POST:${getClientIp(req)}`, { maxRequests: 30 });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const { amount, action, campaignName, totalLimit, cardId, biometricToken, destination, requiresBiometric } = body;

    if (action === "freeze_card" || action === "unfreeze_card" || action === "cancel_card") {
      if (!cardId || typeof cardId !== "string") return jsonError("cardId required", 400);

      if (action === "freeze_card") {
        const result = await freezeCard(cardId);
        if (!result.success) return jsonError(result.error || "Failed to freeze card", 400);
        return json({ ok: true, status: "frozen" });
      }

      if (action === "unfreeze_card") {
        const result = await unfreezeCard(cardId, {
          requiresBiometric: requiresBiometric === true,
          biometricToken: typeof biometricToken === "string" ? biometricToken : undefined,
        });
        if (!result.success) {
          return json({ ok: false, error: result.error || "Failed to unfreeze card", requiresBiometric: result.requiresBiometric }, 400);
        }
        return json({ ok: true, status: "active" });
      }

      const result = await cancelCard(cardId);
      if (!result.success) return jsonError(result.error || "Failed to cancel card", 400);
      return json({ ok: true, status: "cancelled" });
    }

    if (action === "withdraw") {
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return jsonError("Amount must be a positive number", 400);
      }
      if (amount > 1_000_000) return jsonError("Maximum withdrawal is $1,000,000", 400);

      const result = await withdrawFromWallet(
        user.tenantId,
        amount,
        typeof destination === "string" ? destination : "",
        `Wallet withdrawal${destination ? ` to ${destination}` : ""}`
      );
      if (!result.success) {
        return json(
          { ok: false, error: result.error || "Withdrawal failed", code: result.code },
          result.code === "SERVICE_NOT_CONFIGURED" ? 503 : 400
        );
      }
      return json({ ok: true, balance: result.balance, transferId: result.transferId });
    }

    if (action === "issue_card") {
      if (!isStripeIssuingEnabled()) {
        return json({ ok: false, error: "Card issuance requires Stripe Issuing to be configured.", code: SERVICE_NOT_CONFIGURED }, 503);
      }

      const db = await getDb();
      const wallet = await (await db.prepare("SELECT * FROM wallets WHERE tenant_id = ?")).get(user.tenantId) as { id: string } | undefined;
      if (!wallet) return jsonError("Wallet not found", 404);

      const name = (campaignName as string) || "General Campaign";
      const limit = typeof totalLimit === "number" && totalLimit > 0 ? totalLimit : 5000;

      try {
        const card = await createVirtualCard(user.tenantId, wallet.id, genId("cmp"), name, Math.round(limit / 30), limit);
        return json({ card: { id: card.id, last4: card.last4, brand: card.brand, limit: card.limit, spent: 0, campaign: card.campaignName, status: card.status, issuer: card.issuer } });
      } catch (e) {
        logger.error("wallet/issue_card failed", { message: e instanceof Error ? e.message : String(e) });
        return jsonError("Card issuance failed at the provider", 502);
      }
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return jsonError("Amount must be a positive number");
    }
    if (amount > 1_000_000) return jsonError("Maximum top-up is $1,000,000");
    const result = await topUpWallet(user.tenantId, amount, "card", "Wallet top-up via API");
    
    if (!result.success) {
      return jsonError(result.error || "Top-up failed", 400);
    }

    return json({ 
      balance: result.balance, 
      paymentIntentId: result.paymentIntentId, 
      clientSecret: result.clientSecret, 
      requiresConfirmation: result.requiresConfirmation,
      transaction: result.requiresConfirmation ? undefined : { id: genId("txn"), type: "credit", amount, status: "settled" }
    });
  } catch (error) {
    return jsonError("Invalid request body", 400);
  }
}

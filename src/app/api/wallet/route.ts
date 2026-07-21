import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { createVirtualCard, topUpWallet } from "@/lib/wallet";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { validateBody, walletTopUpSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const rl = checkRateLimit(`wallet:GET:${getClientIp(req)}`, { maxRequests: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const db = await getDb();
  const wallet = await (await db.prepare("SELECT * FROM wallets WHERE tenant_id = ?")).get(user.tenantId) as {
    id: string; tenant_id: string; balance: number; currency: string;
  } | undefined;

  if (!wallet) return jsonError("Wallet not found", 404);

  const cards = await (await db.prepare("SELECT * FROM wallet_cards WHERE wallet_id = ?")).all(wallet.id) as Array<{
    id: string; last4: string; brand: string; limit: number; spent: number; campaign: string; status: string;
  }>;

  const transactions = await (await db.prepare("SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 20")).all(wallet.id) as Array<{
    id: string; type: string; amount: number; description: string; campaign: string | null; status: string; created_at: string;
  }>;

  return json({
    id: wallet.id, tenantId: wallet.tenant_id, balance: wallet.balance,
    currency: wallet.currency,
    cards: cards.map(c => ({
      id: c.id, last4: c.last4, brand: c.brand, limit: c.limit,
      spent: c.spent, campaign: c.campaign, status: c.status,
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

  const rl = checkRateLimit(`wallet:POST:${getClientIp(req)}`, { maxRequests: 30 });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const { amount, action, campaignName, totalLimit } = body;

    if (action === "issue_card") {
      const db = await getDb();
      const wallet = await (await db.prepare("SELECT * FROM wallets WHERE tenant_id = ?")).get(user.tenantId) as { id: string } | undefined;
      if (!wallet) return jsonError("Wallet not found", 404);

      const name = (campaignName as string) || "General Campaign";
      const limit = typeof totalLimit === "number" && totalLimit > 0 ? totalLimit : 5000;

      const card = await createVirtualCard(user.tenantId, wallet.id, genId("cmp"), name, Math.round(limit / 30), limit);
      return json({ card: { id: card.id, last4: card.last4, brand: card.brand, limit: card.limit, spent: 0, campaign: card.campaignName, status: card.status } });
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
      // If it's mock mode, return a dummy transaction so the frontend logic doesn't break
      transaction: result.requiresConfirmation ? undefined : { id: `tx_mock`, type: "credit", amount, status: "settled" }
    });
  } catch (error) {
    return jsonError("Invalid request body", 400);
  }
}

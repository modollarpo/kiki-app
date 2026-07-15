import { getDb, genId } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { createVirtualCard } from "@/lib/wallet";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

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
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

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

    const db = await getDb();
    const wallet = await (await db.prepare("SELECT * FROM wallets WHERE tenant_id = ?")).get(user.tenantId) as { id: string; balance: number } | undefined;
    if (!wallet) return jsonError("Wallet not found", 404);

    const newBalance = wallet.balance + amount;
    await (await db.prepare("UPDATE wallets SET balance = ? WHERE id = ?")).run(newBalance, wallet.id);

    // Record transaction
    const txnId = genId("txn");
    await (await db.prepare(`
      INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, status)
      VALUES (?, ?, 'credit', ?, 'Wallet top-up', 'settled')
    `)).run(txnId, wallet.id, amount);

    return json({ balance: newBalance, transaction: { id: txnId, type: "credit", amount, status: "settled" } });
  } catch {
    return jsonError("Invalid request body", 400);
  }
}

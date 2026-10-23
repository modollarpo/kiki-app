"use client";
import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StatCard, Card, Badge, Button, ProgressBar } from "@/components/ui";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { wallet as walletApi, isNotConfigured, type WalletData } from "@/lib/api";
import { K, textSafe } from "@/lib/kdls";
import { useSSE } from "@/hooks/useSSE";
import { EVENTS } from "@/lib/events";

const fmt = (n: number) => n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toLocaleString();

export default function WalletPage() {
  const { walletBalance, addToast } = useKikiStore();
  const { token } = useAuth();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUpAmt, setTopUpAmt] = useState(1000);
  const [toppingUp, setToppingUp] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState(500);
  const [withdrawDest, setWithdrawDest] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [cardBusy, setCardBusy] = useState<string | null>(null);
  const topupToastShown = useRef(false);

  useEffect(() => {
    if (!token) return;
    walletApi.get(token).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (topupToastShown.current) return;
    topupToastShown.current = true;
    const status = new URLSearchParams(window.location.search).get("topup");
    if (status === "success") addToast("success", "Payment received — your wallet will be credited once Stripe confirms.");
    else if (status === "cancelled") addToast("info", "Top-up cancelled.");
  }, [addToast]);

  const { subscribe } = useSSE("/api/events", token ?? undefined);

  useEffect(() => {
    if (!token) return;
    const refresh = () => walletApi.get(token).then(d => setData(d)).catch(() => {});
    const unsubs = [
      subscribe(EVENTS.WALLET_UPDATED, refresh),
      subscribe(EVENTS.WALLET_CARD_FROZEN, refresh),
      subscribe(EVENTS.WALLET_CARD_UNFROZEN, refresh),
      subscribe(EVENTS.WALLET_UNFREEZE_REQUESTED, refresh),
    ];
    return () => unsubs.forEach(u => u());
  }, [token, subscribe]);

  const handleTopUp = async () => {
    if (!token) return;
    setToppingUp(true);
    try {
      const result = await walletApi.checkout(token, topUpAmt);
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      addToast("error", "Could not start checkout.");
    } catch (e) {
      if (isNotConfigured(e)) {
        // No payment provider configured (local/demo): credit immediately.
        try {
          const r = await walletApi.topUp(token, topUpAmt);
          if (r.requiresConfirmation) {
            addToast("info", `Top-up of $${topUpAmt.toLocaleString()} awaiting payment confirmation.`);
          } else {
            setData(prev => prev ? { ...prev, balance: r.balance } : prev);
            addToast("success", `Wallet topped up by $${topUpAmt.toLocaleString()}`);
          }
        } catch {
          addToast("error", "Top-up failed. Please try again.");
        }
      } else {
        addToast("error", "Top-up failed. Please try again.");
      }
    }
    setToppingUp(false);
  };

  const handleWithdraw = async () => {
    if (!token) return;
    if (!Number.isFinite(withdrawAmt) || withdrawAmt <= 0) {
      addToast("error", "Enter a valid withdrawal amount");
      return;
    }
    setWithdrawing(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "withdraw", amount: withdrawAmt, destination: withdrawDest.trim() || undefined }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) {
        if (result?.code === "SERVICE_NOT_CONFIGURED") {
          addToast("error", result.error || "Withdrawals are not configured for this workspace.");
        } else {
          addToast("error", result?.error || "Withdrawal failed.");
        }
        return;
      }
      setData(prev => prev ? { ...prev, balance: result.balance } : prev);
      setWithdrawOpen(false);
      addToast("success", `Withdrawal of $${withdrawAmt.toLocaleString()} submitted`);
    } catch {
      addToast("error", "Withdrawal failed.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleCardAction = async (cardId: string, action: "freeze_card" | "unfreeze_card" | "cancel_card") => {
    if (!token) return;
    if (action === "cancel_card" && !confirm("Cancel this virtual card permanently?")) return;
    setCardBusy(cardId);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, cardId }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Card action failed");
      const nextStatus = action === "freeze_card" ? "frozen" : action === "unfreeze_card" ? "active" : "cancelled";
      setData(prev => prev ? {
        ...prev,
        cards: prev.cards.map(c => c.id === cardId ? { ...c, status: nextStatus } : c),
      } : prev);
      addToast("success", action === "freeze_card" ? "Card frozen" : action === "unfreeze_card" ? "Card unfrozen" : "Card cancelled");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Card action failed");
    } finally {
      setCardBusy(null);
    }
  };

  const [issuing, setIssuing] = useState(false);

  const handleIssueCard = async () => {
    if (!token) return;
    setIssuing(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "issue_card", campaignName: "General Campaign", totalLimit: 5000 }),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.card) {
        setData(prev => prev ? { ...prev, cards: [...(prev.cards || []), result.card] } : prev);
        addToast("success", `Virtual card •••• ${result.card.last4} issued`);
      } else if (result?.code === "SERVICE_NOT_CONFIGURED") {
        addToast("error", "Card issuance isn't configured for this workspace.");
      } else {
        addToast("error", result?.error || "Failed to issue card.");
      }
    } catch {
      addToast("error", "Failed to issue card.");
    }
    setIssuing(false);
  };

  const balance = data?.balance || walletBalance;
  const cards = data?.cards || [];
  const txs = data?.transactions || [];
  const todaySpend = txs.filter((tx: WalletData["transactions"][0]) => (tx.type === "campaign_spend" || tx.type === "ad_spend" || tx.type === "debit") && new Date(tx.date).toDateString() === new Date().toDateString()).reduce((s: number, tx: WalletData["transactions"][0]) => s + Math.abs(tx.amount), 0);
  const spendTxs = txs.filter((tx: WalletData["transactions"][0]) => tx.type === "campaign_spend" || tx.type === "ad_spend" || tx.type === "debit");
  const totalSpend = spendTxs.reduce((s: number, tx: WalletData["transactions"][0]) => s + Math.abs(tx.amount), 0);
  const spendTimes = spendTxs.map((tx: WalletData["transactions"][0]) => new Date(tx.date).getTime()).filter((n: number) => !Number.isNaN(n));
  const spanDays = spendTimes.length > 1
    ? Math.max(1, Math.round((Math.max(...spendTimes) - Math.min(...spendTimes)) / 86400000))
    : (spendTxs.length > 0 ? 1 : 0);
  const avgDailySpend = spanDays > 0 ? totalSpend / spanDays : 0;
  const runwayDays = avgDailySpend > 0 ? Math.floor(balance / avgDailySpend) : 0;

  return (
    <RoleGuard allowedRoles={["admin", "superadmin", "finance"]}>
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="mb-[22px] flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 mb-1">Wallet & Cards</h1>
            <p className="font-mono text-caption text-t3">{`Virtual cards · ${(data?.currency || "USD").toUpperCase()} ledger`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setWithdrawOpen(o => !o)}>↓ Withdraw</Button>
            <Button size="sm" loading={toppingUp} onClick={handleTopUp}>↑ Top Up Wallet</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Available Balance" value={`$${fmt(balance)}`} accent={K.gold} loading={loading} />
          <StatCard label="Today's Spend" value={`$${fmt(todaySpend)}`} accent={K.blue} loading={loading} />
          <StatCard label="Active Cards" value={String(cards.filter((c: WalletData["cards"][0]) => c.status === "active").length)} accent={K.indigo} loading={loading} />
          <StatCard label="Days Runway" value={runwayDays > 0 ? `${runwayDays}` : "—"} accent={K.teal} sub="at current burn" loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">
          <div className="flex flex-col gap-3">
            <Card accent={K.indigo}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono font-bold text-small text-t1">Virtual Cards</h2>
                {data?.issuingEnabled ? (
                  <Button size="xs" variant="secondary" loading={issuing} onClick={handleIssueCard}>+ Issue New Card</Button>
                ) : (
                  <span className="font-mono text-caption text-t4 whitespace-nowrap">Issuance not configured</span>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {cards.map((card: WalletData["cards"][0]) => (
                  <div key={card.id} className="min-w-[220px] shrink-0 rounded-[4px] p-4 border"
                    style={{ background: `linear-gradient(135deg,${K.g850},${K.indigoD})`, borderColor: card.status === "frozen" ? `${K.danger}40` : `${K.indigo}40` }}>
                    <div className="flex justify-between mb-3">
                      <span className="font-mono text-caption tracking-widest text-t4">{card.issuer === "stripe" ? "KIKI VIRTUAL" : "KIKI SIMULATED"}</span>
                      <div className="flex items-center gap-1.5">
                        {card.issuer !== "stripe" && <Badge color={K.warn}>SIMULATED</Badge>}
                        {card.status === "frozen" && <Badge color={K.danger}>FROZEN</Badge>}
                      </div>
                    </div>
                    <p className="font-mono text-sm text-t3 mb-2 tracking-widest">•••• {card.last4}</p>
                    <p className="font-mono text-xs font-bold text-kindigo mb-2">{card.campaign}</p>
                    <ProgressBar value={card.limit > 0 ? (card.spent / card.limit) * 100 : 0} color={K.indigo} height={3} label={`${card.campaign} card limit used`} />
                    <p className="font-mono text-caption text-t4 mt-1">${card.spent.toLocaleString()} / ${card.limit.toLocaleString()}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {card.status === "active" && (
                        <Button size="xs" variant="ghost" loading={cardBusy === card.id} onClick={() => handleCardAction(card.id, "freeze_card")}>Freeze</Button>
                      )}
                      {card.status === "frozen" && (
                        <Button size="xs" variant="ghost" loading={cardBusy === card.id} onClick={() => handleCardAction(card.id, "unfreeze_card")}>Unfreeze</Button>
                      )}
                      {card.status !== "cancelled" && (
                        <Button size="xs" variant="ghost" loading={cardBusy === card.id} onClick={() => handleCardAction(card.id, "cancel_card")} style={{ color: K.danger }}>Cancel</Button>
                      )}
                      {card.status === "cancelled" && <Badge color={K.t3}>CANCELLED</Badge>}
                    </div>
                  </div>
                ))}
                {loading && [1, 2].map(i => (
                  <div key={i} className="min-w-[220px] shrink-0 h-[120px] bg-g850 rounded-[4px]" />
                ))}
              </div>
            </Card>

            <Card padding={0}>
              <div className="px-5 py-3 border-b border-g800">
                <h2 className="font-mono font-bold text-small text-t1">Recent Transactions</h2>
              </div>
              {txs.slice(0, 8).map((tx: WalletData["transactions"][0], i: number) => (
                <div key={i} className="flex items-center gap-[14px] px-5 py-3 border-b border-g900">
                  {(() => {
                    const isCredit = tx.type === "credit" || tx.type === "topup" || tx.type === "refund" || (tx.amount > 0 && tx.type !== "debit" && tx.type !== "ad_spend" && tx.type !== "campaign_spend");
                    const isDebit = tx.type === "debit" || tx.type === "ad_spend" || tx.type === "campaign_spend" || (tx.amount < 0 && !isCredit);
                    return (
                      <>
                        <div className="w-9 h-9 rounded-kdls bg-g850 flex items-center justify-center font-mono text-base shrink-0"
                          style={{ color: isCredit ? textSafe(K.mint) : K.t3 }}>
                          {isCredit ? "↑" : "↓"}
                        </div>
                        <div className="flex-1">
                          <p className="font-mono text-xs font-semibold text-t2">{tx.type.replace("_", " ")}</p>
                          <p className="font-mono text-caption text-t4">{new Date(tx.date).toLocaleDateString()} · {tx.campaign || tx.description}</p>
                        </div>
                        <span className="font-mono text-small font-bold"
                          style={{ color: isCredit ? textSafe(K.mint) : K.t1 }}>
                          {isCredit ? "+" : "-"}${Math.abs(tx.amount).toLocaleString()}
                        </span>
                      </>
                    );
                  })()}
                </div>
              ))}
            </Card>
          </div>

          <Card accent={K.gold} glow={K.gold}>
            <h3 className="font-mono font-bold text-small text-t1 mb-4">Fund Account</h3>
            <p className="font-mono text-caption tracking-widest text-t4 mb-[10px]">SELECT AMOUNT</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {[500, 1000, 2500, 5000, 10000].map(a => (
                <button key={a} onClick={() => setTopUpAmt(a)}
                  className={`px-3 py-2 font-mono text-caption font-bold rounded-kdls cursor-pointer transition-colors ${
                    a === topUpAmt ? "bg-kgold/10 border border-kgold text-kgold" : "bg-g850 border border-g700 text-t3"
                  }`}>
                  ${a.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="p-[14px] bg-kgold/5 border border-kgold/25 rounded-kdls mb-4">
              <p className="font-mono text-caption text-kgold mb-1">SELECTED AMOUNT</p>
              <p className="font-mono text-h1 font-bold text-kgold">${topUpAmt.toLocaleString()}</p>
            </div>
            <Button variant="mint" size="lg" full loading={toppingUp} onClick={handleTopUp}>↑ Top Up Now</Button>

            {withdrawOpen && (
              <div className="mt-4 pt-4 border-t border-g800">
                <h3 className="font-mono font-bold text-small text-t1 mb-3">Withdraw Funds</h3>
                <label className="block font-mono text-caption tracking-widest text-t4 mb-1.5" htmlFor="withdraw-amount">AMOUNT (USD)</label>
                <input
                  id="withdraw-amount"
                  type="number"
                  min={1}
                  max={1000000}
                  value={withdrawAmt}
                  onChange={e => setWithdrawAmt(Number(e.target.value))}
                  className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kgold mb-2"
                />
                <label className="block font-mono text-caption tracking-widest text-t4 mb-1.5" htmlFor="withdraw-destination">DESTINATION (OPTIONAL)</label>
                <input
                  id="withdraw-destination"
                  placeholder="Stripe connected account"
                  value={withdrawDest}
                  onChange={e => setWithdrawDest(e.target.value)}
                  className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kgold mb-3"
                />
                <Button variant="secondary" size="md" full loading={withdrawing} onClick={handleWithdraw}>Submit Withdrawal</Button>
                <p className="font-mono text-caption text-t4 mt-2">Withdrawals settle to your connected payout account.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
}

"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, Button, ProgressBar } from "@/components/ui";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { wallet as walletApi, type WalletData } from "@/lib/api";
import { K } from "@/lib/kdls";

const fmt = (n: number) => n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toLocaleString();

export default function WalletPage() {
  const { walletBalance, topUpWallet, addToast } = useKikiStore();
  const { token } = useAuth();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUpAmt, setTopUpAmt] = useState(1000);
  const [toppingUp, setToppingUp] = useState(false);

  useEffect(() => {
    if (!token) return;
    walletApi.get(token).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  const handleTopUp = async () => {
    if (!token) return;
    setToppingUp(true);
    try {
      const result = await walletApi.topUp(token, topUpAmt);
      topUpWallet(topUpAmt);
      setData(prev => prev ? { ...prev, balance: result.balance } : prev);
      addToast("success", `Wallet topped up by $${topUpAmt.toLocaleString()}`);
    } catch {
      addToast("error", "Top-up failed. Please try again.");
    }
    setToppingUp(false);
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
      if (res.ok) {
        const result = await res.json();
        setData(prev => prev ? { ...prev, cards: [...(prev.cards || []), result.card] } : prev);
        addToast("success", `Virtual card •••• ${result.card.last4} issued`);
      }
    } catch {
      addToast("error", "Failed to issue card.");
    }
    setIssuing(false);
  };

  const balance = data?.balance || walletBalance;
  const cards = data?.cards || [];
  const txs = data?.transactions || [];
  const todaySpend = txs.filter((tx: WalletData["transactions"][0]) => tx.type === "campaign_spend" && new Date(tx.date).toDateString() === new Date().toDateString()).reduce((s: number, tx: WalletData["transactions"][0]) => s + Math.abs(tx.amount), 0);
  const avgDailySpend = txs.length > 0
    ? txs.filter((tx: WalletData["transactions"][0]) => tx.type === "campaign_spend").reduce((s: number, tx: WalletData["transactions"][0]) => s + Math.abs(tx.amount), 0) / 30
    : 0;
  const runwayDays = avgDailySpend > 0 ? Math.floor(balance / avgDailySpend) : 0;

  return (
    <DashboardLayout>
      <div style={{ padding:"24px 28px", maxWidth:1400 }}>
        <div style={{ marginBottom:22, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:18, color:K.t1, marginBottom:4 }}>Wallet & Cards</h1>
            <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>Multi-currency · Virtual cards · Double-entry ledger</p>
          </div>
          <Button size="sm" loading={toppingUp} onClick={handleTopUp}>↑ Top Up Wallet</Button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
          <StatCard label="Available Balance" value={`$${fmt(balance)}`} accent={K.gold} loading={loading} />
          <StatCard label="Today's Spend" value={`$${fmt(todaySpend)}`} accent={K.blue} loading={loading} />
          <StatCard label="Active Cards" value={String(cards.filter((c: WalletData["cards"][0]) => c.status === "active").length)} accent={K.indigo} loading={loading} />
          <StatCard label="Days Runway" value={runwayDays > 0 ? `${runwayDays}` : "—"} accent={K.teal} sub="at current burn" loading={loading} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:12 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Card accent={K.indigo}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1 }}>Virtual Cards</h2>
                <Button size="xs" variant="secondary" loading={issuing} onClick={handleIssueCard}>+ Issue New Card</Button>
              </div>
              <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
                {cards.map((card: WalletData["cards"][0]) => (
                  <div key={card.id} style={{ minWidth:220, flexShrink:0, background:`linear-gradient(135deg,${K.g850},${K.indigoD})`, border:`1px solid ${card.status==="frozen"?K.danger+"40":K.indigo+"40"}`, borderRadius:4, padding:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                      <span style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.1em", color:K.t4 }}>KIKI VIRTUAL</span>
                      {card.status==="frozen" && <Badge color={K.danger}>FROZEN</Badge>}
                    </div>
                    <p style={{ fontFamily:K.mono, fontSize:14, color:K.t3, marginBottom:8, letterSpacing:"0.1em" }}>•••• {card.last4}</p>
                    <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:K.indigo, marginBottom:8 }}>{card.campaign}</p>
                    <ProgressBar value={card.limit > 0 ? (card.spent/card.limit)*100 : 0} color={K.indigo} height={3} />
                    <p style={{ fontFamily:K.mono, fontSize:9, color:K.t4, marginTop:4 }}>${card.spent.toLocaleString()} / ${card.limit.toLocaleString()}</p>
                  </div>
                ))}
                {loading && [1,2].map(i => (
                  <div key={i} style={{ minWidth:220, flexShrink:0, height:120, background:K.g850, borderRadius:4 }} />
                ))}
              </div>
            </Card>

            <Card padding={0}>
              <div style={{ padding:"12px 20px", borderBottom:`1px solid ${K.g800}` }}>
                <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1 }}>Recent Transactions</h2>
              </div>
              {txs.slice(0, 8).map((tx: WalletData["transactions"][0], i: number) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 20px", borderBottom:`1px solid ${K.g900}` }}>
                  <div style={{ width:36, height:36, borderRadius:2, background:K.g850, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:K.mono, fontSize:16, color:tx.amount>0?K.mint:K.t3, flexShrink:0 }}>
                    {tx.amount>0?"↑":"↓"}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:600, color:K.t2 }}>{tx.type.replace("_", " ")}</p>
                    <p style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{new Date(tx.date).toLocaleDateString()} · {tx.campaign || tx.description}</p>
                  </div>
                  <span style={{ fontFamily:K.mono, fontSize:13, fontWeight:700, color:tx.amount>0?K.mint:K.t1 }}>
                    {tx.amount>0?"+":"-"}${Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </Card>
          </div>

          <Card accent={K.gold} glow={K.gold}>
            <h3 style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:16 }}>Fund Account</h3>
            <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.1em", color:K.t4, marginBottom:10 }}>SELECT AMOUNT</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
              {[500,1000,2500,5000,10000].map(a=>(
                <button key={a} onClick={()=>setTopUpAmt(a)}
                  style={{ padding:"8px 14px", fontFamily:K.mono, fontSize:11, fontWeight:700, background:a===topUpAmt?K.goldD:K.g850, border:`1px solid ${a===topUpAmt?K.gold:K.g700}`, borderRadius:2, color:a===topUpAmt?K.gold:K.t3, cursor:"pointer" }}>
                  ${a.toLocaleString()}
                </button>
              ))}
            </div>
            <div style={{ padding:"14px", background:K.goldT, border:`1px solid ${K.gold}25`, borderRadius:2, marginBottom:16 }}>
              <p style={{ fontFamily:K.mono, fontSize:9, color:K.gold, marginBottom:4 }}>SELECTED AMOUNT</p>
              <p style={{ fontFamily:K.mono, fontSize:28, fontWeight:700, color:K.gold }}>${topUpAmt.toLocaleString()}</p>
            </div>
            <Button variant="mint" size="lg" full loading={toppingUp} onClick={handleTopUp}>↑ Top Up Now</Button>
            <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:6 }}>
              {[{l:"Bank transfer fee",v:"Free"},{l:"Card processing",v:"2.9%"},{l:"Settlement",v:"Instant"}].map(r=>(
                <div key={r.l} style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontFamily:K.mono, fontSize:10, color:K.t3 }}>{r.l}</span>
                  <span style={{ fontFamily:K.mono, fontSize:10, color:K.t2 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

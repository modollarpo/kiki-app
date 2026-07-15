"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

const COLOR_MAP: Record<string, string> = {
  blue: K.blue, mint: K.mint, teal: K.teal, gold: K.gold, oaas: K.oaas, warn: K.warn, t3: K.t3, danger: K.danger,
};

export default function FinancePage() {
  const { data, loading } = useInsights();
  const f = data?.finance;
  const totals = f?.totals ?? { revenue: 0, costs: 0, profit: 0, margin: 0 };
  const REVENUE_STREAMS = f?.revenueStreams ?? [];
  const COST_CATEGORIES = f?.costCategories ?? [];
  const MONTHLY_PNL = f?.monthlyPnl ?? [];
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "annual">("monthly");

  const k = (v: number) => `$${fmt.currency(Math.round(v / 1000), "USD").replace("$", "")}K`;

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Finance Operations</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>P&L summary · Revenue streams · Cost breakdown · Profitability</p>
          </div>
          <div style={{ display: "flex", gap: 4, background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 2, padding: 3 }}>
            {(["monthly", "quarterly", "annual"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: "5px 14px", fontFamily: K.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: period === p ? K.t1 : K.t4, background: period === p ? K.g800 : "transparent", border: "none", borderRadius: 2, cursor: "pointer", textTransform: "uppercase" }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Total Revenue" value={loading ? "…" : k(totals.revenue)} delta={8.2} period="last month" accent={K.mint} />
          <StatCard label="Total Costs" value={loading ? "…" : k(totals.costs)} delta={6.6} accent={K.blue} />
          <StatCard label="Net Profit" value={loading ? "…" : k(totals.profit)} delta={-21.1} period="last month" accent={K.gold} />
          <StatCard label="Gross Margin" value={loading ? "…" : `${totals.margin.toFixed(1)}%`} delta={-3.2} accent={K.teal} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 12, marginBottom: 16 }}>
          <Card padding={0}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}` }}>
              <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>P&L Trend ($K)</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "80px 100px 100px 100px 120px", gap: 12, padding: "8px 20px", borderBottom: `1px solid ${K.g800}`, background: K.g950 }}>
              {["MONTH", "REVENUE", "COSTS", "PROFIT", "MARGIN"].map(h => (
                <span key={h} style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4 }}>{h}</span>
              ))}
            </div>
            {(MONTHLY_PNL.length ? MONTHLY_PNL : [{ month: "Jul", revenue: 0, costs: 0, profit: 0 }]).map((m: { month: string; revenue: number; costs: number; profit: number }, i: number) => {
              const margin = m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : "0.0";
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 100px 100px 100px 120px", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${K.g900}`, alignItems: "center" }}
                  onMouseEnter={e => (e.currentTarget.style.background = K.g850)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{m.month}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 11, color: K.mint }}>${m.revenue}K</span>
                  <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>${m.costs}K</span>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: m.profit >= 80 ? K.mint : K.warn }}>${m.profit}K</span>
                  <div>
                    <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginRight: 6 }}>{margin}%</span>
                    <ProgressBar value={parseFloat(margin as string)} color={parseFloat(margin as string) >= 20 ? K.mint : K.warn} height={3} />
                  </div>
                </div>
              );
            })}
          </Card>

          <Card>
            <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Revenue Streams</h2>
            {REVENUE_STREAMS.map((s: any, i: number) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t2 }}>{s.name}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: COLOR_MAP[s.color] ?? K.t1 }}>{fmt.currency(s.amount, "USD")}</span>
                </div>
                <ProgressBar value={s.share} color={COLOR_MAP[s.color] ?? K.blue} height={4} />
                <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{s.share?.toFixed(1)}% of total</span>
              </div>
            ))}
            {REVENUE_STREAMS.length === 0 && <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>No revenue streams yet.</p>}
          </Card>
        </div>

        <Card>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}` }}>
            <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>Cost Breakdown by Category</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "14px 20px" }}>
            {COST_CATEGORIES.map((c: any, i: number) => (
              <div key={i} style={{ padding: "12px 14px", background: K.g850, borderRadius: 2, border: `1px solid ${K.g800}`, borderLeft: `3px solid ${COLOR_MAP[c.color] ?? K.t3}` }}>
                <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginBottom: 4 }}>{c.name}</p>
                <p style={{ fontFamily: K.mono, fontSize: 16, fontWeight: 700, color: COLOR_MAP[c.color] ?? K.t1 }}>${(c.amount / 1000).toFixed(1)}K</p>
                <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t3, marginTop: 2 }}>{c.pct?.toFixed(1)}% of total costs</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

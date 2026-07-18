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
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Finance Operations</h1>
            <p className="font-mono text-[11px] text-gray-500">P&L summary · Revenue streams · Cost breakdown · Profitability</p>
          </div>
          <div className="flex gap-1 p-[3px] rounded-sm bg-g900 border border-g800">
            {(["monthly", "quarterly", "annual"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="font-mono text-[10px] font-semibold tracking-widest px-3.5 py-[5px] rounded-sm cursor-pointer uppercase"
                style={{ color: period === p ? K.t1 : K.t4, background: period === p ? K.g800 : "transparent", border: "none" }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Revenue" value={loading ? "…" : k(totals.revenue)} delta={8.2} period="last month" accent={K.mint} />
          <StatCard label="Total Costs" value={loading ? "…" : k(totals.costs)} delta={6.6} accent={K.blue} />
          <StatCard label="Net Profit" value={loading ? "…" : k(totals.profit)} delta={-21.1} period="last month" accent={K.gold} />
          <StatCard label="Gross Margin" value={loading ? "…" : `${totals.margin.toFixed(1)}%`} delta={-3.2} accent={K.teal} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 mb-4">
          <Card padding={0}>
            <div className="px-5 py-3.5 border-b border-g800">
              <h2 className="font-mono font-bold text-[13px] text-white">P&L Trend ($K)</h2>
            </div>
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-[80px_100px_100px_100px_120px] gap-3 px-5 py-2 border-b border-g800 bg-g950">
                  {["MONTH", "REVENUE", "COSTS", "PROFIT", "MARGIN"].map(h => (
                    <span key={h} className="font-mono text-[10px] tracking-[0.1em] text-gray-600">{h}</span>
                  ))}
                </div>
                {(MONTHLY_PNL.length ? MONTHLY_PNL : [{ month: "Jul", revenue: 0, costs: 0, profit: 0 }]).map((m: { month: string; revenue: number; costs: number; profit: number }, i: number) => {
                  const margin = m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={i} className="grid grid-cols-[80px_100px_100px_100px_120px] gap-3 px-5 py-2.5 items-center hover:bg-[var(--card-hover)] border-b border-g900">
                      <span className="font-mono text-[11px] font-semibold text-white">{m.month}</span>
                      <span className="font-mono text-[11px] text-kmint">${m.revenue}K</span>
                      <span className="font-mono text-[11px] text-gray-400">${m.costs}K</span>
                      <span className="font-mono text-[11px] font-bold" style={{ color: m.profit >= 80 ? K.mint : K.warn }}>${m.profit}K</span>
                      <div>
                        <span className="font-mono text-[10px] text-gray-500 mr-1.5">{margin}%</span>
                        <ProgressBar value={parseFloat(margin as string)} color={parseFloat(margin as string) >= 20 ? K.mint : K.warn} height={3} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-mono font-bold text-[13px] text-white mb-3.5">Revenue Streams</h2>
            {REVENUE_STREAMS.map((s: any, i: number) => (
              <div key={i} className="mb-3.5">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[10px] text-gray-400">{s.name}</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: COLOR_MAP[s.color] ?? K.t1 }}>{fmt.currency(s.amount, "USD")}</span>
                </div>
                <ProgressBar value={s.share} color={COLOR_MAP[s.color] ?? K.blue} height={4} />
                <span className="font-mono text-[10px] text-gray-600">{s.share?.toFixed(1)}% of total</span>
              </div>
            ))}
            {REVENUE_STREAMS.length === 0 && <p className="font-mono text-[10px] text-gray-600">No revenue streams yet.</p>}
          </Card>
        </div>

        <Card>
          <div className="px-5 py-3.5 border-b border-g800">
            <h2 className="font-mono font-bold text-[13px] text-white">Cost Breakdown by Category</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 px-5 py-3.5">
            {COST_CATEGORIES.map((c: any, i: number) => (
              <div key={i} className="p-3 px-3.5 rounded-sm" style={{ background: K.g850, border: `1px solid ${K.g800}`, borderLeft: `3px solid ${COLOR_MAP[c.color] ?? K.t3}` }}>
                <p className="font-mono text-[10px] text-gray-600 mb-1">{c.name}</p>
                <p className="font-mono text-base font-bold" style={{ color: COLOR_MAP[c.color] ?? K.t1 }}>${(c.amount / 1000).toFixed(1)}K</p>
                <p className="font-mono text-[10px] text-gray-500 mt-0.5">{c.pct?.toFixed(1)}% of total costs</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

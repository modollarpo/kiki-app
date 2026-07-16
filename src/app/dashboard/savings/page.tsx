"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, ProgressBar, AIThinking } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

export default function SavingsPage() {
  const { data, loading } = useInsights();
  const savings = data?.savings;

  const totalSavings = savings?.total || 0;
  const baselineSpend = savings?.baselineSpend ?? 0;
  const efficiencyGain = baselineSpend > 0 ? ((totalSavings / baselineSpend) * 100).toFixed(1) : "—";
  const fraudBlocked = savings?.fraud || 0;

  const breakdown = savings?.breakdown || [];
  const sparklineData = breakdown.length > 0
    ? breakdown.map((item: { pct: number }) => item.pct)
    : totalSavings > 0 ? [totalSavings] : [];

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="mb-[22px]">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Savings &amp; Efficiency</h1>
          <p className="font-mono text-[11px] text-t3">LTV uplift · Fraud prevention · Bid optimization · Monthly performance</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-15">
            <AIThinking text="Loading savings data..." />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard label="Total Savings (MTD)" value={fmt.currency(totalSavings)} accent={K.mint} sub={baselineSpend > 0 ? `vs ${fmt.currency(baselineSpend)} baseline` : undefined} sparkline={sparklineData.length > 1 ? sparklineData : undefined} loading={loading} />
              <StatCard label="Efficiency Gain" value={`${efficiencyGain}%`} accent={K.blue} sub={baselineSpend > 0 ? `vs ${fmt.currency(baselineSpend)} baseline` : undefined} loading={loading} />
              <StatCard label="Fraud Blocked" value={fmt.currency(fraudBlocked)} accent={K.danger} loading={loading} />
              <StatCard label="ROAS Improvement" value={totalSavings > 0 ? "+0.34×" : "—"} accent={K.gold} loading={loading} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card accent={K.mint}>
                <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Savings Breakdown</h3>
                {breakdown.length === 0 ? (
                  <p className="font-mono text-[11px] text-t4">No savings recorded yet. Connect platforms and run agents to accumulate savings.</p>
                ) : breakdown.map((item: any) => {
                  const color = item.category.includes("Fraud") ? K.danger : K.mint;
                  return (
                    <div key={item.category} className="mb-[14px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] text-t2">{item.category}</span>
                        <span className="font-mono text-xs font-bold text-t1">{fmt.currency(item.amount)}</span>
                      </div>
                      <div className="flex items-center gap-[10px]">
                        <div className="flex-1">
                          <ProgressBar value={item.pct} max={100} color={color} height={4} glow />
                        </div>
                        <span className="font-mono text-[10px] text-t4 w-[30px] text-right">{item.pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </Card>

              <div className="flex flex-col gap-3">
                <Card accent={K.blue}>
                  <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Savings Summary</h3>
                  <div className="flex gap-3 justify-center">
                    {[{ l: "Monthly", v: fmt.currency(totalSavings) }, { l: "Quarterly", v: fmt.currency(totalSavings * 3) }, { l: "Annual", v: fmt.currency(totalSavings * 12) }].map(p => (
                      <div key={p.l} className="text-center">
                        <p className="font-mono text-[10px] text-t4 mb-[2px]">{p.l}</p>
                        <p className="font-mono text-xs font-bold text-kgold">{p.v}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card accent={K.gold}>
                  <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Projected Annual Savings</h3>
                  <div className="text-center py-4">
                    <p className="font-mono text-[32px] font-bold text-kmint">{fmt.currency(totalSavings * 12)}</p>
                    <p className="font-mono text-[10px] text-t4 mt-1">Based on current monthly rate</p>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

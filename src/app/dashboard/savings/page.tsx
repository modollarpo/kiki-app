"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, Sparkline, AIThinking } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

const COLOR_MAP: Record<string, string> = { mint: K.mint, danger: K.danger, blue: K.blue, oaas: K.oaas, teal: K.teal, gold: K.gold };

export default function SavingsPage() {
  const { data, loading } = useInsights();
  const savings = data?.savings;

  const totalSavings = savings?.total || 0;
  const baselineSpend = 412000;
  const efficiencyGain = savings ? ((totalSavings / baselineSpend) * 100).toFixed(1) : "0.0";
  const fraudBlocked = savings?.fraud || 0;

  const breakdown = savings?.breakdown || [];
  const sparklineData = [42, 48, 55, 60, 64, 68, totalSavings > 0 ? 71.7 : 0];

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Savings & Efficiency</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>LTV uplift · Fraud prevention · Bid optimization · Monthly performance</p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <AIThinking text="Loading savings data..." />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Total Savings (MTD)" value={fmt.currency(totalSavings)} accent={K.mint} delta={14.2} period="last month" sparkline={sparklineData} loading={loading} />
              <StatCard label="Efficiency Gain" value={`${efficiencyGain}%`} accent={K.blue} delta={3.8} period="baseline" sub="vs $412K baseline" loading={loading} />
              <StatCard label="Fraud Blocked" value={fmt.currency(fraudBlocked)} accent={K.danger} delta={22.1} period="last month" loading={loading} />
              <StatCard label="ROAS Improvement" value="+0.34×" accent={K.gold} delta={8.5} period="30d ago" sparkline={[2.1, 2.2, 2.3, 2.35, 2.4, 2.44]} loading={loading} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card accent={K.mint}>
                <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Savings Breakdown</h3>
                {breakdown.length === 0 ? (
                  <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t4 }}>No savings recorded yet. Connect platforms and run agents to accumulate savings.</p>
                ) : breakdown.map((item: any) => {
                  const color = item.category.includes("Fraud") ? K.danger : K.mint;
                  return (
                    <div key={item.category} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{item.category}</span>
                        <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>{fmt.currency(item.amount)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={item.pct} max={100} color={color} height={4} glow />
                        </div>
                        <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4, width: 30, textAlign: "right" }}>{item.pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card accent={K.blue}>
                  <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Savings Summary</h3>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    {[{ l: "Monthly", v: fmt.currency(totalSavings) }, { l: "Quarterly", v: fmt.currency(totalSavings * 3) }, { l: "Annual", v: fmt.currency(totalSavings * 12) }].map(p => (
                      <div key={p.l} style={{ textAlign: "center" }}>
                        <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginBottom: 2 }}>{p.l}</p>
                        <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.gold }}>{p.v}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card accent={K.gold}>
                  <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Projected Annual Savings</h3>
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <p style={{ fontFamily: K.mono, fontSize: 32, fontWeight: 700, color: K.mint }}>{fmt.currency(totalSavings * 12)}</p>
                    <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4, marginTop: 4 }}>Based on current monthly rate</p>
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

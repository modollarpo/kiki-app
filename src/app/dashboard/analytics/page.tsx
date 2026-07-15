"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, Button, AIThinking } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { K, fmt, PLATFORM_COLORS } from "@/lib/kdls";

interface AnalyticsData {
  channels: Array<{ name: string; roas: number; cpa: number; conversions: number; spend: number; share: number }>;
  funnel: Array<{ stage: string; value: number; pct: number }>;
  weeklyRoas: number[];
  attribution: Array<{ model: string; conversions: number; share: string; c: string }>;
  totals: { blendedRoas: number; totalConversions: number; blendedCpa: number; totalSpend: number };
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData, period]);

  const channels = data?.channels || [];
  const funnel = data?.funnel || [];
  const weeklyRoas = data?.weeklyRoas || [];
  const attribution = data?.attribution || [];
  const totals = data?.totals;

  const colorMap: Record<string, string> = { blue: K.blue, teal: K.teal, mint: K.mint, meta: PLATFORM_COLORS.meta, google: PLATFORM_COLORS.google, tiktok: PLATFORM_COLORS.tiktok, linkedin: PLATFORM_COLORS.linkedin };

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Performance Analytics</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Cross-platform attribution · ROAS by channel · Conversion funnel</p>
          </div>
          <div style={{ display: "flex", gap: 4, background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 2, padding: 3 }}>
            {(["7d", "30d", "90d"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: "5px 14px", fontFamily: K.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: period === p ? K.t1 : K.t4, background: period === p ? K.g800 : "transparent", border: "none", borderRadius: 2, cursor: "pointer" }}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <AIThinking text="Loading analytics..." />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Blended ROAS" value={totals ? `${totals.blendedRoas.toFixed(2)}×` : "0×"} delta={12.4} period="last month" accent={K.mint} sparkline={weeklyRoas} loading={loading} />
              <StatCard label="Total Conversions" value={totals ? fmt.compact(totals.totalConversions) : "0"} delta={18.2} accent={K.blue} loading={loading} />
              <StatCard label="Blended CPA" value={totals ? `$${totals.blendedCpa.toFixed(2)}` : "$0"} delta={-6.3} accent={K.gold} loading={loading} />
              <StatCard label="Total Spend" value={totals ? fmt.currency(totals.totalSpend) : "$0"} delta={4.1} accent={K.teal} loading={loading} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 12, marginBottom: 16 }}>
              <Card padding={0}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}` }}>
                  <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>ROAS by Channel</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "140px 80px 90px 100px 90px 80px", gap: 12, padding: "8px 20px", borderBottom: `1px solid ${K.g800}`, background: K.g950 }}>
                  {["CHANNEL", "ROAS", "CPA", "CONVERSIONS", "SPEND", "SHARE"].map(h => (
                    <span key={h} style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4 }}>{h}</span>
                  ))}
                </div>
                {channels.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t4 }}>No campaign data available. Create campaigns to see channel analytics.</p>
                  </div>
                ) : (
                  channels.map((ch, i) => {
                    const pc = PLATFORM_COLORS[ch.name.split(" ")[0].toLowerCase()] || K.t3;
                    return (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 80px 90px 100px 90px 80px", gap: 12, padding: "12px 20px", borderBottom: `1px solid ${K.g900}`, alignItems: "center" }}
                        onMouseEnter={e => (e.currentTarget.style.background = K.g850)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: pc, flexShrink: 0 }} />
                          <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{ch.name}</span>
                        </div>
                        <span style={{ fontFamily: K.mono, fontSize: 13, fontWeight: 700, color: ch.roas >= 4 ? K.mint : ch.roas >= 2.5 ? K.warn : K.danger }}>{fmt.roas(ch.roas)}</span>
                        <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>${ch.cpa.toFixed(2)}</span>
                        <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{fmt.compact(ch.conversions)}</span>
                        <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{fmt.currency(ch.spend)}</span>
                        <div>
                          <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginBottom: 4, display: "block" }}>{(ch.share * 100).toFixed(1)}%</span>
                          <ProgressBar value={ch.share * 100} color={pc} height={3} />
                        </div>
                      </div>
                    );
                  })
                )}
              </Card>

              <Card>
                <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 16 }}>Conversion Funnel</h2>
                {funnel.map((f, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t2 }}>{f.stage}</span>
                      <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1 }}>{fmt.compact(f.value)}</span>
                    </div>
                    <ProgressBar value={f.pct} color={i < 2 ? K.blue : i < 4 ? K.teal : K.mint} height={6} glow />
                    {i < funnel.length - 1 && funnel[i + 1].value > 0 && (
                      <div style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, textAlign: "center", margin: "2px 0" }}>
                        ↓ {((funnel[i + 1].value / f.value) * 100).toFixed(1)}% conversion
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            </div>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>Attribution Windows</h2>
                <Badge color={K.teal}>SYNC ACTIVE</Badge>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {attribution.map((m, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: K.g850, borderRadius: 2, border: `1px solid ${K.g800}` }}>
                    <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginBottom: 4 }}>{m.model}</p>
                    <p style={{ fontFamily: K.mono, fontSize: 18, fontWeight: 700, color: colorMap[m.c] || K.t1 }}>{fmt.compact(m.conversions)}</p>
                    <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginTop: 2 }}>{m.share} of total</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, AIThinking, ScrollableTable, EmptyState } from "@/components/ui";
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
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex justify-between items-start mb-5 gap-3 flex-wrap">
          <div>
            <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Performance Analytics</h1>
            <p className="font-mono text-[11px] text-gray-500">Cross-platform attribution · ROAS by channel · Conversion funnel</p>
          </div>
          <div className="flex gap-1 p-[3px] rounded-sm" style={{ background: K.g900, border: `1px solid ${K.g800}` }}>
            {(["7d", "30d", "90d"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="font-mono text-[10px] font-semibold tracking-widest px-3.5 py-[5px] rounded-sm cursor-pointer"
                style={{ color: period === p ? K.t1 : K.t4, background: period === p ? K.g800 : "transparent", border: "none" }}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-15">
            <AIThinking text="Loading analytics..." />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard label="Blended ROAS" value={totals ? `${totals.blendedRoas.toFixed(2)}×` : "0×"} period="last month" accent={K.mint} sparkline={weeklyRoas} loading={loading} />
              <StatCard label="Total Conversions" value={totals ? fmt.compact(totals.totalConversions) : "0"} accent={K.blue} loading={loading} />
              <StatCard label="Blended CPA" value={totals ? `$${totals.blendedCpa.toFixed(2)}` : "$0"} accent={K.gold} loading={loading} />
              <StatCard label="Total Spend" value={totals ? fmt.currency(totals.totalSpend) : "$0"} accent={K.teal} loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 mb-4">
              <Card padding={0}>
                <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${K.g800}` }}>
                  <h2 className="font-mono font-bold text-[13px] text-white">ROAS by Channel</h2>
                </div>
                <ScrollableTable>
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-[140px_80px_90px_100px_90px_80px] gap-3 px-5 py-2" style={{ borderBottom: `1px solid ${K.g800}`, background: K.g950 }}>
                  {["CHANNEL", "ROAS", "CPA", "CONVERSIONS", "SPEND", "SHARE"].map(h => (
                    <span key={h} className="font-mono text-[10px] tracking-[0.1em] text-gray-600">{h}</span>
                  ))}
                </div>
                {channels.length === 0 ? (
                  <EmptyState icon="📊" title="No campaign data" body="Create campaigns to see channel analytics." />
                ) : (
                  channels.map((ch, i) => {
                    const pc = PLATFORM_COLORS[ch.name.split(" ")[0].toLowerCase()] || K.t3;
                    return (
                      <div key={i} className="grid grid-cols-[140px_80px_90px_100px_90px_80px] gap-3 px-5 py-3 items-center hover:bg-[var(--card-hover)]"
                        style={{ borderBottom: `1px solid ${K.g900}` }}>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: pc }} />
                          <span className="font-mono text-[11px] font-semibold text-white">{ch.name}</span>
                        </div>
                        <span className="font-mono text-[13px] font-bold" style={{ color: ch.roas >= 4 ? K.mint : ch.roas >= 2.5 ? K.warn : K.danger }}>{fmt.roas(ch.roas)}</span>
                        <span className="font-mono text-[11px] text-gray-400">${ch.cpa.toFixed(2)}</span>
                        <span className="font-mono text-[11px] font-semibold text-white">{fmt.compact(ch.conversions)}</span>
                        <span className="font-mono text-[11px] text-gray-400">{fmt.currency(ch.spend)}</span>
                        <div>
                          <span className="font-mono text-[10px] text-gray-500 block mb-1">{(ch.share * 100).toFixed(1)}%</span>
                          <ProgressBar value={ch.share * 100} color={pc} height={3} />
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </ScrollableTable>
            </Card>

              <Card>
                <h2 className="font-mono font-bold text-[13px] text-white mb-4">Conversion Funnel</h2>
                {funnel.map((f, i) => (
                  <div key={i} className="mb-3.5">
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-gray-400">{f.stage}</span>
                      <span className="font-mono text-[11px] font-bold text-white">{fmt.compact(f.value)}</span>
                    </div>
                    <ProgressBar value={f.pct} color={i < 2 ? K.blue : i < 4 ? K.teal : K.mint} height={6} glow />
                    {i < funnel.length - 1 && funnel[i + 1].value > 0 && (
                      <div className="font-mono text-[10px] text-gray-600 text-center my-0.5">
                        ↓ {((funnel[i + 1].value / f.value) * 100).toFixed(1)}% conversion
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            </div>

            <Card>
              <div className="flex justify-between items-center mb-3.5">
                <h2 className="font-mono font-bold text-[13px] text-white">Attribution Windows</h2>
                <Badge color={K.teal}>SYNC ACTIVE</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {attribution.map((m, i) => (
                  <div key={i} className="p-3 px-3.5 rounded-sm" style={{ background: K.g850, border: `1px solid ${K.g800}` }}>
                    <p className="font-mono text-[10px] text-gray-500 mb-1">{m.model}</p>
                    <p className="font-mono text-lg font-bold" style={{ color: colorMap[m.c] || K.t1 }}>{fmt.compact(m.conversions)}</p>
                    <p className="font-mono text-[10px] text-gray-600 mt-0.5">{m.share} of total</p>
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

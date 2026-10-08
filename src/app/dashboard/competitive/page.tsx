"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard, ScrollableTable, AIThinking } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Competitor {
  name: string; platform: string; marketShare: number | null;
  avgPrice: number | null; trend: string;
  spend: number; roas: number; cpa: number;
}

interface MarketTrend {
  metric: string; value: string; change: string; direction: string;
}

interface CpmBenchmark {
  platform: string; yours: number; benchmark: number | null; industry: number | null;
}

export default function CompetitiveIntelligencePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [sov, setSov] = useState<{ yourShare: number | null; topCompetitor: number | null; industryAvg: number | null }>({ yourShare: null, topCompetitor: null, industryAvg: null });
  const [cpmBenchmarks, setCpmBenchmarks] = useState<CpmBenchmark[]>([]);
  const [ourPerformance, setOurPerformance] = useState<{ totalSpend: number; avgRoas: number; totalCampaigns: number } | null>(null);
  const [trackedCount, setTrackedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/competitive", { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setCompetitors(d.competitors || []);
          setTrends(d.marketTrends || []);
          if (d.shareOfVoice) setSov(d.shareOfVoice);
          if (d.cpmBenchmarks) setCpmBenchmarks(d.cpmBenchmarks);
          if (d.ourPerformance) setOurPerformance(d.ourPerformance);
          if (typeof d.competitorsTracked === "number") setTrackedCount(d.competitorsTracked);
        }
      })
      .catch((err) => { setError(err?.message || "Failed to load competitive data"); setLoading(false); })
      .finally(() => setLoading(false));
  }, [token]);

  if (authLoading) return <DashboardLayout><div className="flex items-center justify-center p-8"><AIThinking text="Loading..." /></div></DashboardLayout>;
  if (!token) return null;

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px] text-t1">
        <div className="mb-[22px]">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Competitive Intelligence</h1>
          <p className="font-mono text-[11px] text-t3">Track competitor ad spend, benchmarks, and market share</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-[11px]" style={{ color: K.danger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Market Share" value={sov.yourShare != null ? `${sov.yourShare}%` : "—"} sub="Requires external market data" accent={K.mint} loading={loading} />
          <StatCard label="Top Competitor" value={sov.topCompetitor != null ? `${sov.topCompetitor}%` : "—"} sub="Share of voice" accent={K.warn} loading={loading} />
          <StatCard label="Industry Average" value={sov.industryAvg != null ? `${sov.industryAvg}%` : "—"} sub="Market benchmark" accent={K.t3} loading={loading} />
          <StatCard label="Competitors Tracked" value={trackedCount > 0 ? String(trackedCount) : "—"} sub="Active monitoring" accent={K.blue} loading={loading} />
        </div>

        <div className="mb-4">
          <Card accent={K.mint}>
            <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Competitor Monitor</h3>
            {competitors.length > 0 || ourPerformance ? (
              <ScrollableTable>
                <div className="flex flex-col gap-2 min-w-[600px]">
                  {ourPerformance && (
                    <div className="flex items-center gap-3 px-[14px] py-3 rounded-kdls bg-g850 border-l-[3px] border-l-kmint">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold text-t1">Your Account</span>
                          <Badge color={K.mint}>You</Badge>
                          <Badge color={K.t3}>All platforms</Badge>
                        </div>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="font-mono text-xs font-bold text-t1">${(ourPerformance.totalSpend / 1000).toFixed(0)}K</p>
                        <p className="font-mono text-[10px] text-t4">spend</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-mono text-xs font-bold text-kmint">{ourPerformance.avgRoas.toFixed(2)}×</p>
                        <p className="font-mono text-[10px] text-t4">ROAS</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-mono text-xs font-bold text-t1">—</p>
                        <p className="font-mono text-[10px] text-t4">CPA</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-mono text-xs font-bold text-kgold">—</p>
                        <p className="font-mono text-[10px] text-t4">share</p>
                      </div>
                    </div>
                  )}
                  {competitors.map((comp, i) => (
                    <div key={i} className="flex items-center gap-3 px-[14px] py-3 rounded-kdls bg-g900">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold text-t1">{comp.name}</span>
                          <Badge color={K.t3}>web</Badge>
                        </div>
                        <p className="font-mono text-[10px] text-t4">Price monitored via competitor tracker</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="font-mono text-xs font-bold text-t1">{comp.avgPrice != null ? `$${comp.avgPrice.toFixed(2)}` : "—"}</p>
                        <p className="font-mono text-[10px] text-t4">avg. price</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-mono text-xs font-bold text-t1">—</p>
                        <p className="font-mono text-[10px] text-t4">ROAS</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-mono text-xs font-bold text-t1">—</p>
                        <p className="font-mono text-[10px] text-t4">CPA</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-mono text-xs font-bold text-kgold">—</p>
                        <p className="font-mono text-[10px] text-t4">share</p>
                      </div>
                      <span className={`font-mono text-sm ${comp.trend === "up" ? "text-kmint" : "text-kdanger"}`}>{comp.trend === "up" ? "↑" : "↓"}</span>
                    </div>
                  ))}
                </div>
              </ScrollableTable>
            ) : (
              <div className="py-6 text-center">
                <p className="font-mono text-[11px] text-t3">No competitors tracked yet</p>
                <p className="font-mono text-[10px] text-t4 mt-1">Add a competitor domain in the Competitor Tracking page to start monitoring prices</p>
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card accent={K.blue}>
            <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Market Trends</h3>
            {trends.map((t, i) => (
              <div key={i} className={`flex items-center justify-between py-[10px] ${i < trends.length - 1 ? "border-b border-g800" : ""}`}>
                <span className="font-mono text-[11px] text-t2">{t.metric}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-t1">{t.value}</span>
                  <Badge color={t.direction === "up" ? K.mint : K.danger}>{t.change}</Badge>
                </div>
              </div>
            ))}
          </Card>

          <Card accent={K.gold}>
            <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">CPM Benchmarks</h3>
            {cpmBenchmarks.length > 0 ? (
              cpmBenchmarks.map((b, i) => (
                <div key={i} className="px-3 py-[10px] mb-2 bg-g850 rounded-kdls">
                  <div className="flex justify-between items-center mb-[6px]">
                    <span className="font-mono text-[11px] font-semibold text-t1">{b.platform}</span>
                    {b.benchmark != null && (
                      <Badge color={b.yours < b.benchmark ? K.mint : K.warn}>{b.yours < b.benchmark ? "Below" : "Above"} Benchmark</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-mono text-[10px] text-t4">Yours</p>
                      <p className="font-mono text-xs font-bold text-kmint">${b.yours}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-t4">Benchmark</p>
                      <p className="font-mono text-xs font-bold text-t2">{b.benchmark != null ? `$${b.benchmark}` : "—"}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-t4">Industry</p>
                      <p className="font-mono text-xs font-bold text-t3">{b.industry != null ? `$${b.industry}` : "—"}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center">
                <p className="font-mono text-[11px] text-t3">No benchmark data available</p>
                <p className="font-mono text-[10px] text-t4 mt-1">CPM benchmarks will appear once campaign impression data is collected</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

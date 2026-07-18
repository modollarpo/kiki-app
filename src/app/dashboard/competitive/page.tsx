"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Competitor {
  name: string; platform: string; spend: number; roas: number;
  cpa: number; marketShare: number; trend: string;
}

interface MarketTrend {
  metric: string; value: string; change: string; direction: string;
}

interface CpmBenchmark {
  platform: string; yours: number; benchmark: number; industry: number;
}

export default function CompetitiveIntelligencePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [sov, setSov] = useState<{ yourShare: number; topCompetitor: number; industryAvg: number } | null>(null);
  const [cpmBenchmarks, setCpmBenchmarks] = useState<CpmBenchmark[]>([]);
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
        if (d.success) {
          setCompetitors(d.data.competitors);
          setTrends(d.data.marketTrends);
          setSov(d.data.shareOfVoice);
          if (d.data.cpmBenchmarks) setCpmBenchmarks(d.data.cpmBenchmarks);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px] text-t1">
        <div className="mb-[22px]">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Competitive Intelligence</h1>
          <p className="font-mono text-[11px] text-t3">Track competitor ad spend, benchmarks, and market share</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Market Share" value={sov ? `${sov.yourShare}%` : "—"} delta={2.3} sub="+2.3% vs last quarter" accent={K.mint} loading={loading} />
          <StatCard label="Top Competitor" value={sov ? `${sov.topCompetitor}%` : "—"} sub="Share of voice" accent={K.warn} loading={loading} />
          <StatCard label="Industry Average" value={sov ? `${sov.industryAvg}%` : "—"} sub="Market benchmark" accent={K.t3} loading={loading} />
          <StatCard label="Competitors Tracked" value={competitors.length > 0 ? String(competitors.length - 1) : "—"} sub="Active monitoring" accent={K.blue} loading={loading} />
        </div>

        <div className="mb-4">
          <Card accent={K.mint}>
            <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Competitor Spend Tracker</h3>
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <div className="flex flex-col gap-2 min-w-[600px]">
                {competitors.map((comp, i) => {
                  const isYou = comp.name === "Your Account";
                  return (
                    <div key={i} className={`flex items-center gap-3 px-[14px] py-3 rounded-kdls ${isYou ? "bg-g850 border-l-[3px] border-l-kmint" : "bg-g900"}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold text-t1">{comp.name}</span>
                          {isYou && <Badge color={K.mint}>You</Badge>}
                          <Badge color={comp.platform === "meta" ? "#1877F2" : comp.platform === "google" ? "#4285F4" : comp.platform === "tiktok" ? "#000" : K.t3}>{comp.platform}</Badge>
                        </div>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="font-mono text-xs font-bold text-t1">${(comp.spend / 1000).toFixed(0)}K</p>
                        <p className="font-mono text-[10px] text-t4">spend</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className={`font-mono text-xs font-bold ${comp.roas >= 4 ? "text-kmint" : comp.roas >= 2.5 ? "text-kwarn" : "text-kdanger"}`}>{comp.roas}×</p>
                        <p className="font-mono text-[10px] text-t4">ROAS</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-mono text-xs font-bold text-t1">${comp.cpa.toFixed(2)}</p>
                        <p className="font-mono text-[10px] text-t4">CPA</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-mono text-xs font-bold text-kgold">{comp.marketShare}%</p>
                        <p className="font-mono text-[10px] text-t4">share</p>
                      </div>
                      <span className={`font-mono text-sm ${comp.trend === "up" ? "text-kmint" : "text-kdanger"}`}>{comp.trend === "up" ? "↑" : "↓"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
                    {b.benchmark > 0 && (
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
                      <p className="font-mono text-xs font-bold text-t2">{b.benchmark > 0 ? `$${b.benchmark}` : "—"}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-t4">Industry</p>
                      <p className="font-mono text-xs font-bold text-t3">{b.industry > 0 ? `$${b.industry}` : "—"}</p>
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

"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard, AIThinking } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Channel { name: string; contributionPct: number; spend: number; revenue: number; efficiency: number; }
interface Recommendation { channel: string; currentSpend: number; recommendedSpend: number; confidence: number; reason: string; }

export default function MmmPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [modelFit, setModelFit] = useState<{ rSquared: number; algorithm: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);
  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  const runMmm = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/mmm-analysis", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ weeks: 52 }) });
      const data = await res.json();
      if (data.success) {
        setChannels(data.data.channels || []);
        setRecommendations(data.data.recommendations || []);
        setModelFit(data.data.modelFit || null);
        setHasRun(true);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-white">
        <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Media Mix Modelling</h1>
            <p className="font-mono text-[11px] text-gray-500">Bayesian adstock + Hill saturation channel attribution</p>
          </div>
          <button onClick={runMmm} disabled={loading} className="font-mono text-[11px] font-semibold px-5 py-2 rounded-sm cursor-pointer"
            style={{ border: `1px solid ${K.blue}40`, background: loading ? K.g800 : K.blue + "20", color: K.blue, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "Running..." : hasRun ? "Re-run MMM" : "Run MMM Analysis"}
          </button>
        </div>

        {loading && <div className="flex justify-center py-15"><AIThinking text="Fitting Bayesian model with adstock decay..." /></div>}

        {!loading && hasRun && (
          <>
            {modelFit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <StatCard label="R² Score" value={`${(modelFit.rSquared * 100).toFixed(1)}%`} accent={K.mint} />
                <StatCard label="Algorithm" value={modelFit.algorithm} accent={K.blue} />
                <StatCard label="Channels" value={String(channels.length)} accent={K.gold} />
              </div>
            )}

            <Card accent={K.mint} className="mb-4">
              <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Channel Contributions</h3>
              {channels.map((ch, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 px-3 mb-1.5 rounded-sm bg-g850">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-semibold text-white">{ch.name}</div>
                    <div className="font-mono text-[11px] text-gray-500">${ch.spend?.toLocaleString()} spend → ${ch.revenue?.toLocaleString()} revenue</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-[11px] text-gray-500">Contribution</div>
                    <div className="font-mono text-sm font-bold text-kmint">{ch.contributionPct?.toFixed(1)}%</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-[11px] text-gray-500">Efficiency</div>
                    <div className="font-mono text-sm font-bold" style={{ color: ch.efficiency >= 3 ? K.mint : ch.efficiency >= 1.5 ? K.gold : K.danger }}>{ch.efficiency?.toFixed(1)}x</div>
                  </div>
                </div>
              ))}
            </Card>

            <Card accent={K.gold}>
              <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Budget Recommendations</h3>
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 px-3 mb-1.5 rounded-sm bg-g850">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-semibold text-white">{rec.channel}</div>
                    <div className="font-mono text-[11px] text-gray-500">{rec.reason}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-[11px] text-gray-400">${rec.currentSpend?.toLocaleString()} → ${rec.recommendedSpend?.toLocaleString()}</div>
                    <Badge color={rec.confidence > 80 ? K.mint : K.gold}>{rec.confidence}% confidence</Badge>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}

        {!loading && !hasRun && (
          <Card>
            <div className="py-15 text-center">
              <p className="font-mono text-xs text-gray-500 mb-3">Run MMM analysis to see channel contributions and budget recommendations.</p>
              <p className="font-mono text-[11px] text-gray-500">Requires at least 8 weeks of campaign data. Uses Bayesian adstock decay + Hill saturation curves.</p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

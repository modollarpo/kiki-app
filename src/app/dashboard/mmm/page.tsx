"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard, AIThinking, NotConfigured } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Channel { name: string; contributionPct: number; spend: number; revenue: number; efficiency: number; }
interface Recommendation { channel: string; currentSpend: number; recommendedSpend: number; changePct: number; reason: string; }

export default function MmmPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [modelFit, setModelFit] = useState<{ rSquared: number; algorithm: string } | null>(null);
  const [notConfigured, setNotConfigured] = useState<{ service: string; envVar: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);
  if (authLoading) return <DashboardLayout><div className="flex items-center justify-center p-8"><AIThinking text="Loading..." /></div></DashboardLayout>;
  if (!token) return null;

  const runMmm = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/mmm-analysis", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ weeks: 52 }) });
      const data = await res.json();
      if (data.code === "SERVICE_NOT_CONFIGURED" || data.serviceNotConfigured) { setNotConfigured({ service: "Media Mix Modelling", envVar: "MMM_URL" }); setLoading(false); return; }
      if (data.ok) {
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
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-t1">
        <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Media Mix Modelling</h1>
            <p className="font-mono text-caption text-t3">OLS channel attribution and budget reallocation from campaign data</p>
          </div>
          <button onClick={runMmm} disabled={loading} className="font-mono text-caption font-semibold px-5 py-2 rounded-sm cursor-pointer"
            style={{ border: `1px solid ${K.blue}40`, background: loading ? K.g800 : K.blue + "20", color: K.tBlue, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "Running..." : hasRun ? "Re-run MMM" : "Run MMM Analysis"}
          </button>
        </div>

        {loading && <div className="flex justify-center py-15"><AIThinking text="Fitting revenue-weighted regression across channels..." /></div>}

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
              <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Channel Contributions</h3>
              {channels.map((ch, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 px-3 mb-1.5 rounded-sm bg-g850">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-semibold text-t1">{ch.name}</div>
                    <div className="font-mono text-caption text-t3">${ch.spend?.toLocaleString()} spend → ${ch.revenue?.toLocaleString()} revenue</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-caption text-t3">Contribution</div>
                    <div className="font-mono text-sm font-bold text-kmint">{ch.contributionPct?.toFixed(1)}%</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-caption text-t3">Efficiency</div>
                    <div className="font-mono text-sm font-bold" style={{ color: ch.efficiency >= 3 ? K.mint : ch.efficiency >= 1.5 ? K.gold : K.danger }}>{ch.efficiency?.toFixed(1)}x</div>
                  </div>
                </div>
              ))}
            </Card>

            <Card accent={K.gold}>
              <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Budget Recommendations</h3>
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 px-3 mb-1.5 rounded-sm bg-g850">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-semibold text-t1">{rec.channel}</div>
                    <div className="font-mono text-caption text-t3">{rec.reason}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-caption text-t2">${rec.currentSpend?.toLocaleString()} → ${rec.recommendedSpend?.toLocaleString()}</div>
                    <Badge color={rec.changePct > 0 ? K.mint : rec.changePct < 0 ? K.gold : K.t3}>{rec.changePct > 0 ? "+" : ""}{rec.changePct}%</Badge>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}

        {!loading && notConfigured && (<NotConfigured service={notConfigured.service} envVar={notConfigured.envVar} />)}
        {!loading && !notConfigured && !hasRun && (
          <Card>
            <div className="py-15 text-center">
              <p className="font-mono text-xs text-t3 mb-3">Run MMM analysis to see channel contributions and budget recommendations.</p>
              <p className="font-mono text-caption text-t3">Requires campaign data. Uses an OLS regression of revenue on spend to attribute channel contributions and recommend budget shifts.</p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

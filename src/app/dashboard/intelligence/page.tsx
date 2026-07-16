"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Insight { type: string; title: string; description: string; impact: string; confidence: number; }
interface Prediction { metric: string; value: string; confidence: number; range: string; }

export default function IntelligencePage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/intelligence", { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setInsights(d.data.insights);
          setPredictions(d.data.predictions);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  const getInsightColor = (type: string) => type === "opportunity" ? K.mint : type === "alert" ? K.warn : K.blue;
  const getImpactColor = (impact: string) => impact === "high" ? K.mint : impact === "medium" ? K.gold : K.t3;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-white">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">AI Intelligence</h1>
          <p className="font-mono text-[11px] text-gray-500">AI-powered insights, predictions, and optimization recommendations</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <StatCard label="Active Insights" value={insights.length > 0 ? String(insights.length) : "—"} accent={K.blue} sub="AI-generated" loading={loading} />
          <StatCard label="Avg Confidence" value={insights.length > 0 ? `${Math.round(insights.reduce((s, i) => s + i.confidence, 0) / insights.length)}%` : "—"} accent={K.mint} sub="Model accuracy" loading={loading} />
          <StatCard label="High Impact" value={insights.length > 0 ? String(insights.filter(i => i.impact === "high").length) : "—"} accent={K.gold} sub="Action needed" loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 mb-4">
          <Card accent={K.blue}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">AI Insights</h3>
            <div className="flex flex-col gap-2">
              {insights.map((insight, i) => (
                <div key={i} className="p-3.5 rounded-sm bg-g850" style={{ borderLeft: `3px solid ${getInsightColor(insight.type)}` }}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge color={getInsightColor(insight.type)}>{insight.type}</Badge>
                      <span className="font-mono text-xs font-semibold text-white">{insight.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge color={getImpactColor(insight.impact)}>{insight.impact} impact</Badge>
                      <span className="font-mono text-[10px] text-gray-500">{insight.confidence}% conf</span>
                    </div>
                  </div>
                  <p className="font-mono text-[11px] text-gray-400 leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card accent={K.teal}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Predictions</h3>
            {predictions.map((pred, i) => (
              <div key={i} className="p-3.5 mb-2 rounded-sm bg-g850">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-[11px] text-gray-400">{pred.metric}</span>
                  <span className="font-mono text-[10px] text-gray-500">{pred.confidence}% conf</span>
                </div>
                <p className="font-mono text-lg font-bold mb-1 text-kmint">{pred.value}</p>
                <p className="font-mono text-[10px] text-gray-500">Range: {pred.range}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

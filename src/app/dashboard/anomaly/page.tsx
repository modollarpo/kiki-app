"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useInsights } from "@/hooks/useInsights";

export default function AnomalyDetectionPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading } = useInsights();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  const anomalies = (data?.anomaly ?? []).map((a: { type: string; severity: string; description: string; time: string; status: string }) => ({
    id: a.type?.slice(0, 4) ?? "N/A",
    type: a.description ?? a.type,
    campaign: "Platform",
    severity: a.severity ?? "medium",
    change: "—",
    timestamp: a.time ? new Date(a.time).toLocaleString() : "—",
    status: a.status ?? "investigating",
  }));

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return K.danger;
      case "high": return K.warn;
      case "medium": return K.gold;
      default: return K.t3;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-white">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Anomaly Detection</h1>
          <p className="font-mono text-[11px] text-gray-500">AI-powered monitoring of campaign performance anomalies</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Active Anomalies" value={loading ? "…" : String(anomalies.filter(a => a.status === "investigating").length)} accent={K.danger} sub={`${anomalies.length} total flagged`} />
          <StatCard label="Critical" value={loading ? "…" : String(anomalies.filter(a => a.severity === "critical").length)} accent={K.warn} sub="Require action" />
          <StatCard label="Detection Score" value="94.7%" accent={K.blue} sub="AI model accuracy" />
          <StatCard label="High Severity" value={loading ? "…" : String(anomalies.filter(a => a.severity === "high").length)} accent={K.teal} sub="Under review" />
        </div>

        <Card accent={K.warn} className="mb-4">
          <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Recent Anomalies</h3>
          <div className="flex flex-col gap-2">
            {anomalies.map((anomaly, i) => (
              <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 px-3.5 rounded-sm bg-g900" style={{ borderLeft: `3px solid ${getSeverityColor(anomaly.severity)}` }}>
                <div className="flex-1 min-w-[120px]">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge color={getSeverityColor(anomaly.severity)} dot>{anomaly.severity}</Badge>
                    <span className="font-mono text-xs font-bold text-white">{anomaly.type}</span>
                    <span className="font-mono text-[10px] text-gray-600">#{anomaly.id}</span>
                  </div>
                  <p className="font-mono text-[10px] text-gray-500">{anomaly.campaign}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[13px] font-bold" style={{ color: getSeverityColor(anomaly.severity) }}>{anomaly.change}</p>
                  <p className="font-mono text-[10px] text-gray-600">{anomaly.timestamp}</p>
                </div>
                <Badge color={anomaly.status === "investigating" ? K.warn : K.mint}>{anomaly.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card accent={K.blue}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Detection Rules</h3>
            {anomalies.length === 0 ? (
              <p className="font-mono text-[10px] text-gray-500 py-4 text-center">No detection rules triggered yet.</p>
            ) : (
              (() => {
                const typeCounts = new Map<string, number>();
                anomalies.forEach(a => { typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1); });
                return Array.from(typeCounts.entries()).map(([type, count], i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-g800">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-kmint" />
                      <span className="font-mono text-[11px] text-white">{type}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] text-gray-500">{count} detections</span>
                      <Badge color={K.mint}>Active</Badge>
                    </div>
                  </div>
                ));
              })()
            )}
          </Card>

          <Card accent={K.teal}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Severity Distribution</h3>
            {[
              { label: "Critical", count: anomalies.filter(a => a.severity === "critical").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "critical").length / anomalies.length) * 100) : 0, color: K.danger },
              { label: "High", count: anomalies.filter(a => a.severity === "high").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "high").length / anomalies.length) * 100) : 0, color: K.warn },
              { label: "Medium", count: anomalies.filter(a => a.severity === "medium").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "medium").length / anomalies.length) * 100) : 0, color: K.gold },
              { label: "Low", count: anomalies.filter(a => a.severity === "low").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "low").length / anomalies.length) * 100) : 0, color: K.t3 },
              { label: "Resolved", count: anomalies.filter(a => a.status === "resolved").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.status === "resolved").length / anomalies.length) * 100) : 0, color: K.mint },
            ].map(s => (
              <div key={s.label} className="mb-2.5">
                <div className="flex justify-between mb-[3px]">
                  <span className="font-mono text-[10px] text-gray-400">{s.label}</span>
                  <span className="font-mono text-[10px] font-bold text-white">{s.count}</span>
                </div>
                <ProgressBar value={s.pct} color={s.color} height={3} />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard, Button } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useInsights } from "@/hooks/useInsights";
import { useKikiStore } from "@/store";

export default function AnomalyDetectionPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading } = useInsights();
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const addToast = useKikiStore(s => s.addToast);

  const updateAnomaly = async (id: string, action: "acknowledge" | "resolve" | "reopen") => {
    if (!token) return;
    setBusy(id);
    try {
      const res = await fetch("/api/anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Update failed");
      setStatusOverrides(prev => ({ ...prev, [id]: result.status }));
      addToast("success", action === "resolve" ? "Anomaly resolved" : action === "acknowledge" ? "Anomaly acknowledged" : "Anomaly reopened");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  const anomalies = (data?.anomaly ?? []).map((a: { id: string; type: string; severity: string; description: string; time: string; status: string }) => ({
    id: a.id || a.type?.slice(0, 8) || "N/A",
    type: a.description ?? a.type,
    eventType: a.type,
    campaign: "Platform",
    severity: a.severity ?? "medium",
    change: "—",
    timestamp: a.time ? new Date(a.time).toLocaleString() : "—",
    status: statusOverrides[a.id] ?? a.status ?? "open",
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
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-t1">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Anomaly Detection</h1>
          <p className="font-mono text-caption text-t3">AI-powered monitoring of campaign performance anomalies</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Active Anomalies" value={loading ? "…" : String(anomalies.filter(a => a.status === "open" || a.status === "detected").length)} accent={K.danger} sub={`${anomalies.length} total flagged`} />
          <StatCard label="Critical" value={loading ? "…" : String(anomalies.filter(a => a.severity === "critical").length)} accent={K.warn} sub="Require action" />
          <StatCard label="Blocked" value={loading ? "…" : String(anomalies.filter(a => a.status === "blocked").length)} accent={K.blue} sub="Auto-blocked / handled" />
          <StatCard label="High Severity" value={loading ? "…" : String(anomalies.filter(a => a.severity === "high").length)} accent={K.teal} sub="Under review" />
        </div>

        <Card accent={K.warn} className="mb-4">
          <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Recent Anomalies</h3>
          <div className="flex flex-col gap-2">
            {anomalies.map((anomaly, i) => (
              <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 px-3.5 rounded-sm bg-g900" style={{ borderLeft: `3px solid ${getSeverityColor(anomaly.severity)}` }}>
                <div className="flex-1 min-w-[120px]">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge color={getSeverityColor(anomaly.severity)} dot>{anomaly.severity}</Badge>
                    <span className="font-mono text-xs font-bold text-t1">{anomaly.type}</span>
                    <span className="font-mono text-caption text-t4">#{anomaly.id}</span>
                  </div>
                  <p className="font-mono text-caption text-t3">{anomaly.campaign}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-small font-bold" style={{ color: getSeverityColor(anomaly.severity) }}>{anomaly.change}</p>
                  <p className="font-mono text-micro text-t4">{anomaly.timestamp}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge color={anomaly.status === "resolved" ? K.mint : anomaly.status === "acknowledged" ? K.blue : K.warn}>{anomaly.status}</Badge>
                  {(anomaly.status === "open" || anomaly.status === "detected") && (
                    <Button size="xs" variant="ghost" loading={busy === anomaly.id} onClick={() => updateAnomaly(anomaly.id, "acknowledge")}>Acknowledge</Button>
                  )}
                  {anomaly.status !== "resolved" && (
                    <Button size="xs" variant="secondary" loading={busy === anomaly.id} onClick={() => updateAnomaly(anomaly.id, "resolve")}>Resolve</Button>
                  )}
                  {anomaly.status === "resolved" && (
                    <Button size="xs" variant="ghost" loading={busy === anomaly.id} onClick={() => updateAnomaly(anomaly.id, "reopen")}>Reopen</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card accent={K.blue}>
            <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Detection Rules</h3>
            {anomalies.length === 0 ? (
              <p className="font-mono text-caption text-t3 py-4 text-center">No detection rules triggered yet.</p>
            ) : (
              (() => {
                const typeCounts = new Map<string, number>();
                anomalies.forEach(a => { typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1); });
                return Array.from(typeCounts.entries()).map(([type, count], i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-g800">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-kmint" />
                      <span className="font-mono text-caption text-t1">{type}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-caption text-t3">{count} detections</span>
                      <Badge color={K.mint}>Active</Badge>
                    </div>
                  </div>
                ));
              })()
            )}
          </Card>

          <Card accent={K.teal}>
            <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Severity Distribution</h3>
            {[
              { label: "Critical", count: anomalies.filter(a => a.severity === "critical").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "critical").length / anomalies.length) * 100) : 0, color: K.danger },
              { label: "High", count: anomalies.filter(a => a.severity === "high").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "high").length / anomalies.length) * 100) : 0, color: K.warn },
              { label: "Medium", count: anomalies.filter(a => a.severity === "medium").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "medium").length / anomalies.length) * 100) : 0, color: K.gold },
              { label: "Low", count: anomalies.filter(a => a.severity === "low").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "low").length / anomalies.length) * 100) : 0, color: K.t3 },
              { label: "Resolved", count: anomalies.filter(a => a.status === "resolved").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.status === "resolved").length / anomalies.length) * 100) : 0, color: K.mint },
            ].map(s => (
              <div key={s.label} className="mb-2.5">
                <div className="flex justify-between mb-[3px]">
                  <span className="font-mono text-caption text-t2">{s.label}</span>
                  <span className="font-mono text-caption font-bold text-t1">{s.count}</span>
                </div>
                <ProgressBar value={s.pct} color={s.color} height={3} label={`${s.label} share`} />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

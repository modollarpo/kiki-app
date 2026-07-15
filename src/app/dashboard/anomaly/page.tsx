"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

export default function AnomalyDetectionPage() {
  const { data, loading } = useInsights();
  const anomalies = (data?.anomaly ?? []).map((a: any) => ({
    id: a.id,
    type: a.description ?? a.type,
    campaign: a.campaign_name ?? "Platform",
    severity: a.severity ?? "medium",
    change: a.deviation != null ? `${a.deviation >= 0 ? "+" : ""}${Math.round((a.deviation ?? 0) * 100)}%` : "—",
    timestamp: a.timestamp ? new Date(a.timestamp).toLocaleString() : "—",
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
      <div style={{ padding: "24px 28px", maxWidth: 1400, color: K.t1 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Anomaly Detection</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>AI-powered monitoring of campaign performance anomalies</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Active Anomalies" value={loading ? "…" : String(anomalies.filter(a => a.status === "investigating").length)} accent={K.danger} sub={`${anomalies.length} total flagged`} />
          <StatCard label="Critical" value={loading ? "…" : String(anomalies.filter(a => a.severity === "critical").length)} accent={K.warn} sub="Require action" />
          <StatCard label="Detection Score" value="94.7%" accent={K.blue} sub="AI model accuracy" />
          <StatCard label="High Severity" value={loading ? "…" : String(anomalies.filter(a => a.severity === "high").length)} accent={K.teal} sub="Under review" />
        </div>

        <Card accent={K.warn} style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Recent Anomalies</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {anomalies.map((anomaly, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: K.g900, borderRadius: 2, borderLeft: `3px solid ${getSeverityColor(anomaly.severity)}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Badge color={getSeverityColor(anomaly.severity)} dot>{anomaly.severity}</Badge>
                    <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>{anomaly.type}</span>
                    <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>#{anomaly.id}</span>
                  </div>
                  <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{anomaly.campaign}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: K.mono, fontSize: 13, fontWeight: 700, color: getSeverityColor(anomaly.severity) }}>{anomaly.change}</p>
                  <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{anomaly.timestamp}</p>
                </div>
                <Badge color={anomaly.status === "investigating" ? K.warn : K.mint}>{anomaly.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card accent={K.blue}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Detection Rules</h3>
            {[
              { name: "CTR Deviation (>3σ)", status: "active", detections: 47 },
              { name: "Spend Velocity", status: "active", detections: 23 },
              { name: "Conversion Rate Drop", status: "active", detections: 15 },
              { name: "CPM Spike Detection", status: "active", detections: 8 },
            ].map((rule, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${K.g800}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: K.mint }} />
                  <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t1 }}>{rule.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{rule.detections} detections</span>
                  <Badge color={K.mint}>Active</Badge>
                </div>
              </div>
            ))}
          </Card>

          <Card accent={K.teal}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Severity Distribution</h3>
            {[
              { label: "Critical", count: anomalies.filter(a => a.severity === "critical").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "critical").length / anomalies.length) * 100) : 0, color: K.danger },
              { label: "High", count: anomalies.filter(a => a.severity === "high").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "high").length / anomalies.length) * 100) : 0, color: K.warn },
              { label: "Medium", count: anomalies.filter(a => a.severity === "medium").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "medium").length / anomalies.length) * 100) : 0, color: K.gold },
              { label: "Low", count: anomalies.filter(a => a.severity === "low").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.severity === "low").length / anomalies.length) * 100) : 0, color: K.t3 },
              { label: "Resolved", count: anomalies.filter(a => a.status === "resolved").length, pct: anomalies.length ? Math.round((anomalies.filter(a => a.status === "resolved").length / anomalies.length) * 100) : 0, color: K.mint },
            ].map(s => (
              <div key={s.label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t2 }}>{s.label}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 10, fontWeight: 700, color: K.t1 }}>{s.count}</span>
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

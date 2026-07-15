"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, Button, StatusBadge, AIThinking } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

export default function WarehousePage() {
  const { data, loading } = useInsights();
  const features = data?.warehouse || [];

  const totalRows = features.reduce((s: number, f: any) => s + (f.samples || 0), 0);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Feature Store & Data Warehouse</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Feature snapshots · Model training data · Sync status</p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <AIThinking text="Loading feature store..." />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Feature Snapshots" value={String(features.length)} accent={K.blue} />
              <StatCard label="Total Samples" value={fmt.compact(totalRows)} accent={K.mint} />
              <StatCard label="Feature Store" value={features.length > 0 ? "ACTIVE" : "EMPTY"} accent={K.teal} />
              <StatCard label="Last Sync" value={features.length > 0 ? new Date(features[0].updated).toLocaleTimeString() : "—"} accent={K.gold} />
            </div>

            {features.length === 0 ? (
              <Card>
                <div style={{ padding: 40, textAlign: "center" }}>
                  <p style={{ fontFamily: K.mono, fontSize: 12, color: K.t4, marginBottom: 12 }}>No feature snapshots yet. Run the LTV training engine to populate the feature store.</p>
                  <Button variant="primary" size="sm" onClick={() => { fetch("/api/ltv/training", { method: "POST", headers: { "Content-Type": "application/json" } }).then(() => location.reload()); }}>Train Model →</Button>
                </div>
              </Card>
            ) : (
              <Card accent={K.teal}>
                <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Feature Store ({features.length})</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Feature", "Value", "Samples", "Mean", "Std Dev", "Updated"].map(h => (
                          <th key={h} style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4, textTransform: "uppercase", textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${K.g800}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((f: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1, padding: "10px 12px", borderBottom: `1px solid ${K.g800}` }}>{f.name}</td>
                          <td style={{ fontFamily: K.mono, fontSize: 11, color: K.t2, padding: "10px 12px", borderBottom: `1px solid ${K.g800}` }}>{f.value?.toFixed?.(2) ?? f.value}</td>
                          <td style={{ fontFamily: K.mono, fontSize: 11, color: K.t2, padding: "10px 12px", borderBottom: `1px solid ${K.g800}` }}>{fmt.compact(f.samples)}</td>
                          <td style={{ fontFamily: K.mono, fontSize: 11, color: K.t2, padding: "10px 12px", borderBottom: `1px solid ${K.g800}` }}>{f.mean?.toFixed?.(2) ?? "—"}</td>
                          <td style={{ fontFamily: K.mono, fontSize: 11, color: K.t2, padding: "10px 12px", borderBottom: `1px solid ${K.g800}` }}>{f.stddev?.toFixed?.(2) ?? "—"}</td>
                          <td style={{ fontFamily: K.mono, fontSize: 11, color: K.t3, padding: "10px 12px", borderBottom: `1px solid ${K.g800}` }}>{new Date(f.updated).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Button, AIThinking, ScrollableTable } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { useState } from "react";

export default function WarehousePage() {
  const { addToast } = useKikiStore();
  const { token } = useAuth();
  const { data, loading } = useInsights();
  const [training, setTraining] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const exportData = async (format: "csv" | "json") => {
    if (!token) return;
    setExporting(format);
    try {
      const res = await fetch(`/api/warehouse?export=${format}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feature-store-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast("success", `Feature store exported as ${format.toUpperCase()}`);
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const trainModel = async () => {
    if (!token) return;
    setTraining(true);
    try {
      const res = await fetch("/api/ltv/training", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.error || "Training failed");
      addToast("success", "LTV model training started");
    } catch (e) {
      addToast("error", e instanceof Error && e.message ? e.message : "Training failed");
    } finally {
      setTraining(false);
    }
  };
  const features = data?.warehouse || [];

  const lastUpdatedMs = features.length > 0
    ? Math.max(...features.map((f: { updated: string }) => new Date(f.updated).getTime()))
    : NaN;
  const lastUpdated = Number.isFinite(lastUpdatedMs) ? new Date(lastUpdatedMs).toLocaleString() : "—";

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Feature Store & Data Warehouse</h1>
            <p className="font-mono text-caption text-t3">Feature snapshots · Model training data · Sync status</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" loading={exporting === "csv"} disabled={features.length === 0} onClick={() => exportData("csv")}>Export CSV</Button>
            <Button size="sm" variant="secondary" loading={exporting === "json"} disabled={features.length === 0} onClick={() => exportData("json")}>Export JSON</Button>
            <Button size="sm" variant="secondary" loading={training} onClick={trainModel}>Train Model</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-15">
            <AIThinking text="Loading feature store..." />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <StatCard label="Recent Features" value={String(features.length)} accent={K.blue} sub="Latest snapshots" />
              <StatCard label="Feature Store" value={features.length > 0 ? "ACTIVE" : "EMPTY"} accent={K.teal} />
              <StatCard label="Last Updated" value={lastUpdated} accent={K.gold} />
            </div>

            {features.length === 0 ? (
              <Card>
                <div className="p-10 text-center">
                  <p className="font-mono text-xs text-t4 mb-3">No feature snapshots yet. Run the LTV training engine to populate the feature store.</p>
                  <Button variant="primary" size="sm" onClick={() => { fetch("/api/ltv/training", { method: "POST", headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }).then(() => location.reload()); }}>Train Model →</Button>
                </div>
              </Card>
            ) : (
              <Card accent={K.teal}>
                <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Feature Store ({features.length})</h3>
                <ScrollableTable>
                  <table className="w-full border-collapse min-w-[600px]">
                    <thead>
                      <tr>
                        {["Feature", "Value", "Samples", "Mean", "Std Dev", "Updated"].map(h => (
                          <th key={h} className="font-mono text-micro tracking-[0.1em] uppercase text-left py-2 px-3 text-t4 border-b border-g800">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((f: { name: string; value: string; samples: number; mean: number | null; stddev: number | null; updated: string }, i: number) => (
                        <tr key={i}>
                          <td className="font-mono text-caption font-semibold text-t1 py-2.5 px-3 border-b border-g800">{f.name}</td>
                          <td className="font-mono text-caption text-t2 py-2.5 px-3 border-b border-g800">{f.value ?? "—"}</td>
                          <td className="font-mono text-caption text-t2 py-2.5 px-3 border-b border-g800">{fmt.compact(f.samples)}</td>
                          <td className="font-mono text-caption text-t2 py-2.5 px-3 border-b border-g800">{f.mean?.toFixed?.(2) ?? "—"}</td>
                          <td className="font-mono text-caption text-t2 py-2.5 px-3 border-b border-g800">{f.stddev?.toFixed?.(2) ?? "—"}</td>
                          <td className="font-mono text-caption text-t3 py-2.5 px-3 border-b border-g800">{new Date(f.updated).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";

interface ReportExport {
  id: string;
  name: string;
  type: string;
  format: string;
  status: string;
  rowCount: number;
  createdAt: string;
}

type ReportType =
  | "executive"
  | "campaign_performance"
  | "financial"
  | "agent_activity"
  | "competitive"
  | "compliance"
  | "usage_summary"
  | "custom";

export default function ReportsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"exports" | "templates">("exports");
  const [exports, setExports] = useState<ReportExport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderType, setBuilderType] = useState<ReportType>("executive");
  const [builderFormat, setBuilderFormat] = useState<"csv" | "json">("csv");
  const [generating, setGenerating] = useState<string | null>(null);
  const addToast = useKikiStore(s => s.addToast);

  const loadReports = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/reports", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed to load reports");
      const d = await r.json();
      if (d?.data) {
        setExports(d.data.exports ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const generate = async (type: ReportType, format: "csv" | "json", name?: string) => {
    if (!token) return;
    const key = `${type}:${format}`;
    setGenerating(key);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "generate", type, format, name }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to generate report");
      await loadReports();
      setShowBuilder(false);
      addToast("success", `${result.name} generated (${result.rowCount} rows)`);
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  const downloadExport = async (exp: ReportExport) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/reports?download=${encodeURIComponent(exp.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exp.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${exp.id}.${exp.format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Download failed");
    }
  };

  const deleteExport = async (id: string) => {
    if (!token || !confirm("Delete this export?")) return;
    try {
      const res = await fetch(`/api/reports?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Delete failed");
      await loadReports();
      addToast("success", "Export deleted");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Delete failed");
    }
  };

  const templates: Array<{ id: ReportType; name: string; desc: string; icon: string; color: string }> = [
    { id: "executive", name: "Executive Dashboard", desc: "High-level KPIs, revenue, and ROAS for leadership", icon: "◈", color: K.gold },
    { id: "campaign_performance", name: "Campaign Performance", desc: "Detailed per-campaign metrics with channel breakdown", icon: "⬡", color: K.blue },
    { id: "financial", name: "Financial P&L", desc: "Revenue, costs, margins, and month-over-month trends", icon: "▣", color: K.mint },
    { id: "agent_activity", name: "Agent Activity Log", desc: "All AI agent decisions, actions, and performance", icon: "◎", color: K.teal },
    { id: "competitive", name: "Competitive Analysis", desc: "Competitor benchmarks and share of voice", icon: "◉", color: K.oaas },
    { id: "compliance", name: "Compliance Audit", desc: "KYC entity verification and document coverage", icon: "✓", color: K.warn },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex justify-between items-start mb-5 gap-3 flex-wrap">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Reports</h1>
            <p className="font-mono text-caption text-t3">Recent exports · Report builder</p>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 p-[3px] rounded-sm" style={{ background: K.g900, border: `1px solid ${K.g800}` }}>
              {(["exports", "templates"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="font-mono text-caption font-semibold tracking-widest px-3.5 py-[5px] rounded-sm cursor-pointer uppercase"
                  style={{ color: tab === t ? K.t1 : K.t4, background: tab === t ? K.g800 : "transparent", border: "none" }}>
                  {t}
                </button>
              ))}
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowBuilder(v => !v)}>{showBuilder ? "Close" : "+ New Report"}</Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-caption" style={{ color: K.tDanger }}>{error}</p>
          </div>
        )}

        {showBuilder && (
          <Card className="mb-4">
            <h2 className="font-mono font-bold text-small text-t1 mb-3">Build a Report</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label htmlFor="report-type" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">REPORT</label>
                <select id="report-type" value={builderType} onChange={e => setBuilderType(e.target.value as ReportType)} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  <option value="usage_summary">Usage Summary</option>
                  <option value="custom">Custom (all campaigns)</option>
                </select>
              </div>
              <div>
                <label htmlFor="report-format" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">FORMAT</label>
                <select id="report-format" value={builderFormat} onChange={e => setBuilderFormat(e.target.value === "json" ? "json" : "csv")} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button size="sm" loading={generating === `${builderType}:${builderFormat}`} onClick={() => generate(builderType, builderFormat)}>Generate Export</Button>
              </div>
            </div>
          </Card>
        )}

        {tab === "exports" && (
          <>
            <Card>
              <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${K.g800}` }}>
                <h2 className="font-mono font-bold text-small text-t1 flex items-center gap-2">Recent Exports</h2>
              </div>
              {loading ? (
                <div className="px-5 py-8 text-center"><span className="font-mono text-caption text-t3">Loading exports…</span></div>
              ) : exports.length === 0 ? (
                <div className="px-5 py-8 text-center"><span className="font-mono text-caption text-t3">No exports yet. Generate a report to see it here.</span></div>
              ) : (
                exports.map((e, i) => (
                  <div key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 hover:bg-[var(--card-hover)]"
                    style={{ borderBottom: i < exports.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                    <div className="page-header-actions">
                      <Badge color={e.format === "json" ? K.teal : K.blue}>{e.format.toUpperCase()}</Badge>
                      <span className="font-mono text-caption font-semibold text-t1">{e.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-mono text-caption text-t4">{new Date(e.createdAt).toLocaleString()}</span>
                      <span className="font-mono text-caption text-t3">{e.rowCount} rows</span>
                      <Badge color={K.mint}>{e.status.toUpperCase()}</Badge>
                      <Button variant="ghost" size="xs" onClick={() => downloadExport(e)}>Download ↓</Button>
                      <Button variant="ghost" size="xs" onClick={() => deleteExport(e.id)} style={{ color: K.danger }}>Delete</Button>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </>
        )}

        {tab === "templates" && (
          <div>
            <p className="font-mono text-caption text-t3 mb-4">Choose a template to build a new report</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t, i) => (
                <Card key={i} accent={t.color} hover onClick={() => generate(t.id, "csv")} className="cursor-pointer">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className="text-xl" style={{ color: t.color }}>{t.icon}</span>
                    <h3 className="font-mono font-bold text-xs text-t1">{t.name}</h3>
                  </div>
                  <p className="font-sans text-caption text-t3 leading-relaxed">{t.desc}</p>
                  <div className="mt-3">
                    <Button variant="secondary" size="xs" loading={generating === `${t.id}:csv`} onClick={(e) => { e.stopPropagation(); generate(t.id, "csv"); }}>Generate CSV →</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

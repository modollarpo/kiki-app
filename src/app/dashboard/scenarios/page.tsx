"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, Button } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { useRouter } from "next/navigation";

interface Scenario {
  id: string; name: string; description: string; budgetChange: number;
  projectedRevenue: number; projectedRoas: number; risk: string; confidence: number | null;
  saved?: boolean; status?: string;
}

export default function ScenariosPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState(10);
  const [newRisk, setNewRisk] = useState("medium");
  const [newDesc, setNewDesc] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const addToast = useKikiStore(s => s.addToast);

  const loadScenarios = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/scenarios", { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => null);
      if (d?.ok && Array.isArray(d.data?.scenarios)) {
        setScenarios(d.data.scenarios);
        setSelected(prev => prev || d.data.scenarios[0]?.id || "");
      } else if (d?.error) {
        setError(d.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scenarios");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleCreate = async () => {
    if (!token) return;
    if (!newName.trim()) { addToast("error", "Scenario name is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "save", name: newName.trim(), budgetChange: newBudget, risk: newRisk, description: newDesc.trim() }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to save scenario");
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      await loadScenarios();
      addToast("success", "Scenario saved");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to save scenario");
    } finally {
      setCreating(false);
    }
  };

  const handleApply = async (sc: Scenario) => {
    if (!token || !sc.saved) return;
    if (!confirm(`Apply "${sc.name}"? Active campaign budgets will be adjusted by ${sc.budgetChange > 0 ? "+" : ""}${sc.budgetChange}%.`)) return;
    setBusy(sc.id);
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "apply", id: sc.id }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to apply scenario");
      await loadScenarios();
      addToast("success", `Applied to ${result.data?.campaignsUpdated ?? 0} campaigns`);
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to apply scenario");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (sc: Scenario) => {
    if (!token || !sc.saved) return;
    if (!confirm(`Delete scenario "${sc.name}"?`)) return;
    setBusy(sc.id);
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", id: sc.id }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to delete scenario");
      await loadScenarios();
      addToast("success", "Scenario deleted");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to delete scenario");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!token) { router.push("/auth/login"); return; }
    loadScenarios();
  }, [token, router, loadScenarios]);

  const getRiskColor = (risk: string) => risk === "high" ? K.danger : risk === "medium" ? K.warn : K.mint;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Scenario Planner</h1>
            <p className="font-mono text-caption text-t3">Budget allocation scenarios · Projected ROAS · Risk assessment</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowCreate(v => !v)}>{showCreate ? "Close" : "+ New Scenario"}</Button>
        </div>

        {showCreate && (
          <Card className="mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label htmlFor="scn-name" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">NAME</label>
                <input id="scn-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Aggressive Q4 scale" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
              </div>
              <div>
                <label htmlFor="scn-budget" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">BUDGET CHANGE (%)</label>
                <input id="scn-budget" type="number" min={-100} max={500} value={newBudget} onChange={e => setNewBudget(Number(e.target.value))} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
              </div>
              <div>
                <label htmlFor="scn-risk" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">RISK</label>
                <select id="scn-risk" value={newRisk} onChange={e => setNewRisk(e.target.value)} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                  {["low", "medium", "high"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <label htmlFor="scn-desc" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">DESCRIPTION (OPTIONAL)</label>
            <input id="scn-desc" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue mb-3" />
            <Button size="sm" loading={creating} onClick={handleCreate}>Save Scenario</Button>
          </Card>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-caption" style={{ color: K.tDanger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Scenarios" value={scenarios.length > 0 ? String(scenarios.length) : "—"} accent={K.blue} loading={loading} />
          <StatCard label="Best Projected ROAS" value={scenarios.length > 0 ? `${Math.max(...scenarios.map(s => s.projectedRoas))}×` : "—"} accent={K.mint} sub="Highest return" loading={loading} />
          <StatCard label="Avg Confidence" value={scenarios.some(s => s.confidence != null) ? `${Math.round(scenarios.reduce((s, sc) => s + (sc.confidence ?? 0), 0) / scenarios.length)}%` : "—"} accent={K.teal} loading={loading} />
          <StatCard label="Total Projected Revenue" value={scenarios.length > 0 ? fmt.currency(scenarios.reduce((s, sc) => s + sc.projectedRevenue, 0)) : "—"} accent={K.gold} loading={loading} />
        </div>

        <div className="flex flex-col gap-3">
          {scenarios.map(sc => (
            <Card
              key={sc.id}
              accent={selected === sc.id ? K.blue : undefined}
              glow={selected === sc.id ? K.blue : undefined}
              hover
              onClick={() => setSelected(sc.id)}
              style={{ border: selected === sc.id ? `1px solid ${K.blue}60` : undefined }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-sm font-bold text-t1">{sc.name}</span>
                    <Badge color={getRiskColor(sc.risk)}>{sc.risk.toUpperCase()} RISK</Badge>
                    <Badge color={sc.confidence != null ? K.t3 : K.warn}>{sc.confidence != null ? `${sc.confidence}% CONF` : "NO MODEL"}</Badge>
                    {sc.saved && <Badge color={sc.status === "applied" ? K.mint : K.blue}>{sc.status === "applied" ? "APPLIED" : "SAVED"}</Badge>}
                  </div>
                  <p className="font-mono text-caption text-t3 mb-3">{sc.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                    <div>
                      <p className="font-mono text-caption text-t4 mb-0.5">BUDGET CHANGE</p>
                      <p className="font-mono text-small font-bold" style={{ color: sc.budgetChange > 0 ? K.mint : sc.budgetChange < 0 ? K.danger : K.t2 }}>{sc.budgetChange > 0 ? "+" : ""}{sc.budgetChange}%</p>
                    </div>
                    <div>
                      <p className="font-mono text-caption text-t4 mb-0.5">PROJECTED ROAS</p>
                      <p className="font-mono text-small font-bold text-kmint">{sc.projectedRoas}×</p>
                    </div>
                    <div>
                      <p className="font-mono text-caption text-t4 mb-0.5">PROJECTED REVENUE</p>
                      <p className="font-mono text-small font-bold text-t1">{fmt.currency(sc.projectedRevenue)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-caption text-t4 mb-0.5">CONFIDENCE</p>
                      <p className="font-mono text-small font-bold text-kblue">{sc.confidence != null ? `${sc.confidence}%` : "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {selected === sc.id
                    ? <Badge color={K.blue}>Selected</Badge>
                    : <Button variant="secondary" size="sm" onClick={() => setSelected(sc.id)}>Select</Button>}
                  {sc.saved && sc.status !== "applied" && (
                    <Button size="sm" loading={busy === sc.id} onClick={() => handleApply(sc)}>Apply</Button>
                  )}
                  {sc.saved && (
                    <Button variant="ghost" size="sm" loading={busy === sc.id} onClick={() => handleDelete(sc)}>Delete</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

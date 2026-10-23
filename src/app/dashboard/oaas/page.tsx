"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, Button, ProgressBar } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";

const TASK_TYPE_COLORS: Record<string, string> = {
  budget: K.gold, creative: K.oaas, scheduling: K.teal, audience: K.blue, bidding: K.mint,
};

interface OaasTask {
  id: string;
  title: string;
  agent: string;
  type: string;
  status: string;
  expectedImpact: number | null;
  confidence: number | null;
  createdAt: string;
  details: string | null;
}

export default function OaasPage() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<OaasTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("budget");
  const [newDetails, setNewDetails] = useState("");
  const [creating, setCreating] = useState(false);
  const addToast = useKikiStore(s => s.addToast);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/oaas", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setTasks(d.tasks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (taskId: string, action: "approve" | "reject" | "cancel") => {
    if (!token) return;
    setBusy(taskId);
    try {
      const res = await fetch("/api/oaas", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: taskId, action }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Action failed");
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: result.status } : t
      ));
      addToast("success", action === "approve" ? "Task approved" : action === "reject" ? "Task rejected" : "Task cancelled");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = async () => {
    if (!token) return;
    if (!newTitle.trim()) { addToast("error", "Task title is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/oaas", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create", title: newTitle.trim(), type: newType, details: newDetails.trim() || undefined }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to create task");
      setTasks(prev => [{
        id: result.id,
        title: result.title,
        agent: result.agent,
        type: result.type,
        status: "pending",
        expectedImpact: null,
        confidence: null,
        createdAt: new Date().toISOString(),
        details: result.details || null,
      }, ...prev]);
      setNewTitle("");
      setNewDetails("");
      setShowCreate(false);
      addToast("success", "Task created");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const allTasks = tasks;
  const pending = allTasks.filter(t => t.status === "pending");
  const approved = allTasks.filter(t => t.status === "approved");
  const completed = allTasks.filter(t => t.status === "completed");

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">OaaS Tasks</h1>
            <p className="font-mono text-caption text-t3">Optimization-as-a-Service · Agent-generated tasks · Approval workflow</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowCreate(v => !v)}>{showCreate ? "Close" : "+ New Task"}</Button>
        </div>

        {showCreate && (
          <Card className="mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label htmlFor="oaas-title" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">TITLE</label>
                <input id="oaas-title" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Refresh creative for Q4 campaign" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
              </div>
              <div>
                <label htmlFor="oaas-type" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">TYPE</label>
                <select id="oaas-type" value={newType} onChange={e => setNewType(e.target.value)} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                  {["budget", "creative", "scheduling", "audience", "bidding"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <label htmlFor="oaas-details" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">DETAILS (OPTIONAL)</label>
            <textarea id="oaas-details" value={newDetails} onChange={e => setNewDetails(e.target.value)} rows={2} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-2 font-mono text-caption text-t1 outline-none focus:border-kblue mb-3" />
            <Button size="sm" loading={creating} onClick={handleCreate}>Create Task</Button>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Pending Review" value={loading ? "…" : String(pending.length)} accent={K.warn} />
          <StatCard label="Approved" value={loading ? "…" : String(approved.length)} accent={K.blue} />
          <StatCard label="Completed" value={loading ? "…" : String(completed.length)} accent={K.mint} />
          <StatCard label="Total Tasks" value={loading ? "…" : String(allTasks.length)} accent={K.gold} sub="Generated from campaigns" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="flex flex-col gap-2.5">
            <h3 className="font-mono text-caption tracking-[0.12em] uppercase text-t4 mb-1">Pending Review ({pending.length})</h3>
            {pending.map(task => (
              <Card key={task.id} accent={TASK_TYPE_COLORS[task.type]}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Badge color={TASK_TYPE_COLORS[task.type]}>{task.type.toUpperCase()}</Badge>
                      <Badge color={K.warn} dot>PENDING</Badge>
                    </div>
                    <p className="font-mono text-xs font-bold text-t1 mb-1">{task.title}</p>
                    <p className="font-mono text-caption text-t3 mb-2">{task.details}</p>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-mono text-caption text-t4">Agent: <span className="text-t2">{task.agent}</span></span>
                      <span className="font-mono text-caption text-t4">Impact: <span className="font-bold text-kmint">{task.expectedImpact ?? "—"}</span></span>
                      <span className="font-mono text-caption text-t4">Confidence: <span className="text-kblue">{task.confidence != null ? `${task.confidence}%` : "—"}</span></span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={task.confidence ?? 0} max={100} color={K.blue} height={3} label="Task confidence" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button variant="mint" size="xs" loading={busy === task.id} onClick={() => handleAction(task.id, "approve")}>Approve</Button>
                    <Button variant="ghost" size="xs" loading={busy === task.id} onClick={() => handleAction(task.id, "reject")}>Reject</Button>
                    <Button variant="ghost" size="xs" loading={busy === task.id} onClick={() => handleAction(task.id, "cancel")}>Cancel</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="font-mono text-caption tracking-[0.12em] uppercase text-t4 mb-1">Approved ({approved.length})</h3>
            {approved.map(task => (
              <Card key={task.id}>
                <div className="flex items-center gap-2.5">
                  <Badge color={K.blue} dot>APPROVED</Badge>
                  <div className="flex-1">
                    <p className="font-mono text-caption font-semibold text-t1">{task.title}</p>
                    <p className="font-mono text-caption text-t3">{task.agent} · {task.expectedImpact ?? "no projected impact"}</p>
                  </div>
                  <span className="font-mono text-caption text-t4">{task.createdAt}</span>
                </div>
              </Card>
            ))}

            <h3 className="font-mono text-caption tracking-[0.12em] uppercase text-t4 mt-2 mb-1">Completed ({completed.length})</h3>
            {completed.map(task => (
              <Card key={task.id}>
                <div className="flex items-center gap-2.5">
                  <Badge color={K.mint} dot>DONE</Badge>
                  <div className="flex-1">
                    <p className="font-mono text-caption font-semibold text-t1">{task.title}</p>
                    <p className="font-mono text-caption text-t3">{task.agent} · {task.expectedImpact ?? "no projected impact"}</p>
                  </div>
                  <span className="font-mono text-caption text-t4">{task.createdAt}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

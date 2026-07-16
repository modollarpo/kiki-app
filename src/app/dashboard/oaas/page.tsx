"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, Button, ProgressBar } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";

const TASK_TYPE_COLORS: Record<string, string> = {
  budget: K.gold, creative: K.oaas, scheduling: K.teal, audience: K.blue, bidding: K.mint,
};

export default function OaasPage() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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

  const handleAction = async (taskId: string, action: "approve" | "reject") => {
    setBusy(taskId);
    try {
      await fetch("/api/oaas", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: taskId, action }),
      });
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: action === "approve" ? "approved" : "rejected" } : t
      ));
    } finally {
      setBusy(null);
    }
  };

  const allTasks = tasks;
  const pending = allTasks.filter(t => t.status === "pending");
  const approved = allTasks.filter(t => t.status === "approved");
  const completed = allTasks.filter(t => t.status === "completed");

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">OaaS Tasks</h1>
          <p className="font-mono text-[11px] text-gray-500">Optimization-as-a-Service · Agent-generated tasks · Approval workflow</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Pending Review" value={loading ? "…" : String(pending.length)} accent={K.warn} />
          <StatCard label="Approved Today" value={loading ? "…" : String(approved.length)} accent={K.blue} />
          <StatCard label="Completed Today" value={loading ? "…" : String(completed.length)} accent={K.mint} />
          <StatCard label="Generated Tasks" value={loading ? "…" : String(allTasks.length)} accent={K.gold} sub="from live campaigns" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-2.5">
            <h3 className="font-mono text-[11px] tracking-[0.12em] uppercase text-gray-600 mb-1">Pending Review ({pending.length})</h3>
            {pending.map(task => (
              <Card key={task.id} accent={TASK_TYPE_COLORS[task.type]}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Badge color={TASK_TYPE_COLORS[task.type]}>{task.type.toUpperCase()}</Badge>
                      <Badge color={K.warn} dot>PENDING</Badge>
                    </div>
                    <p className="font-mono text-xs font-bold text-white mb-1">{task.title}</p>
                    <p className="font-mono text-[10px] text-gray-500 mb-2">{task.details}</p>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[10px] text-gray-600">Agent: <span className="text-gray-400">{task.agent}</span></span>
                      <span className="font-mono text-[10px] text-gray-600">Impact: <span className="font-bold text-kmint">{task.expectedImpact}</span></span>
                      <span className="font-mono text-[10px] text-gray-600">Confidence: <span className="text-kblue">{task.confidence}%</span></span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={task.confidence} max={100} color={K.blue} height={3} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button variant="mint" size="xs" onClick={() => handleAction(task.id, "approve")}>Approve</Button>
                    <Button variant="ghost" size="xs" onClick={() => handleAction(task.id, "reject")}>Reject</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="font-mono text-[11px] tracking-[0.12em] uppercase text-gray-600 mb-1">In Progress ({approved.length})</h3>
            {approved.map(task => (
              <Card key={task.id}>
                <div className="flex items-center gap-2.5">
                  <Badge color={K.blue} dot>APPROVED</Badge>
                  <div className="flex-1">
                    <p className="font-mono text-[11px] font-semibold text-white">{task.title}</p>
                    <p className="font-mono text-[10px] text-gray-500">{task.agent} · {task.expectedImpact}</p>
                  </div>
                  <span className="font-mono text-[10px] text-gray-600">{task.createdAt}</span>
                </div>
              </Card>
            ))}

            <h3 className="font-mono text-[11px] tracking-[0.12em] uppercase text-gray-600 mt-2 mb-1">Completed ({completed.length})</h3>
            {completed.map(task => (
              <Card key={task.id}>
                <div className="flex items-center gap-2.5">
                  <Badge color={K.mint} dot>DONE</Badge>
                  <div className="flex-1">
                    <p className="font-mono text-[11px] font-semibold text-white">{task.title}</p>
                    <p className="font-mono text-[10px] text-gray-500">{task.agent} · {task.expectedImpact}</p>
                  </div>
                  <span className="font-mono text-[10px] text-gray-600">{task.createdAt}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

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
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>OaaS Tasks</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Optimization-as-a-Service · Agent-generated tasks · Approval workflow</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Pending Review" value={loading ? "…" : String(pending.length)} accent={K.warn} />
          <StatCard label="Approved Today" value={loading ? "…" : String(approved.length)} accent={K.blue} />
          <StatCard label="Completed Today" value={loading ? "…" : String(completed.length)} accent={K.mint} />
          <StatCard label="Generated Tasks" value={loading ? "…" : String(allTasks.length)} accent={K.gold} sub="from live campaigns" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ fontFamily: K.mono, fontSize: 11, letterSpacing: "0.12em", color: K.t4, textTransform: "uppercase", marginBottom: 4 }}>Pending Review ({pending.length})</h3>
            {pending.map(task => (
              <Card key={task.id} accent={TASK_TYPE_COLORS[task.type]}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <Badge color={TASK_TYPE_COLORS[task.type]}>{task.type.toUpperCase()}</Badge>
                      <Badge color={K.warn} dot>PENDING</Badge>
                    </div>
                    <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1, marginBottom: 4 }}>{task.title}</p>
                    <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginBottom: 8 }}>{task.details}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>Agent: <span style={{ color: K.t2 }}>{task.agent}</span></span>
                      <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>Impact: <span style={{ color: K.mint, fontWeight: 700 }}>{task.expectedImpact}</span></span>
                      <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>Confidence: <span style={{ color: K.blue }}>{task.confidence}%</span></span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <ProgressBar value={task.confidence} max={100} color={K.blue} height={3} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <Button variant="mint" size="xs" onClick={() => handleAction(task.id, "approve")}>Approve</Button>
                    <Button variant="ghost" size="xs" onClick={() => handleAction(task.id, "reject")}>Reject</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ fontFamily: K.mono, fontSize: 11, letterSpacing: "0.12em", color: K.t4, textTransform: "uppercase", marginBottom: 4 }}>In Progress ({approved.length})</h3>
            {approved.map(task => (
              <Card key={task.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge color={K.blue} dot>APPROVED</Badge>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{task.title}</p>
                    <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{task.agent} · {task.expectedImpact}</p>
                  </div>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>{task.createdAt}</span>
                </div>
              </Card>
            ))}

            <h3 style={{ fontFamily: K.mono, fontSize: 11, letterSpacing: "0.12em", color: K.t4, textTransform: "uppercase", marginTop: 8, marginBottom: 4 }}>Completed ({completed.length})</h3>
            {completed.map(task => (
              <Card key={task.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge color={K.mint} dot>DONE</Badge>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{task.title}</p>
                    <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{task.agent} · {task.expectedImpact}</p>
                  </div>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>{task.createdAt}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

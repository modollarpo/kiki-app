"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";

interface WorkflowEvent {
  id: string; agentId: string | null; agentType: string | null;
  actionType: string; input: string; output: string;
  status: string; durationMs: number; createdAt: string;
}

export default function WorkflowPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/workflow", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) {
          setEvents(d.data.events ?? []);
          setTotal(d.data.total ?? 0);
        }
      })
      .catch((err) => { setError(err?.message || "Failed to load data"); setLoading(false); })
      .finally(() => setLoading(false));
  }, [token]);

  const allActions = events;

  const groupedByType = allActions.reduce<Record<string, WorkflowEvent[]>>((acc, a) => {
    const key = a.actionType ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const workflows = Object.entries(groupedByType).map(([actionType, items]) => {
    const successes = items.filter(i => i.status === "success").length;
    const errors = items.filter(i => i.status === "error").length;
    const latest = items[0];
    return {
      name: actionType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      description: `Automated ${actionType.replace(/_/g, " ")} actions performed by AI agents`,
      agent: latest?.agentType ?? "System",
      firesCount: items.length,
      successCount: successes,
      errorCount: errors,
      lastFired: latest?.createdAt ?? "Never",
      color: errors > 0 ? K.danger : successes > 5 ? K.mint : K.blue,
    };
  });

  const durations = allActions.filter(a => a.durationMs > 0);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((s, a) => s + a.durationMs, 0) / durations.length) : null;
  const isLoading = loading;

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex justify-between items-start mb-5 gap-3 flex-wrap">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Automation Activity</h1>
            <p className="font-mono text-caption text-t3">Automated agent actions grouped by type · {workflows.length} action types in recent log</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-caption" style={{ color: K.danger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {[{ label: "Action Types", value: `${workflows.length}`, color: K.mint },
            { label: "Total Actions", value: isLoading ? "…" : String(total), color: K.blue },
            { label: "Avg Duration", value: isLoading ? "…" : avgDuration != null ? `${avgDuration}ms` : "—", color: K.teal },
          ].map((s, i) => (
            <Card key={i} accent={s.color}>
              <p className="font-mono text-micro tracking-[0.14em] text-t4 mb-1.5">{s.label}</p>
              <p className="font-mono text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {isLoading ? (
            <Card><div className="py-8 text-center"><span className="font-mono text-caption text-t3">Loading workflows…</span></div></Card>
          ) : workflows.length === 0 ? (
            <Card><div className="py-8 text-center"><span className="font-mono text-caption text-t3">No workflows found. Agent actions will appear here once agents start running.</span></div></Card>
          ) : (
            workflows.map((wf, i) => (
              <Card key={i} accent={wf.color}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-mono font-bold text-small text-t1">{wf.name}</h3>
                    </div>
                    <p className="font-sans text-caption text-t3 leading-relaxed max-w-[600px]">{wf.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:flex-shrink-0">
                    <div className="text-right">
                      <p className="font-mono text-caption text-t4">Last fired</p>
                      <p className="font-mono text-caption font-semibold text-t2">
                        {wf.lastFired !== "Never" ? new Date(wf.lastFired).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-caption text-t4">Total fires</p>
                      <p className="font-mono text-caption font-bold" style={{ color: wf.color }}>{wf.firesCount}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-2.5 px-3 rounded-sm bg-g850">
                    <p className="font-mono text-micro tracking-[0.1em] text-t4 mb-1">AGENT</p>
                    <p className="font-mono text-caption text-kblue">{wf.agent}</p>
                  </div>
                  <div className="p-2.5 px-3 rounded-sm bg-g850">
                    <p className="font-mono text-micro tracking-[0.1em] text-t4 mb-1">SUCCESS</p>
                    <p className="font-mono text-caption text-kmint">{wf.successCount} of {wf.firesCount}</p>
                  </div>
                  <div className="p-2.5 px-3 rounded-sm bg-g850">
                    <p className="font-mono text-micro tracking-[0.1em] text-t4 mb-1">ERRORS</p>
                    <p className="font-mono text-caption" style={{ color: wf.errorCount > 0 ? K.danger : K.t4 }}>{wf.errorCount}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

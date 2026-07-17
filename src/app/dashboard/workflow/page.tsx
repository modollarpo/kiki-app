"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useInsights } from "@/hooks/useInsights";

interface WorkflowEvent {
  id: string; agentId: string | null; agentType: string | null;
  actionType: string; input: string; output: string;
  status: string; durationMs: number; createdAt: string;
}

export default function WorkflowPage() {
  const { token } = useAuth();
  const { data, loading: insightsLoading } = useInsights();
  const fires = data?.workflow?.length ?? 0;
  const budgetSaved = 0; // Savings page/feature has been deleted
  const workflowFromInsights = data?.workflow ?? [];
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/workflow", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) setEvents(d.data.events ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const allActions: WorkflowEvent[] = events.length > 0 ? events : workflowFromInsights.map((w: any, i: number): WorkflowEvent => ({
    id: `wf-${i}`,
    agentId: null,
    agentType: w.agent,
    actionType: w.action,
    input: typeof w.details === "string" ? w.details : JSON.stringify(w.details ?? ""),
    output: "",
    status: w.status ?? "success",
    durationMs: 0,
    createdAt: w.time,
  }));

  const groupedByType = allActions.reduce<Record<string, typeof allActions>>((acc, a) => {
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
      active: true,
      color: errors > 0 ? K.danger : successes > 5 ? K.mint : K.blue,
    };
  });

  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const filtered = filter === "all" ? workflows : filter === "active" ? workflows.filter(w => w.active) : workflows.filter(w => !w.active);
  const isLoading = loading || insightsLoading;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Automation Builder</h1>
            <p className="font-mono text-[11px] text-gray-500">Workflow rules · Trigger conditions · Automated actions · {workflows.length} active rules</p>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 p-[3px] rounded-sm bg-g900 border border-g800">
              {(["all", "active", "inactive"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="font-mono text-[10px] font-semibold tracking-wider px-3 py-[5px] rounded-sm cursor-pointer uppercase"
                  style={{ color: filter === f ? K.t1 : K.t4, background: filter === f ? K.g800 : "transparent", border: "none" }}>
                  {f}
                </button>
              ))}
            </div>
            <Button variant="primary" size="sm">+ New Rule</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[{ label: "Active Rules", value: `${workflows.length}`, color: K.mint },
            { label: "Triggered (30d)", value: isLoading ? "…" : String(fires), color: K.blue },
            { label: "Budget Saved", value: isLoading ? "…" : `$${Number(budgetSaved).toLocaleString()}`, color: K.gold },
            { label: "Avg Response Time", value: isLoading ? "…" : allActions.length > 0 ? `${Math.round(allActions.reduce((s, a) => s + (a.durationMs || 0), 0) / allActions.length)}ms` : "< 1 min", color: K.teal },
          ].map((s, i) => (
            <Card key={i} accent={s.color}>
              <p className="font-mono text-[10px] tracking-[0.14em] text-gray-600 mb-1.5">{s.label}</p>
              <p className="font-mono text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {isLoading ? (
            <Card><div className="py-8 text-center"><span className="font-mono text-[11px] text-gray-500">Loading workflows…</span></div></Card>
          ) : filtered.length === 0 ? (
            <Card><div className="py-8 text-center"><span className="font-mono text-[11px] text-gray-500">No workflows found. Agent actions will appear here once agents start running.</span></div></Card>
          ) : (
            filtered.map((wf, i) => (
              <Card key={i} accent={wf.color}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-mono font-bold text-[13px] text-white">{wf.name}</h3>
                      <Badge color={wf.active ? K.mint : K.t3} dot pulse={wf.active}>{wf.active ? "ACTIVE" : "PAUSED"}</Badge>
                    </div>
                    <p className="font-sans text-[11px] text-gray-500 leading-relaxed max-w-[600px]">{wf.description}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-mono text-[10px] text-gray-600">Last fired</p>
                      <p className="font-mono text-[11px] font-semibold text-gray-400">
                        {wf.lastFired !== "Never" ? new Date(wf.lastFired).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] text-gray-600">Total fires</p>
                      <p className="font-mono text-[11px] font-bold" style={{ color: wf.color }}>{wf.firesCount}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-2.5 px-3 rounded-sm bg-g850">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-gray-600 mb-1">AGENT</p>
                    <p className="font-mono text-[10px] text-kblue">{wf.agent}</p>
                  </div>
                  <div className="p-2.5 px-3 rounded-sm bg-g850">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-gray-600 mb-1">SUCCESS</p>
                    <p className="font-mono text-[10px] text-kmint">{wf.successCount} of {wf.firesCount}</p>
                  </div>
                  <div className="p-2.5 px-3 rounded-sm bg-g850">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-gray-600 mb-1">ERRORS</p>
                    <p className="font-mono text-[10px]" style={{ color: wf.errorCount > 0 ? K.danger : K.t4 }}>{wf.errorCount}</p>
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

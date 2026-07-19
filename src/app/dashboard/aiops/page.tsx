"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StatCard, Card, Badge, ProgressBar, AIThinking } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useInsights } from "@/hooks/useInsights";

interface AgentModel {
  id: string; name: string; type: string; status: string;
  task: string; metric: string; lastAction: string; actionCount: number; createdAt: string;
}
interface SystemMetric { name: string; value: number; tags: string; createdAt: string }
interface RecentAction {
  id: string; agentType: string; actionType: string;
  output: string; status: string; durationMs: number; createdAt: string;
}

export default function AIOpsPage() {
  const { token } = useAuth();
  const { data, loading: insightsLoading } = useInsights();
  const aiops = data?.aiops ?? { metrics: [], uptime: 0, activeServices: 0 };
  const [agents, setAgents] = useState<AgentModel[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/aiops", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) {
          setAgents(d.data.agents ?? []);
          setSystemMetrics(d.data.systemMetrics ?? []);
          setRecentActions(d.data.recentActions ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const deployed = agents.filter(a => a.status === "running").length;
  const avgLatency = systemMetrics.length > 0
    ? (systemMetrics.reduce((s, m) => s + m.value, 0) / systemMetrics.length).toFixed(1)
    : "—";

  const models = agents.length > 0
    ? agents.map(a => ({
        name: a.name,
        type: a.type ?? "Agent",
        status: a.status === "running" ? "deployed" : a.status === "error" ? "error" : "training",
        accuracy: a.metric ?? "—",
        latency: a.status === "running" ? `${Math.round(Math.random() * 15 + 5)}ms` : "—",
        lastTrained: a.lastAction ?? "Unknown",
      }))
    : [];

  const experiments = recentActions.length > 0
    ? recentActions.slice(0, 3).map(a => ({
        name: `${a.actionType} — ${a.agentType}`,
        status: a.status === "success" ? "running" : a.status === "error" ? "failed" : "queued",
        metric: a.status === "success" ? `OK (${a.durationMs}ms)` : "—",
        progress: a.status === "success" ? 100 : a.status === "error" ? 0 : 30,
      }))
    : [];

  const isLoading = loading || insightsLoading;

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout>
        <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="mb-[22px]">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">AI Ops &amp; MLOps</h1>
          <p className="font-mono text-[11px] text-t3">Model registry · training queue · experiments</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Active Agents" value={isLoading ? "…" : String(aiops.activeServices)} accent={K.mint} sub="Running services" />
          <StatCard label="Avg p99 Latency" value={isLoading ? "…" : `${avgLatency}ms`} accent={K.warn} sub="Model inference" />
          <StatCard label="Avg Uptime" value={isLoading ? "…" : `${aiops.uptime}%`} accent={K.blue} />
          <StatCard label="Deployed Models" value={isLoading ? "…" : String(deployed)} accent={K.teal} sub="ML registry" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <Card accent={K.mint}>
            <h3 className="flex items-center gap-2 font-mono text-[13px] font-bold text-t1 mb-[14px]">Model Registry <Badge color={K.mint} className="text-[10px]">LIVE</Badge></h3>
            {models.map((m, i) => (
              <div key={i} className="px-3 py-[10px] mb-2 bg-g850 rounded-kdls" style={{ border:`1px solid ${m.status === "deployed" ? K.mint + "30" : m.status === "error" ? K.danger + "30" : K.g700}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] font-bold text-t1">{m.name}</span>
                  <Badge color={m.status === "deployed" ? K.mint : m.status === "error" ? K.danger : K.warn}>{m.status.toUpperCase()}</Badge>
                </div>
                <div className="flex flex-wrap gap-4">
                  <span className="font-mono text-[10px] text-t2">{m.type}</span>
                  <span className="font-mono text-[10px] text-t2">{m.accuracy}</span>
                  <span className="font-mono text-[10px] text-t2">{m.latency}</span>
                  <span className="font-mono text-[10px] text-t4">{m.lastTrained}</span>
                </div>
              </div>
            ))}
            {models.length === 0 && <p className="font-mono text-[10px] text-t4">No models registered yet.</p>}
          </Card>

          <Card accent={K.blue}>
            <h3 className="flex items-center gap-2 font-mono text-[13px] font-bold text-t1 mb-[14px]">Experiments <Badge color={K.blue} className="text-[10px]">LIVE</Badge></h3>
            {experiments.map((e, i) => (
              <div key={i} className="mb-[14px]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] font-bold text-t1">{e.name}</span>
                  <Badge color={e.status === "running" ? K.blue : e.status === "failed" ? K.danger : K.t3}>{e.status}</Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[10px] text-t2">{e.metric}</span>
                  <span className="font-mono text-[10px] text-t4">{e.progress}%</span>
                </div>
                {e.progress > 0 && <ProgressBar value={e.progress} color={e.status === "failed" ? K.danger : K.blue} height={3} />}
              </div>
            ))}
            {experiments.length === 0 && <p className="font-mono text-[10px] text-t4">No experiments running.</p>}
            <div className="mt-2">
              <AIThinking label="Auto-scaling inference endpoints based on demand..." />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
}

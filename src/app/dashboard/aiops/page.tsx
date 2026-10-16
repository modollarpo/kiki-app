"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StatCard, Card, Badge } from "@/components/ui";
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
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading: insightsLoading } = useInsights();
  const aiops = data?.aiops ?? { metrics: [], uptime: null, activeServices: 0 };
  const [agents, setAgents] = useState<AgentModel[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

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
      .catch((err) => { setError(err?.message || "Failed to load AI Ops data"); setLoading(false); })
      .finally(() => setLoading(false));
  }, [token]);

  const deployed = agents.filter(a => a.status === "running").length;

  const statusColor = (s: string) => s === "running" ? K.mint : s === "error" ? K.danger : s === "paused" ? K.warn : K.t3;

  const models = agents.map(a => ({
    name: a.name,
    type: a.type ?? "Agent",
    status: a.status,
    metric: a.metric ?? "—",
    lastAction: a.lastAction ?? "No activity",
    actionCount: a.actionCount,
  }));

  const isLoading = loading || insightsLoading;

  if (authLoading) return <RoleGuard allowedRoles={["admin", "superadmin"]}><DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout></RoleGuard>;
  if (!token) return null;

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout>
        <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="mb-[22px]">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">AI Ops &amp; MLOps</h1>
          <p className="font-mono text-[11px] text-t3">Agent registry · running status · recent agent actions</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-[11px]" style={{ color: K.danger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Agents" value={isLoading ? "…" : String(aiops.activeServices)} accent={K.mint} sub="Configured" />
          <StatCard label="Running Agents" value={isLoading ? "…" : String(deployed)} accent={K.teal} sub="Status: running" />
          <StatCard label="Recent Actions" value={isLoading ? "…" : String(recentActions.length)} accent={K.warn} sub="Latest agent actions" />
          <StatCard label="Tracked Metrics" value={isLoading ? "…" : String(systemMetrics.length)} accent={K.blue} sub="System metrics" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <Card accent={K.mint}>
            <h3 className="flex items-center gap-2 font-mono text-[13px] font-bold text-t1 mb-[14px]">Agent Registry <Badge color={K.mint} className="text-[10px]">REGISTRY</Badge></h3>
            {models.map((m, i) => (
              <div key={i} className="px-3 py-[10px] mb-2 bg-g850 rounded-kdls" style={{ border:`1px solid ${m.status === "running" ? K.mint + "30" : m.status === "error" ? K.danger + "30" : K.g700}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] font-bold text-t1">{m.name}</span>
                  <Badge color={statusColor(m.status)}>{m.status.toUpperCase()}</Badge>
                </div>
                <div className="flex flex-wrap gap-4">
                  <span className="font-mono text-[10px] text-t2">{m.type}</span>
                  <span className="font-mono text-[10px] text-t2">{m.metric}</span>
                  <span className="font-mono text-[10px] text-t4">{m.actionCount} actions</span>
                </div>
                <p className="font-mono text-[10px] text-t3 mt-1">Last: {m.lastAction}</p>
              </div>
            ))}
            {models.length === 0 && <p className="font-mono text-[10px] text-t4">No agents registered yet.</p>}
          </Card>

          <Card accent={K.blue}>
            <h3 className="flex items-center gap-2 font-mono text-[13px] font-bold text-t1 mb-[14px]">Recent Agent Actions <Badge color={K.blue} className="text-[10px]">LIVE</Badge></h3>
            {recentActions.map((a, i) => (
              <div key={i} className="px-3 py-[10px] mb-2 bg-g850 rounded-kdls" style={{ border: `1px solid ${K.g700}` }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] font-bold text-t1">{a.actionType}</span>
                  <Badge color={a.status === "success" ? K.mint : a.status === "error" ? K.danger : K.warn}>{a.status}</Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-t2">{a.agentType}{a.output ? ` · ${a.output}` : ""}</span>
                  <span className="font-mono text-[10px] text-t4">{a.durationMs != null ? `${a.durationMs}ms` : "—"}</span>
                </div>
              </div>
            ))}
            {recentActions.length === 0 && <p className="font-mono text-[10px] text-t4">No recent agent actions.</p>}
          </Card>
        </div>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, Badge, StatCard, ScrollableTable } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useInsights } from "@/hooks/useInsights";

interface MetricPoint { name: string; value: number; tags: string; createdAt: string }

export default function AdminPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading: insightsLoading } = useInsights();
  const admin = data?.admin;
  const [systemMetrics, setSystemMetrics] = useState<MetricPoint[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) {
          setSystemMetrics(d.data.systemMetrics ?? []);
          setAgentStatuses(d.data.agents?.byStatus ?? {});
        }
      })
      .catch((err) => { setError(err?.message || "Failed to load admin data"); setLoading(false); })
      .finally(() => setLoading(false));
  }, [token]);

  if (authLoading) return <RoleGuard allowedRoles={["admin", "superadmin"]}><DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout></RoleGuard>;
  if (!token) return null;

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout>
        <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Admin Health</h1>
          <p className="font-mono text-[11px] text-t3">Platform service status · Agent health · Recorded system metrics</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-[11px]" style={{ color: K.danger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Users" value={loading || insightsLoading ? "—" : String(admin?.users ?? "—")} accent={K.blue} sub="In tenant" />
          <StatCard label="Active Agents" value={loading || insightsLoading ? "—" : String(admin?.runningAgents ?? "—")} accent={K.mint} sub={`${admin?.totalAgents ?? 0} total configured`} />
          <StatCard label="Active Campaigns" value={loading || insightsLoading ? "—" : String(admin?.campaigns ?? "—")} accent={K.teal} sub="Configured" />
          <StatCard label="Platform Spend" value={loading || insightsLoading ? "…" : `$${Number(admin?.totalSpend ?? 0).toLocaleString()}`} accent={K.warn} sub={`Wallet: $${Number(admin?.walletBalance ?? 0).toLocaleString()}`} />
        </div>

        <Card padding={0}>
          <div className="px-5 py-3.5 border-b border-g800">
            <h2 className="font-mono font-bold text-[13px] text-t1">Recorded System Metrics</h2>
          </div>
          {systemMetrics.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-mono text-[11px] text-t3">No system metrics recorded yet.</p>
            </div>
          ) : (
            <ScrollableTable>
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[1fr_140px_1fr_200px] gap-3 px-5 py-2 border-b border-g800 bg-g950">
                  {["METRIC", "VALUE", "TAGS", "RECORDED"].map(h => (
                    <span key={h} className="font-mono text-[10px] tracking-[0.1em] text-t4">{h}</span>
                  ))}
                </div>
                {systemMetrics.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_1fr_200px] gap-3 px-5 py-3 items-center hover:bg-[var(--card-hover)] border-b border-g900">
                    <span className="font-mono text-[11px] font-semibold text-t1">{m.name}</span>
                    <span className="font-mono text-[11px] text-t2">{Number.isFinite(m.value) ? m.value.toLocaleString() : String(m.value)}</span>
                    <span className="font-mono text-[10px] text-t3 truncate">{m.tags && m.tags !== "{}" ? m.tags : "—"}</span>
                    <span className="font-mono text-[10px] text-t4">{m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}</span>
                  </div>
                ))}
              </div>
            </ScrollableTable>
          )}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <h2 className="font-mono font-bold text-[13px] text-t1 mb-3.5">Agent Status Overview</h2>
          {Object.entries(agentStatuses).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(agentStatuses).map(([status, count], i) => (
                <div key={i} className="p-2.5 px-3 rounded-sm bg-g850" style={{ borderLeft: `3px solid ${status === "running" ? K.mint : status === "error" ? K.danger : K.warn}` }}>
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-t1 capitalize">{status}</span>
                    <Badge color={status === "running" ? K.mint : status === "error" ? K.danger : K.warn}>{count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-t3">No agents configured yet.</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
}

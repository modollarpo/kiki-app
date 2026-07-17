"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useInsights } from "@/hooks/useInsights";

interface MetricPoint { name: string; value: number; tags: string; createdAt: string }

function StatusDot({ status }: { status: string }) {
  const color = status === "healthy" ? K.mint : status === "degraded" ? K.warn : K.danger;
  return <span className="inline-block flex-shrink-0 w-[7px] h-[7px] rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />;
}



export default function AdminPage() {
  const { token } = useAuth();
  const { data, loading: insightsLoading } = useInsights();
  const admin = data?.admin;
  const [systemMetrics, setSystemMetrics] = useState<MetricPoint[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const services = Object.entries(agentStatuses).map(([status, count]) => {
    const metricForService = systemMetrics.find(m => m.tags?.includes(status));
    return {
      name: status,
      category: "Service",
      status: status === "running" ? "healthy" : status === "error" ? "error" : status === "paused" ? "degraded" : "healthy",
      uptime: metricForService ? Math.min(99.99, 99.5 + (metricForService.value / 1000)) : 0,
      p99: metricForService ? Math.round(metricForService.value) : 0,
      region: "us-east-1",
      count,
    };
  });

  const capacityMetrics = (() => {
    const gpu = systemMetrics.find(m => m.name?.toLowerCase().includes("gpu") || m.name?.toLowerCase().includes("cpu"));
    const mem = systemMetrics.find(m => m.name?.toLowerCase().includes("mem"));
    const sto = systemMetrics.find(m => m.name?.toLowerCase().includes("storage") || m.name?.toLowerCase().includes("disk"));
    const net = systemMetrics.find(m => m.name?.toLowerCase().includes("network") || m.name?.toLowerCase().includes("net"));
    return [
      { name: "Compute (GPU)", value: gpu ? Math.min(99, Math.round(gpu.value / 100)) : null, color: K.blue },
      { name: "Memory (RAM)", value: mem ? Math.min(99, Math.round(mem.value / 100)) : null, color: K.teal },
      { name: "Storage (SSD)", value: sto ? Math.min(99, Math.round(sto.value / 100)) : null, color: K.gold },
      { name: "Network I/O", value: net ? Math.min(99, Math.round(net.value / 100)) : null, color: K.mint },
    ];
  })();
  const hasCapacityData = capacityMetrics.some(m => m.value !== null);

  const healthy = services.filter(s => s.status === "healthy").length;
  const degraded = services.filter(s => s.status === "degraded").length;
  const errored = services.filter(s => s.status === "error").length;

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout>
        <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Admin Health</h1>
          <p className="font-mono text-[11px] text-gray-500">Platform service status · Uptime · Latency · Region health</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Services Healthy" value={`${healthy}/${services.length}`} accent={K.mint} sub={`${errored} critical, ${degraded} degraded`} />
          <StatCard label="Active Agents" value={loading || insightsLoading ? "—" : String(admin?.runningAgents ?? "—")} accent={K.blue} sub={`${admin?.totalAgents ?? 0} total configured`} />
          <StatCard label="Live Campaigns" value={loading || insightsLoading ? "—" : String(admin?.campaigns ?? "—")} accent={K.teal} sub={`${admin?.users ?? 0} users`} />
          <StatCard label="Platform Spend" value={loading || insightsLoading ? "…" : `$${Number(admin?.totalSpend ?? 0).toLocaleString()}`} accent={K.warn} sub={`Wallet: $${Number(admin?.walletBalance ?? 0).toLocaleString()}`} />
        </div>

        <Card padding={0}>
          <div className="px-5 py-3.5 border-b border-g800">
            <h2 className="font-mono font-bold text-[13px] text-white">Service Status</h2>
          </div>
          {services.length === 0 && !loading ? (
            <div className="px-5 py-10 text-center">
              <p className="font-mono text-[11px] text-gray-500">No services monitored. Connect platforms to start monitoring.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[180px_120px_80px_100px_120px_100px] gap-3 px-5 py-2 border-b border-g800 bg-g950">
                {["SERVICE", "CATEGORY", "STATUS", "UPTIME", "p99 LATENCY", "REGION"].map(h => (
                  <span key={h} className="font-mono text-[10px] tracking-[0.1em] text-gray-600">{h}</span>
                ))}
              </div>
              {services.map((svc, i) => (
                <div key={i} className="grid grid-cols-[180px_120px_80px_100px_120px_100px] gap-3 px-5 py-3 items-center hover:bg-[var(--card-hover)] border-b border-g900">
                  <div className="flex items-center gap-2">
                    <StatusDot status={svc.status} />
                    <span className="font-mono text-[11px] font-semibold text-white">{svc.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-500">{svc.category}</span>
                  <Badge color={svc.status === "healthy" ? K.mint : svc.status === "degraded" ? K.warn : K.danger} dot pulse={svc.status === "healthy"}>
                    {svc.status === "healthy" ? "OK" : svc.status === "degraded" ? "WARN" : "ERR"}
                  </Badge>
                  <div>
                    <span className="font-mono text-[11px] font-semibold" style={{ color: svc.uptime >= 99.95 ? K.mint : svc.uptime >= 99.8 ? K.warn : K.danger }}>
                      {svc.uptime > 0 ? `${svc.uptime.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[11px]" style={{ color: svc.p99 < 50 ? K.mint : svc.p99 < 200 ? K.warn : K.danger }}>
                      {svc.p99 > 0 ? `${svc.p99}ms` : "—"}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-600">{svc.region}</span>
                </div>
              ))}
            </>
          )}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Card>
            <h2 className="font-mono font-bold text-[13px] text-white mb-3.5">Capacity Utilization</h2>
            {hasCapacityData ? capacityMetrics.map((r, i) => (
              r.value !== null && (
                <div key={i} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-[10px] text-gray-500">{r.name}</span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: r.color }}>{r.value}%</span>
                  </div>
                  <ProgressBar value={r.value} color={r.color} height={5} glow />
                </div>
              )
            )) : (
              <p className="font-mono text-[11px] text-gray-500">No infrastructure metrics available</p>
            )}
          </Card>

          <Card>
            <h2 className="font-mono font-bold text-[13px] text-white mb-3.5">Agent Status Overview</h2>
            {Object.entries(agentStatuses).length > 0 ? (
              Object.entries(agentStatuses).map(([status, count], i) => (
                <div key={i} className="p-2.5 px-3 mb-2 rounded-sm bg-g850" style={{ borderLeft: `3px solid ${status === "running" ? K.mint : status === "error" ? K.danger : K.warn}` }}>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[11px] font-semibold text-white capitalize">{status}</span>
                    <Badge color={status === "running" ? K.mint : status === "error" ? K.danger : K.warn}>{count} agents</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="font-mono text-[11px] text-gray-500">No agents configured yet.</p>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
}

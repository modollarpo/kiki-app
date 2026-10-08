"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, Badge, Button, AIThinking } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";

interface UsageByType { type: string; count: number; totalQuantity: number; totalCost: number }
interface SystemMetric { name: string; value: number; tags: string; createdAt: string }
interface RecentAction { id: string; agentType: string; actionType: string; status: string; durationMs: number; createdAt: string }

export default function DeveloperPage() {
  const { token } = useAuth();
  const [showKey, setShowKey] = useState<number | null>(null);
  const [usage, setUsage] = useState<{ byType: UsageByType[]; totalApiCalls: number; totalCost: number } | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/developer", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) {
          setUsage(d.data.usage ?? null);
          setSystemMetrics(d.data.systemMetrics ?? []);
          setRecentActions(d.data.recentActions ?? []);
        }
      })
      .catch((err) => { setError(err?.message || "Failed to load data"); setLoading(false); })
      .finally(() => setLoading(false));
  }, [token]);

  const totalApiCalls = usage?.totalApiCalls ?? 0;
  const totalCost = usage?.totalCost ?? 0;
  const avgLatency = systemMetrics.length > 0
    ? Math.round(systemMetrics.reduce((s, m) => s + m.value, 0) / systemMetrics.length)
    : 0;
  const errorCount = recentActions.filter(a => a.status === "error").length;
  const errorRate = recentActions.length > 0 ? ((errorCount / recentActions.length) * 100).toFixed(2) : "0.00";

  // No real API-key provisioning backend is wired to the developer console, so
  // we surface the honest empty state instead of rendering fabricated keys.
  const apiKeys: Array<{ name: string; key: string; created: string; lastUsed: string; status: string; calls: string }> = [];

  const webhooks: Array<{ url: string; events: string[]; status: string }> = [];

  // No rate-limit policy source exists; limits are not fabricated.
  const rateLimits: Array<{ endpoint: string; limit: string; used: string; pct: number }> = [];

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout>
        <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Developer Console</h1>
          <p className="font-mono text-[11px] text-gray-500">API keys · Webhooks · SDK version · Rate limits · Usage</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-[11px]" style={{ color: K.danger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[{ label: "API Calls (24h)", value: loading ? "…" : totalApiCalls > 1000 ? `${(totalApiCalls / 1000).toFixed(1)}K` : String(totalApiCalls), color: K.blue },
            { label: "Avg Latency", value: loading ? "…" : avgLatency > 0 ? `${avgLatency}ms` : "—", color: K.mint },
            { label: "Error Rate", value: loading ? "…" : `${errorRate}%`, color: K.teal },
            { label: "Total Cost", value: loading ? "…" : `$${totalCost.toFixed(2)}`, color: K.gold },
          ].map((s, i) => (
            <Card key={i} accent={s.color}>
              <p className="font-mono text-[10px] tracking-[0.14em] text-gray-600 mb-1.5">{s.label}</p>
              <p className="font-mono text-[22px] font-bold" style={{ color: s.color }}>{s.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <Card padding={0}>
            <div className="px-5 py-3.5 flex justify-between items-center border-b border-g800">
              <h2 className="font-mono font-bold text-[13px] text-white flex items-center gap-2">API Keys <Badge color={K.t3} className="text-[10px]">PENDING</Badge></h2>
              <Button variant="secondary" size="sm">+ Generate Key</Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8"><AIThinking text="Loading..." /></div>
            ) : apiKeys.length === 0 ? (
              <div className="px-5 py-8 text-center"><span className="font-mono text-[11px] text-gray-500">API key provisioning is not enabled for this tenant yet.</span></div>
            ) : (
              apiKeys.map((k, i) => (
                <div key={i} className="px-5 py-3" style={{ borderBottom: i < apiKeys.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[11px] font-semibold text-white">{k.name}</span>
                    <Badge color={k.status === "active" ? K.mint : K.danger} dot pulse={k.status === "active"}>
                      {k.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <code className="font-mono text-[10px] text-gray-500 flex-1 py-[3px] px-2 rounded-sm bg-g800">
                      {showKey === i ? k.key : k.key.replace(/./g, "•").slice(0, 24) + "..."}
                    </code>
                    <Button variant="ghost" size="xs" onClick={() => setShowKey(showKey === i ? null : i)}>
                      {showKey === i ? "Hide" : "Show"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <span className="font-mono text-[10px] text-gray-600">Created: {k.created}</span>
                    <span className="font-mono text-[10px] text-gray-600">Last used: {k.lastUsed}</span>
                    <span className="font-mono text-[10px] text-gray-600">Calls: {k.calls}</span>
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card padding={0}>
            <div className="px-5 py-3.5 flex justify-between items-center border-b border-g800">
              <h2 className="font-mono font-bold text-[13px] text-white flex items-center gap-2">Webhooks <Badge color={K.t3} className="text-[10px]">PENDING</Badge></h2>
              <Button variant="secondary" size="sm">+ Add Endpoint</Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8"><AIThinking text="Loading..." /></div>
            ) : webhooks.length === 0 ? (
              <div className="px-5 py-8 text-center"><span className="font-mono text-[11px] text-gray-500">No webhook endpoints configured. Click "+ Add Endpoint" to create one.</span></div>
            ) : (
              webhooks.map((w, i) => (
                <div key={i} className="px-5 py-3" style={{ borderBottom: i < webhooks.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                  <div className="flex justify-between items-center mb-1">
                    <Badge color={w.status === "active" ? K.mint : K.t3} dot pulse={w.status === "active"}>{w.status.toUpperCase()}</Badge>
                  </div>
                  <code className="font-mono text-[10px] text-gray-400 block mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap">{w.url}</code>
                  <div className="flex gap-1 flex-wrap">
                    {w.events.map((ev, j) => (
                      <Badge key={j} color={ev === "*" ? K.gold : K.blue} className="text-[10px]">{ev}</Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <h2 className="font-mono font-bold text-[13px] text-white mb-3.5 flex items-center gap-2">Rate Limits <Badge color={K.t3} className="text-[10px]">N/A</Badge></h2>
            {loading ? (
              <div className="flex items-center justify-center py-4"><AIThinking text="Loading..." /></div>
            ) : rateLimits.length === 0 ? (
              <div className="py-4 text-center"><span className="font-mono text-[11px] text-gray-500">No rate-limit policy configured.</span></div>
            ) : (
              rateLimits.map((r, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <code className="font-mono text-[10px] text-gray-400">{r.endpoint}</code>
                    <span className="font-mono text-[10px]" style={{ color: r.pct > 80 ? K.danger : K.t3 }}>{r.used} / {r.limit}</span>
                  </div>
                  <div className="rounded-sm h-1 overflow-hidden bg-g800">
                    <div className="h-full rounded-sm" style={{ width: `${r.pct}%`, background: r.pct > 80 ? K.danger : r.pct > 50 ? K.warn : K.blue }} />
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card>
            <h2 className="font-mono font-bold text-[13px] text-white mb-3.5">Recent Actions</h2>
            {loading ? (
              <div className="flex items-center justify-center py-4"><AIThinking text="Loading..." /></div>
            ) : recentActions.length === 0 ? (
              <div className="py-4 text-center"><span className="font-mono text-[11px] text-gray-500">No recent actions.</span></div>
            ) : (
              recentActions.slice(0, 5).map((a, i) => (
                <div key={i} className="p-2.5 px-3 mb-2 rounded-sm bg-g850" style={{ borderLeft: `3px solid ${a.status === "success" ? K.mint : a.status === "error" ? K.danger : K.warn}` }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[11px] font-semibold text-white">{a.actionType}</span>
                    <Badge color={a.status === "success" ? K.mint : a.status === "error" ? K.danger : K.warn}>{a.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <span className="font-mono text-[10px] text-gray-600">Agent: {a.agentType}</span>
                    <span className="font-mono text-[10px] text-gray-600">{a.durationMs}ms</span>
                    <span className="font-mono text-[10px] text-gray-600">{new Date(a.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
}

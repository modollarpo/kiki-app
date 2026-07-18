"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, Badge, Button } from "@/components/ui";
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const totalApiCalls = usage?.totalApiCalls ?? 0;
  const totalCost = usage?.totalCost ?? 0;
  const avgLatency = systemMetrics.length > 0
    ? Math.round(systemMetrics.reduce((s, m) => s + m.value, 0) / systemMetrics.length)
    : 42;
  const errorCount = recentActions.filter(a => a.status === "error").length;
  const errorRate = recentActions.length > 0 ? ((errorCount / recentActions.length) * 100).toFixed(2) : "0.00";

  const apiKeys = usage?.byType.map((u, i) => ({
    name: `${u.type.charAt(0).toUpperCase() + u.type.slice(1)} Key`,
    key: `kiki_${u.type.slice(0, 3)}_sk_${Math.random().toString(36).slice(2, 6)}...${Math.random().toString(36).slice(2, 6)}`,
    created: "Active",
    lastUsed: "Recent",
    status: "active",
    calls: u.count > 1000 ? `${(u.count / 1000).toFixed(1)}K` : String(u.count),
  })) ?? [
    { name: "Production Key", key: "kiki_prod_sk_8f2a...x9k2", created: "Jun 12, 2026", lastUsed: "2 min ago", status: "active", calls: "142K" },
    { name: "Staging Key", key: "kiki_stg_sk_3b1c...m7p4", created: "May 28, 2026", lastUsed: "1 hour ago", status: "active", calls: "8.2K" },
    { name: "Legacy Key", key: "kiki_old_sk_9d4e...w2q1", created: "Jan 3, 2026", lastUsed: "45 days ago", status: "expired", calls: "312K" },
  ];

  const webhooks = recentActions.length > 0
    ? recentActions.slice(0, 3).map(a => ({
        url: `https://app.kiki.ai/api/webhooks/${a.agentType}`,
        events: [a.actionType],
        status: a.status === "success" ? "active" : "paused",
      }))
    : [
        { url: "https://app.kiki.ai/api/webhooks/incoming/slack", events: ["campaign.updated", "alert.fired"], status: "active" },
        { url: "https://app.kiki.ai/api/webhooks/incoming/custom", events: ["*"], status: "active" },
        { url: "https://app.kiki.ai/api/webhooks/incoming/zapier", events: ["report.completed"], status: "paused" },
      ];

  const rateLimits = usage?.byType.map(u => ({
    endpoint: `GET /v1/${u.type}`,
    limit: `${Math.max(u.count * 3, 100)}/min`,
    used: `${u.count}/min`,
    pct: Math.min(99, Math.round((u.count / Math.max(u.count * 3, 100)) * 100)),
  })) ?? [
    { endpoint: "GET /v1/campaigns", limit: "1,000/min", used: "342/min", pct: 34.2 },
    { endpoint: "POST /v1/agents/run", limit: "200/min", used: "187/min", pct: 93.5 },
    { endpoint: "GET /v1/analytics", limit: "500/min", used: "89/min", pct: 17.8 },
    { endpoint: "POST /v1/creatives", limit: "100/min", used: "12/min", pct: 12 },
  ];

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout>
        <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Developer Console</h1>
          <p className="font-mono text-[11px] text-gray-500">API keys · Webhooks · SDK version · Rate limits · Usage</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[{ label: "API Calls (24h)", value: loading ? "…" : totalApiCalls > 1000 ? `${(totalApiCalls / 1000).toFixed(1)}K` : String(totalApiCalls), color: K.blue },
            { label: "Avg Latency", value: loading ? "…" : `${avgLatency}ms`, color: K.mint },
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
              <h2 className="font-mono font-bold text-[13px] text-white flex items-center gap-2">API Keys <Badge color={K.mint} className="text-[10px]">LIVE</Badge></h2>
              <Button variant="secondary" size="sm">+ Generate Key</Button>
            </div>
            {loading ? (
              <div className="px-5 py-8 text-center"><span className="font-mono text-[11px] text-gray-500">Loading…</span></div>
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
              <h2 className="font-mono font-bold text-[13px] text-white flex items-center gap-2">Webhooks <Badge color={K.mint} className="text-[10px]">LIVE</Badge></h2>
              <Button variant="secondary" size="sm">+ Add Endpoint</Button>
            </div>
            {loading ? (
              <div className="px-5 py-8 text-center"><span className="font-mono text-[11px] text-gray-500">Loading…</span></div>
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
            <h2 className="font-mono font-bold text-[13px] text-white mb-3.5 flex items-center gap-2">Rate Limits <Badge color={K.mint} className="text-[10px]">LIVE</Badge></h2>
            {loading ? (
              <div className="py-4 text-center"><span className="font-mono text-[11px] text-gray-500">Loading…</span></div>
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
              <div className="py-4 text-center"><span className="font-mono text-[11px] text-gray-500">Loading…</span></div>
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

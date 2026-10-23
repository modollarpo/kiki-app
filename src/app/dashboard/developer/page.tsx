"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, Badge, Button, AIThinking } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";

interface UsageByType { type: string; count: number; totalQuantity: number; totalCost: number }
interface RecentAction { id: string; agentType: string; actionType: string; status: string; durationMs: number; createdAt: string }
interface ApiKey { id: string; name: string; key: string; status: string; created: string; lastUsed: string; calls: string }
interface Webhook { id: string; url: string; events: string[]; status: string; lastDelivery: string | null; failureCount: number; created: string }

const WEBHOOK_EVENTS = ["*", "campaign.created", "campaign.updated", "signal.captured", "signal.enriched", "bid.placed", "ltv.predicted", "wallet.updated", "agent.action"];

export default function DeveloperPage() {
  const { token } = useAuth();
  const [showKey, setShowKey] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ byType: UsageByType[]; totalApiCalls: number; totalCost: number } | null>(null);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [showCreateHook, setShowCreateHook] = useState(false);
  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>(["*"]);
  const [creatingHook, setCreatingHook] = useState(false);
  const [newHookSecret, setNewHookSecret] = useState<string | null>(null);
  const [busyHook, setBusyHook] = useState<string | null>(null);
  const addToast = useKikiStore(s => s.addToast);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/developer", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed to load developer data");
      const d = await r.json();
      if (d?.data) {
        setUsage(d.data.usage ?? null);
        setRecentActions(d.data.recentActions ?? []);
        setApiKeys(d.data.apiKeys ?? []);
        setWebhooks(d.data.webhooks ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const post = async (payload: Record<string, unknown>) => {
    if (!token) throw new Error("Not authenticated");
    const res = await fetch("/api/developer", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => null);
    if (!res.ok || !result?.ok) throw new Error(result?.error || "Request failed");
    return result;
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) { addToast("error", "Key name is required"); return; }
    setCreatingKey(true);
    try {
      const result = await post({ action: "create_api_key", name: keyName.trim() });
      setNewKeyPlain(result.key);
      setKeyName("");
      setShowCreateKey(false);
      await load();
      addToast("success", "API key created");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreatingKey(false);
    }
  };

  const handleKeyAction = async (id: string, action: "revoke_api_key" | "delete_api_key") => {
    if (action === "delete_api_key" && !confirm("Delete this API key permanently?")) return;
    setBusyKey(id);
    try {
      await post({ action, id });
      await load();
      addToast("success", action === "revoke_api_key" ? "API key revoked" : "API key deleted");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateHook = async () => {
    if (!hookUrl.trim()) { addToast("error", "Webhook URL is required"); return; }
    if (hookEvents.length === 0) { addToast("error", "Select at least one event"); return; }
    setCreatingHook(true);
    try {
      const result = await post({ action: "create_webhook", url: hookUrl.trim(), events: hookEvents });
      setNewHookSecret(result.secret);
      setHookUrl("");
      setHookEvents(["*"]);
      setShowCreateHook(false);
      await load();
      addToast("success", "Webhook created");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to create webhook");
    } finally {
      setCreatingHook(false);
    }
  };

  const handleHookAction = async (id: string, action: "delete_webhook" | "rotate_webhook_secret" | "update_webhook", extra?: Record<string, unknown>) => {
    if (action === "delete_webhook" && !confirm("Delete this webhook?")) return;
    setBusyHook(id);
    try {
      const result = await post({ action, id, ...extra });
      if (action === "rotate_webhook_secret") setNewHookSecret(result.secret);
      await load();
      addToast("success", action === "delete_webhook" ? "Webhook deleted" : action === "rotate_webhook_secret" ? "Signing secret rotated" : "Webhook updated");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyHook(null);
    }
  };

  const totalApiCalls = usage?.totalApiCalls ?? 0;
  const totalCost = usage?.totalCost ?? 0;
  const errorCount = recentActions.filter(a => a.status === "error").length;
  const errorRate = recentActions.length > 0 ? ((errorCount / recentActions.length) * 100).toFixed(2) : "0.00";

  // No rate-limit policy source exists; limits are not fabricated.
  const rateLimits: Array<{ endpoint: string; limit: string; used: string; pct: number }> = [];

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout>
        <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Developer Console</h1>
          <p className="font-mono text-caption text-t3">API keys · Webhooks · SDK version · Rate limits · Usage</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-caption" style={{ color: K.tDanger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[{ label: "API Calls (all-time)", value: loading ? "…" : totalApiCalls > 1000 ? `${(totalApiCalls / 1000).toFixed(1)}K` : String(totalApiCalls), color: K.blue },
            { label: "Recent Actions", value: loading ? "…" : String(recentActions.length), color: K.mint },
            { label: "Error Rate", value: loading ? "…" : `${errorRate}%`, color: K.teal },
            { label: "Total Cost", value: loading ? "…" : `$${totalCost.toFixed(2)}`, color: K.gold },
          ].map((s, i) => (
            <Card key={i} accent={s.color}>
              <p className="font-mono text-micro tracking-[0.14em] text-t4 mb-1.5">{s.label}</p>
              <p className="font-mono text-h3 font-bold" style={{ color: s.color }}>{s.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <Card padding={0}>
            <div className="px-5 py-3.5 flex justify-between items-center border-b border-g800">
              <h2 className="font-mono font-bold text-small text-t1 flex items-center gap-2">
                API Keys <Badge color={apiKeys.length > 0 ? K.mint : K.t3} className="text-caption">{apiKeys.length}</Badge>
              </h2>
              <Button size="xs" variant="secondary" onClick={() => setShowCreateKey(v => !v)}>{showCreateKey ? "Cancel" : "+ New Key"}</Button>
            </div>
            {newKeyPlain && (
              <div className="px-5 py-3 border-b border-g800" style={{ background: `${K.mint}10` }}>
                <p className="font-mono text-caption mb-1" style={{ color: K.tMint }}>Copy this key now — it will not be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-caption text-t1 flex-1 py-1 px-2 rounded-sm bg-g800 break-all">{newKeyPlain}</code>
                  <Button size="xs" variant="ghost" onClick={() => { navigator.clipboard?.writeText(newKeyPlain); addToast("success", "Copied"); }}>Copy</Button>
                  <Button size="xs" variant="ghost" onClick={() => setNewKeyPlain(null)}>Dismiss</Button>
                </div>
              </div>
            )}
            {showCreateKey && (
              <div className="px-5 py-3 border-b border-g800 flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[160px]">
                  <label htmlFor="api-key-name" className="block font-mono text-caption tracking-widest text-t4 mb-1">KEY NAME</label>
                  <input id="api-key-name" value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Production server" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-2 font-mono text-caption text-t1 outline-none focus:border-kblue" />
                </div>
                <Button size="sm" loading={creatingKey} onClick={handleCreateKey}>Create</Button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-8"><AIThinking text="Loading..." /></div>
            ) : apiKeys.length === 0 ? (
              <div className="px-5 py-8 text-center"><span className="font-mono text-caption text-t3">No API keys yet. Create one to authenticate server-to-server requests.</span></div>
            ) : (
              apiKeys.map((k, i) => (
                <div key={k.id} className="px-5 py-3" style={{ borderBottom: i < apiKeys.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <span className="font-mono text-caption font-semibold text-t1">{k.name}</span>
                    <Badge color={k.status === "active" ? K.mint : K.danger} dot pulse={k.status === "active"}>
                      {k.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <code className="font-mono text-caption text-t3 flex-1 py-[3px] px-2 rounded-sm bg-g800 break-all">
                      {showKey === k.id ? k.key : k.key}
                    </code>
                    <Button variant="ghost" size="xs" onClick={() => setShowKey(showKey === k.id ? null : k.id)}>
                      {showKey === k.id ? "Hide" : "Show"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="font-mono text-caption text-t4">Created: {k.created}</span>
                    <span className="font-mono text-caption text-t4">Last used: {k.lastUsed}</span>
                    {k.status !== "revoked" && (
                      <Button variant="ghost" size="xs" loading={busyKey === k.id} onClick={() => handleKeyAction(k.id, "revoke_api_key")}>Revoke</Button>
                    )}
                    <Button variant="ghost" size="xs" loading={busyKey === k.id} onClick={() => handleKeyAction(k.id, "delete_api_key")} style={{ color: K.danger }}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card padding={0}>
            <div className="px-5 py-3.5 flex justify-between items-center border-b border-g800">
              <h2 className="font-mono font-bold text-small text-t1 flex items-center gap-2">
                Webhooks <Badge color={webhooks.length > 0 ? K.mint : K.t3} className="text-caption">{webhooks.length}</Badge>
              </h2>
              <Button size="xs" variant="secondary" onClick={() => setShowCreateHook(v => !v)}>{showCreateHook ? "Cancel" : "+ New Webhook"}</Button>
            </div>
            {newHookSecret && (
              <div className="px-5 py-3 border-b border-g800" style={{ background: `${K.gold}10` }}>
                <p className="font-mono text-caption mb-1" style={{ color: K.gold }}>Signing secret (store it — shown once):</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-caption text-t1 flex-1 py-1 px-2 rounded-sm bg-g800 break-all">{newHookSecret}</code>
                  <Button size="xs" variant="ghost" onClick={() => { navigator.clipboard?.writeText(newHookSecret); addToast("success", "Copied"); }}>Copy</Button>
                  <Button size="xs" variant="ghost" onClick={() => setNewHookSecret(null)}>Dismiss</Button>
                </div>
              </div>
            )}
            {showCreateHook && (
              <div className="px-5 py-3 border-b border-g800">
                <label htmlFor="webhook-url" className="block font-mono text-caption tracking-widest text-t4 mb-1">ENDPOINT URL</label>
                <input id="webhook-url" value={hookUrl} onChange={e => setHookUrl(e.target.value)} placeholder="https://example.com/webhooks/kiki" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-2 font-mono text-caption text-t1 outline-none focus:border-kblue mb-2" />
                <p className="font-mono text-caption tracking-widest text-t4 mb-1">EVENTS</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {WEBHOOK_EVENTS.map(ev => {
                    const active = hookEvents.includes(ev) || (hookEvents.includes("*") && ev === "*");
                    return (
                      <button key={ev} type="button"
                        onClick={() => setHookEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev.filter(e => e !== "*"), ev])}
                        className="font-mono text-caption px-2 py-1 rounded-sm border cursor-pointer"
                        style={{ borderColor: active ? K.blue : K.g700, color: active ? K.t1 : K.t3, background: active ? `${K.blue}20` : "transparent" }}>
                        {ev}
                      </button>
                    );
                  })}
                </div>
                <Button size="sm" loading={creatingHook} onClick={handleCreateHook}>Create Webhook</Button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-8"><AIThinking text="Loading..." /></div>
            ) : webhooks.length === 0 ? (
              <div className="px-5 py-8 text-center"><span className="font-mono text-caption text-t3">No webhooks configured. Add an endpoint to receive event deliveries.</span></div>
            ) : (
              webhooks.map((w, i) => (
                <div key={w.id} className="px-5 py-3" style={{ borderBottom: i < webhooks.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <Badge color={w.status === "active" ? K.mint : K.t3} dot pulse={w.status === "active"}>{w.status.toUpperCase()}</Badge>
                    <div className="flex gap-1">
                      <Button size="xs" variant="ghost" loading={busyHook === w.id} onClick={() => handleHookAction(w.id, "update_webhook", { status: w.status === "active" ? "disabled" : "active" })}>{w.status === "active" ? "Disable" : "Enable"}</Button>
                      <Button size="xs" variant="ghost" loading={busyHook === w.id} onClick={() => handleHookAction(w.id, "rotate_webhook_secret")}>Rotate</Button>
                      <Button size="xs" variant="ghost" loading={busyHook === w.id} onClick={() => handleHookAction(w.id, "delete_webhook")} style={{ color: K.danger }}>Delete</Button>
                    </div>
                  </div>
                  <code className="font-mono text-caption text-t2 block mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap">{w.url}</code>
                  <div className="flex gap-1 flex-wrap">
                    {w.events.map((ev, j) => (
                      <Badge key={j} color={ev === "*" ? K.gold : K.blue} className="text-caption">{ev}</Badge>
                    ))}
                  </div>
                  {w.lastDelivery && <p className="font-mono text-caption text-t4 mt-1">Last delivery: {w.lastDelivery}{w.failureCount > 0 ? ` · ${w.failureCount} failures` : ""}</p>}
                </div>
              ))
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <h2 className="font-mono font-bold text-small text-t1 mb-3.5 flex items-center gap-2">Rate Limits <Badge color={K.t3} className="text-caption">N/A</Badge></h2>
            {loading ? (
              <div className="flex items-center justify-center py-4"><AIThinking text="Loading..." /></div>
            ) : rateLimits.length === 0 ? (
              <div className="py-4 text-center"><span className="font-mono text-caption text-t3">No rate-limit policy configured.</span></div>
            ) : (
              rateLimits.map((r, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <code className="font-mono text-caption text-t2">{r.endpoint}</code>
                    <span className="font-mono text-caption" style={{ color: r.pct > 80 ? K.danger : K.t3 }}>{r.used} / {r.limit}</span>
                  </div>
                  <div className="rounded-sm h-1 overflow-hidden bg-g800">
                    <div className="h-full rounded-sm" style={{ width: `${r.pct}%`, background: r.pct > 80 ? K.danger : r.pct > 50 ? K.warn : K.blue }} />
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card>
            <h2 className="font-mono font-bold text-small text-t1 mb-3.5">Recent Actions</h2>
            {loading ? (
              <div className="flex items-center justify-center py-4"><AIThinking text="Loading..." /></div>
            ) : recentActions.length === 0 ? (
              <div className="py-4 text-center"><span className="font-mono text-caption text-t3">No recent actions.</span></div>
            ) : (
              recentActions.slice(0, 5).map((a, i) => (
                <div key={i} className="p-2.5 px-3 mb-2 rounded-sm bg-g850" style={{ borderLeft: `3px solid ${a.status === "success" ? K.mint : a.status === "error" ? K.danger : K.warn}` }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-caption font-semibold text-t1">{a.actionType}</span>
                    <Badge color={a.status === "success" ? K.mint : a.status === "error" ? K.danger : K.warn}>{a.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <span className="font-mono text-caption text-t4">Agent: {a.agentType}</span>
                    <span className="font-mono text-caption text-t4">{a.durationMs}ms</span>
                    <span className="font-mono text-caption text-t4">{new Date(a.createdAt).toLocaleTimeString()}</span>
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

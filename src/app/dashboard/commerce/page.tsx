"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, StatCard, Input, ScrollableTable, EmptyState, AIThinking } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";

interface CommerceConnection {
  id: string;
  platform: string;
  platformName?: string;
  shopDomain: string | null;
  status: string;
  lastSyncAt: string | null;
  totalOrders: number;
  totalRevenue: number;
}

interface PlatformCatalogItem {
  platformId: string;
  name: string;
  authType: string;
}

interface CommerceData {
  connections: CommerceConnection[];
  available: PlatformCatalogItem[];
}

interface LtvSegment {
  segment: string;
  count: number;
  avgPredicted: number;
  avgActual: number;
  avgErrorPct: number;
}

interface LtvAccuracyData {
  bySegment: LtvSegment[];
  avgError: number;
  coverage: number;
}

export default function CommercePage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [commerce, setCommerce] = useState<CommerceData | null>(null);
  const [ltv, setLtv] = useState<LtvAccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const [connecting, setConnecting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [cRes, lRes] = await Promise.all([
        fetch("/api/commerce", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/commerce/ltv-accuracy", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!cRes.ok) throw new Error("Failed to load commerce connections");
      const cData = await cRes.json();
      setCommerce(cData.data ?? { connections: [], available: [] });
      if (lRes.ok) {
        const lData = await lRes.json();
        setLtv(lData.data ?? null);
      } else {
        setLtv(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load commerce data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!commerce || commerce.available.length === 0) return;
    setPlatform(prev =>
      prev && commerce.available.some(a => a.platformId === prev)
        ? prev
        : commerce.available[0].platformId
    );
  }, [commerce]);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) load();
  }, [load, token]);

  if (authLoading) return <DashboardLayout><div className="flex items-center justify-center p-8"><AIThinking text="Loading..." /></div></DashboardLayout>;
  if (!token) return null;

  const handleConnect = async () => {
    if (!token) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "connect",
          platform,
          shopDomain,
          apiKey,
          webhookSecret,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to connect store");
      setShopDomain("");
      setApiKey("");
      setWebhookSecret("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect store");
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    if (!token) return;
    setBusyId(connectionId);
    setError(null);
    try {
      const res = await fetch("/api/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "sync", connectionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to sync store");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sync store");
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!token) return;
    setBusyId(connectionId);
    setError(null);
    try {
      const res = await fetch("/api/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "disconnect", connectionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to disconnect store");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect store");
    } finally {
      setBusyId(null);
    }
  };

  const connections = commerce?.connections ?? [];
  const catalog = commerce?.available ?? [];
  const totalOrders = connections.reduce((s, c) => s + (c.totalOrders || 0), 0);
  const totalStores = connections.length;
  const avgError = ltv?.avgError ?? null;
  const coverage = ltv?.coverage ?? null;
  const segments = ltv?.bySegment ?? [];
  const accuracy = avgError != null ? 100 - avgError : null;

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px] text-t1">
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h1 className="font-mono font-bold text-2xl text-t1 tracking-tight mb-1">Commerce &amp; CRM</h1>
            <p className="font-mono text-caption text-t3">Closed-loop commerce revenue &amp; realized LTV feedback</p>
          </div>
          <Button variant="mint" onClick={() => document.getElementById("connect-panel")?.scrollIntoView({ behavior: "smooth" })}>
            Connect Store
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-caption" style={{ color: K.tDanger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Stores Connected" value={loading ? "…" : String(totalStores)} sub={`${connections.filter(c => c.status === "active").length} active`} accent={K.mint} loading={loading} />
          <StatCard label="Orders Synced" value={loading ? "…" : (totalOrders > 0 ? totalOrders.toLocaleString() : "0")} sub="Total across stores" accent={K.blue} loading={loading} />
          <StatCard label="Avg LTV Accuracy" value={loading ? "…" : accuracy != null ? `${accuracy.toFixed(1)}%` : "—"} sub="100 − avg prediction error" accent={K.gold} loading={loading} />
          <StatCard label="Prediction Coverage" value={loading ? "…" : coverage != null ? `${(coverage * 100).toFixed(1)}%` : "—"} sub="Customers with realized LTV" accent={K.teal} loading={loading} />
        </div>

        <div id="connect-panel">
        <Card accent={K.blue} style={{ marginBottom: 16 }}>
          <h3 className="font-mono font-bold text-small text-t1 mb-4">Connect Store</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <p className="font-mono text-caption uppercase tracking-widest mb-1.5" style={{ color: K.t3 }}>Platform</p>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", background: K.g800,
                  border: `1px solid ${K.g700}`, borderRadius: 2, color: K.t1,
                  fontFamily: K.mono, fontSize: "var(--fs-small)", outline: "none",
                }}
              >
                {catalog.length === 0 ? (
                  <option value="">No connectors available</option>
                ) : catalog.map((c) => (
                  <option key={c.platformId} value={c.platformId}>{c.name}</option>
                ))}
              </select>
            </div>
            <Input label="Shop Domain" placeholder="store.myshopify.com" value={shopDomain} onChange={setShopDomain} mono />
            <Input label="API Key" placeholder="shpat_…" value={apiKey} onChange={setApiKey} mono />
            <Input label="Webhook Secret" placeholder="whsec_…" value={webhookSecret} onChange={setWebhookSecret} mono />
          </div>
          <div className="flex justify-end">
            <Button variant="mint" onClick={handleConnect} loading={connecting} disabled={!shopDomain || !apiKey}>
              Connect
            </Button>
          </div>
        </Card>
        </div>

        <Card accent={K.mint} style={{ marginBottom: 16 }}>
          <h3 className="font-mono font-bold text-small text-t1 mb-4">Connected Stores</h3>
          {loading ? (
            <p className="font-mono text-caption text-t3 py-4 text-center">Loading connections…</p>
          ) : connections.length === 0 ? (
            <EmptyState icon="🛒" title="No stores connected" body="Use the Connect Store panel to connect your first store." />
          ) : (
            <div className="space-y-2">
              {connections.map((c) => (
                <div key={c.id} className="p-3 rounded-sm flex flex-wrap items-center gap-3" style={{ background: K.g850, border: `1px solid ${K.cardBorder}` }}>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-caption font-semibold text-t1">{c.platformName ?? c.platform}</span>
                      <Badge color={c.status === "active" ? K.mint : c.status === "revoked" ? K.danger : K.warn} dot pulse={c.status === "active"}>{c.status}</Badge>
                    </div>
                    <span className="font-mono text-caption text-t3">{c.shopDomain}</span>
                  </div>
                  <div className="text-right w-28">
                    <div className="font-mono text-caption font-bold text-kmint">{(c.totalOrders || 0).toLocaleString()}</div>
                    <div className="font-mono text-caption text-t3">orders</div>
                  </div>
                  <div className="text-right w-28">
                    <div className="font-mono text-caption font-bold text-kgold">${(c.totalRevenue || 0).toLocaleString()}</div>
                    <div className="font-mono text-caption text-t3">revenue</div>
                  </div>
                  <div className="text-right w-32">
                    <div className="font-mono text-caption text-t2">{c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "never"}</div>
                    <div className="font-mono text-caption text-t3">last sync</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="xs" variant="secondary" onClick={() => handleSync(c.id)} loading={busyId === c.id}>Sync now</Button>
                    <Button size="xs" variant="danger" onClick={() => handleDisconnect(c.id)} disabled={busyId === c.id}>Disconnect</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card accent={K.gold}>
          <h3 className="font-mono font-bold text-small text-t1 mb-1">LTV Accuracy</h3>
          <p className="font-mono text-caption text-t3 mb-4">Predicted vs realized LTV by segment — proof of closed-loop value</p>
          {loading ? (
            <p className="font-mono text-caption text-t3 py-4 text-center">Loading accuracy…</p>
          ) : segments.length === 0 ? (
            <EmptyState icon="📉" title="No LTV data yet" body="Connect a store and let realized revenue accumulate to populate LTV accuracy." />
          ) : (
            <ScrollableTable>
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Segment", "Predicted LTV", "Realized LTV", "Error %", "Count"].map((h) => (
                      <th key={h} className="font-mono text-caption uppercase tracking-widest text-left py-2 px-2" style={{ color: K.t4, borderBottom: `1px solid ${K.cardBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {segments.map((s) => (
                    <tr key={s.segment}>
                      <td className="font-mono text-caption font-semibold text-t1 py-2 px-2" style={{ borderBottom: `1px solid ${K.g800}` }}>{s.segment}</td>
                      <td className="font-mono text-caption text-kblue py-2 px-2" style={{ borderBottom: `1px solid ${K.g800}` }}>${s.avgPredicted.toFixed(2)}</td>
                      <td className="font-mono text-caption text-kmint py-2 px-2" style={{ borderBottom: `1px solid ${K.g800}` }}>${s.avgActual.toFixed(2)}</td>
                      <td className="font-mono text-caption py-2 px-2" style={{ color: Math.abs(s.avgErrorPct) <= 10 ? K.mint : K.warn, borderBottom: `1px solid ${K.g800}` }}>{s.avgErrorPct.toFixed(1)}%</td>
                      <td className="font-mono text-caption text-t2 py-2 px-2" style={{ borderBottom: `1px solid ${K.g800}` }}>{s.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

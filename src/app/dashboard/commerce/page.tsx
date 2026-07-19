"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, StatCard, Input } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";

interface CommerceConnection {
  id: string;
  platform: string;
  shopDomain: string;
  status: "connected" | "pending" | "error" | "syncing";
  lastSync: string | null;
  totalOrders: number;
  totalRevenue: number;
}

interface PlatformCatalogItem {
  key: string;
  label: string;
  description: string;
}

interface CommerceData {
  connections: CommerceConnection[];
  catalog: PlatformCatalogItem[];
}

interface LtvSegment {
  segment: string;
  predictedLtv: number;
  realizedLtv: number;
  errorPct: number;
  count: number;
}

interface LtvAccuracyData {
  overallAccuracy: number;
  predictionCoverage: number;
  bySegment: LtvSegment[];
}

const PLATFORMS = ["shopify", "woocommerce", "magento", "bigcommerce", "square"];

export default function CommercePage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [commerce, setCommerce] = useState<CommerceData | null>(null);
  const [ltv, setLtv] = useState<LtvAccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState(PLATFORMS[0]);
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
      setCommerce(cData.data ?? { connections: [], catalog: [] });
      if (lRes.ok) {
        const lData = await lRes.json();
        setLtv(lData.data ?? { overallAccuracy: 0, predictionCoverage: 0, bySegment: [] });
      } else {
        setLtv({ overallAccuracy: 0, predictionCoverage: 0, bySegment: [] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load commerce data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) load();
  }, [load, token]);

  if (authLoading) return <DashboardLayout><div style={{ color: "var(--t2)", padding: "2rem" }}>Loading...</div></DashboardLayout>;
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
  const catalog = commerce?.catalog ?? [];
  const totalOrders = connections.reduce((s, c) => s + (c.totalOrders || 0), 0);
  const totalStores = connections.length;
  const avgAccuracy = ltv?.overallAccuracy ?? 0;
  const coverage = ltv?.predictionCoverage ?? 0;
  const segments = ltv?.bySegment ?? [];

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px] text-white">
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h1 className="font-mono font-bold text-2xl text-white tracking-tight mb-1">Commerce &amp; CRM</h1>
            <p className="font-mono text-[11px] text-gray-500">Closed-loop commerce revenue &amp; realized LTV feedback</p>
          </div>
          <Button variant="mint" onClick={() => document.getElementById("connect-panel")?.scrollIntoView({ behavior: "smooth" })}>
            Connect Store
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-[11px]" style={{ color: K.danger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Stores Connected" value={loading ? "…" : String(totalStores)} sub={loading ? "Loading…" : `${connections.filter(c => c.status === "connected").length} active`} accent={K.mint} loading={loading} />
          <StatCard label="Orders Synced" value={loading ? "…" : (totalOrders > 0 ? totalOrders.toLocaleString() : "0")} sub={loading ? "Loading…" : "Total across stores"} accent={K.blue} loading={loading} />
          <StatCard label="Avg LTV Accuracy" value={loading ? "…" : `${avgAccuracy.toFixed(1)}%`} sub={loading ? "Loading…" : "Predicted vs realized"} accent={K.gold} loading={loading} />
          <StatCard label="Prediction Coverage" value={loading ? "…" : `${coverage.toFixed(1)}%`} sub={loading ? "Loading…" : "Customers with LTV"} accent={K.teal} loading={loading} />
        </div>

        <div id="connect-panel">
        <Card accent={K.blue} style={{ marginBottom: 16 }}>
          <h3 className="font-mono font-bold text-[13px] text-white mb-4">Connect Store</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: K.t3 }}>Platform</p>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", background: K.g800,
                  border: `1px solid ${K.g700}`, borderRadius: 2, color: K.t1,
                  fontFamily: K.mono, fontSize: 13, outline: "none",
                }}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{catalog.find((c) => c.key === p)?.label ?? p}</option>
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
          <h3 className="font-mono font-bold text-[13px] text-white mb-4">Connected Stores</h3>
          {loading ? (
            <p className="font-mono text-[11px] text-gray-500 py-4 text-center">Loading connections…</p>
          ) : connections.length === 0 ? (
            <p className="font-mono text-[11px] text-gray-500 py-4 text-center">No stores connected yet. Use the Connect Store panel above.</p>
          ) : (
            <div className="space-y-2">
              {connections.map((c) => (
                <div key={c.id} className="p-3 rounded-sm flex flex-wrap items-center gap-3" style={{ background: K.g850, border: `1px solid ${K.cardBorder}` }}>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[11px] font-semibold text-white">{c.platform}</span>
                      <Badge color={c.status === "connected" ? K.mint : c.status === "error" ? K.danger : K.warn} dot pulse={c.status === "connected" || c.status === "syncing"}>{c.status}</Badge>
                    </div>
                    <span className="font-mono text-[10px] text-gray-500">{c.shopDomain}</span>
                  </div>
                  <div className="text-right w-28">
                    <div className="font-mono text-[11px] font-bold text-kmint">{(c.totalOrders || 0).toLocaleString()}</div>
                    <div className="font-mono text-[9px] text-gray-500">orders</div>
                  </div>
                  <div className="text-right w-28">
                    <div className="font-mono text-[11px] font-bold text-kgold">${(c.totalRevenue || 0).toLocaleString()}</div>
                    <div className="font-mono text-[9px] text-gray-500">revenue</div>
                  </div>
                  <div className="text-right w-32">
                    <div className="font-mono text-[10px] text-gray-400">{c.lastSync ? new Date(c.lastSync).toLocaleString() : "never"}</div>
                    <div className="font-mono text-[9px] text-gray-500">last sync</div>
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
          <h3 className="font-mono font-bold text-[13px] text-white mb-1">LTV Accuracy</h3>
          <p className="font-mono text-[10px] text-gray-500 mb-4">Predicted vs realized LTV by segment — proof of closed-loop value</p>
          {loading ? (
            <p className="font-mono text-[11px] text-gray-500 py-4 text-center">Loading accuracy…</p>
          ) : segments.length === 0 ? (
            <p className="font-mono text-[11px] text-gray-500 py-4 text-center">No feedback yet. Connect a store and let realized revenue accumulate to populate LTV accuracy.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Segment", "Predicted LTV", "Realized LTV", "Error %", "Count"].map((h) => (
                      <th key={h} className="font-mono text-[10px] uppercase tracking-widest text-left py-2 px-2" style={{ color: K.t4, borderBottom: `1px solid ${K.cardBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {segments.map((s) => (
                    <tr key={s.segment}>
                      <td className="font-mono text-[11px] font-semibold text-white py-2 px-2" style={{ borderBottom: `1px solid ${K.g800}` }}>{s.segment}</td>
                      <td className="font-mono text-[11px] text-kblue py-2 px-2" style={{ borderBottom: `1px solid ${K.g800}` }}>${s.predictedLtv.toFixed(2)}</td>
                      <td className="font-mono text-[11px] text-kmint py-2 px-2" style={{ borderBottom: `1px solid ${K.g800}` }}>${s.realizedLtv.toFixed(2)}</td>
                      <td className="font-mono text-[11px] py-2 px-2" style={{ color: Math.abs(s.errorPct) <= 10 ? K.mint : K.warn, borderBottom: `1px solid ${K.g800}` }}>{s.errorPct.toFixed(1)}%</td>
                      <td className="font-mono text-[11px] text-gray-400 py-2 px-2" style={{ borderBottom: `1px solid ${K.g800}` }}>{s.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

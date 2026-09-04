"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, Button, AIThinking, ProgressBar, StatusBadge, ScrollableTable } from "@/components/ui";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { WelcomeOverlay } from "@/components/dashboard/WelcomeOverlay";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { useSSE } from "@/hooks/useSSE";
import { dashboard, type DashboardData } from "@/lib/api";
import { K } from "@/lib/kdls";
import { useRouter } from "next/navigation";

interface SyncBrainStats {
  routingPerMin: number;
  totalTokens: number;
  agentTypes: Array<{ type: string; count: number }>;
}

interface SignalStats {
  totalSignals: number;
  todaySignals: number;
  avgPredictedLTV: number;
  processingRate: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function DashboardPage() {
  const { agents: storeAgents, walletBalance, toggleAgent, addToast } = useKikiStore();
  const { token } = useAuth();
  const router = useRouter();
  const { connected } = useSSE();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [syncbrainStats, setSyncbrainStats] = useState<SyncBrainStats | null>(null);
  const [signalStats, setSignalStats] = useState<SignalStats | null>(null);
  const [runwayDays, setRunwayDays] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSeedDemo = async () => {
    if (!token) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.ok) {
        addToast("success", "Demo data loaded! Refreshing...");
        dashboard.get(token).then(data => { setData(data); setSeeding(false); }).catch(() => setSeeding(false));
      } else {
        addToast("error", d.error || "Failed to seed demo data");
        setSeeding(false);
      }
    } catch { addToast("error", "Failed to seed demo data"); setSeeding(false); }
  };

  useEffect(() => {
    if (!token) { router.push("/auth/login"); return; }
    dashboard.get(token).then(d => { setData(d); setLoading(false); setLastUpdate(new Date()); }).catch((err) => { setError(err?.message || "Failed to load dashboard data"); setLoading(false); });
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    const iv = setInterval(() => {
      dashboard.get(token).then(d => { setData(d); setLastUpdate(new Date()); }).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, [token]);

  // Fetch syncbrain stats
  useEffect(() => {
    if (!token) return;
    fetch("/api/syncbrain", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSyncbrainStats(d); })
      .catch((err) => { setError(err?.message || "Failed to load SyncBrain stats"); });
  }, [token]);

  // Fetch signal stats
  useEffect(() => {
    if (!token) return;
    fetch("/api/signals", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSignalStats(d); })
      .catch((err) => { setError(err?.message || "Failed to load signal stats"); });
  }, [token]);

  const agents = data?.agents || storeAgents;
  const balance = data?.wallet?.balance || walletBalance;

  // Compute runway from wallet balance and daily spend rate
  useEffect(() => {
    if (!data) return;
    const balanceVal = data.wallet?.balance || 0;
    const totalSpend = data.kpis?.spend?.value || 0;
    const activeCount = data.campaigns?.filter(c => c.status === "active").length || 0;
    const dailyBurn = activeCount > 0 ? totalSpend / Math.max(activeCount * 30, 1) : 0;
    setRunwayDays(dailyBurn > 0 ? Math.round(balanceVal / dailyBurn) : null);
  }, [data]);

  // Derive syncbrain metrics
  const decisionsPerMin = syncbrainStats ? Math.round((syncbrainStats.routingPerMin || 0) / 60) : null;
  const tokenBudget = syncbrainStats?.totalTokens
    ? Math.min(100, Math.round((syncbrainStats.totalTokens / 10000) * 100))
    : null;

  // Derive signal quality metrics
  const enrichmentRate = signalStats && signalStats.totalSignals > 0
    ? Math.round((signalStats.todaySignals / Math.max(signalStats.totalSignals, 1)) * 1000) / 10
    : null;
  const fraudBlocked = data?.system?.fraudBlocked;
  const signalsTotal = data?.system?.signalsTotal || 0;
  const fraudRate = signalsTotal > 0 && fraudBlocked !== undefined
    ? Math.round((fraudBlocked / Math.max(signalsTotal, 1)) * 1000) / 10
    : null;

  return (
    <DashboardLayout>
      <WelcomeOverlay />
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        {/* Header */}
        <div className="page-header-row">
          <div className="min-w-0">
            <h1 className="font-mono font-bold text-[clamp(16px,2.5vw,20px)] text-t1 tracking-tight mb-1">Command Center</h1>
            <p className="font-mono text-[11px] text-t3 overflow-hidden text-ellipsis whitespace-nowrap">
              {loading ? <span className="inline-flex items-center gap-1.5"><span className="animate-spin w-3 h-3 border-2 border-t-transparent rounded-full shrink-0" style={{ borderColor: `${K.blue}40`, borderTopColor: K.blue }} /><span className="font-mono text-[11px] text-t3">Loading...</span></span> : `Live · ${data?.system?.status || "nominal"} · ${data?.system?.agentsRunning || 0} agents · ${lastUpdate.toLocaleTimeString()}`}
            </p>
          </div>
          <div className="page-header-actions">
            {connected && <Badge color={K.mint} dot>SSE</Badge>}
            <Button size="sm" variant="ghost" onClick={() => dashboard.get(token!).then(d => { setData(d); setLastUpdate(new Date()); })}>↻ Refresh</Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-[11px]" style={{ color: K.danger }}>{error}</p>
          </div>
        )}

        <OnboardingChecklist />

        {/* KPI Row */}
        <ErrorBoundary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard label="Platform ROAS" value={data ? `${data.kpis.roas.value}×` : "—"} delta={data?.kpis.roas.delta} period="last month" accent={K.mint} loading={loading} />
            <StatCard label="Total Ad Spend" value={data ? `$${fmt(data.kpis.spend.value)}` : "—"} delta={data?.kpis.spend.delta} accent={K.blue} loading={loading} />
            <StatCard label="Avg LTV Signal" value={data ? `$${data.kpis.ltv.value}` : "—"} delta={data?.kpis.ltv.delta} accent={K.gold} loading={loading} />
            <StatCard label="Wallet Balance" value={`$${fmt(balance)}`} accent={K.gold} sub={runwayDays !== null ? `~${runwayDays} days runway` : "—"} loading={loading} />
          </div>
        </ErrorBoundary>

        {/* Main Grid: Campaigns + Agents */}
        <ErrorBoundary>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] gap-3 mb-3">
          <Card padding={0}>
            <div className="px-5 py-[14px] border-b border-kcardborder flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-mono font-bold text-[13px] text-t1">Active Campaigns</h2>
              <Button size="sm" onClick={() => router.push("/dashboard/campaigns")}>View All →</Button>
            </div>
            {/* Table header */}
            <ScrollableTable>
              <div className="min-w-[500px]">
                <div className="grid grid-cols-[1fr_65px_65px_65px_65px] gap-2 px-5 py-2 border-b border-kcardborder bg-g950">
              {["NAME", "STATUS", "ROAS", "BUDGET", "AGENT"].map(h => (
                <span key={h} className="font-mono text-[10px] tracking-widest text-t3">{h}</span>
              ))}
            </div>
            {/* Table rows */}
            {(data?.campaigns || []).slice(0, 5).map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_65px_65px_65px_65px] gap-2 px-5 py-3 border-b border-g900 items-center cursor-pointer hover:bg-kcardhover transition-colors"
                onClick={() => router.push("/dashboard/campaigns")}>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-t1 mb-[3px] overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</p>
                  <ProgressBar value={c.budget > 0 ? (c.spend / c.budget) * 100 : 0} color={K.blue} height={3} />
                </div>
                <StatusBadge status={c.status} />
                <span className={`font-mono text-xs font-bold ${c.roas >= 4 ? "text-kmint" : c.roas >= 2 ? "text-kwarn" : "text-kdanger"}`}>{c.roas}×</span>
                <span className="font-mono text-[11px] text-t2">${fmt(c.spend)}</span>
                <Badge color={K.blue} dot pulse>LIVE</Badge>
              </div>
            ))}
            {loading && [1, 2, 3].map(i => (
              <div key={i} className="px-5 py-3 border-b border-g900">
                <div className="h-[14px] w-[60%] bg-g850 rounded-kdls mb-[6px]" />
                <div className="h-[3px] w-[80%] bg-g850 rounded-kdls" />
              </div>
            ))}
              </div>
            </ScrollableTable>
          </Card>

          <Card accent={K.blue}>
            <div className="page-header-row">
              <h2 className="font-mono font-bold text-[13px] text-t1">AI Agents</h2>
              <Badge color={K.mint} dot pulse>{agents.filter((a: Record<string, unknown>) => a.status === "running").length} RUNNING</Badge>
            </div>
            {agents.map((agent: Record<string, unknown>) => (
              <div key={agent.id as string} className="p-[10px] mb-2 bg-g850 rounded-kdls border border-g800"
                style={{ borderColor: agent.status === "running" ? `${agent.color as string}30` : undefined }}>
                <div className="flex items-center justify-between mb-[5px]">
                  <span className="font-mono text-xs font-bold text-t1">{agent.name as string}</span>
                  <StatusBadge status={agent.status as string} />
                </div>
                <p className="font-mono text-[11px] text-t3 mb-[6px] overflow-hidden text-ellipsis whitespace-nowrap">{agent.task as string}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold" style={{ color: agent.color as string }}>{agent.metric as string}</span>
                  <Button size="xs" variant="ghost" onClick={() => toggleAgent(agent.id as string)}>{agent.status === "running" ? "Pause" : "Resume"}</Button>
                </div>
              </div>
            ))}
          </Card>
        </div>
        </ErrorBoundary>

        {/* Bottom 3-column: SyncBrain, Signal, Wallet */}
        <ErrorBoundary>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card accent={K.green}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl text-kgreen">⬡</span>
              <h3 className="font-mono font-bold text-[13px] text-t1">SyncBrain™</h3>
              <Badge color={K.green} dot pulse>LIVE</Badge>
            </div>
            <AIThinking label="Routing AI tasks across GPT-4o-mini and GPT-4o..." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {[
                { l: "Decisions/min", v: decisionsPerMin !== null ? String(decisionsPerMin) : "—" },
                { l: "Active agents", v: syncbrainStats?.agentTypes ? String(syncbrainStats.agentTypes.reduce((s, a) => s + a.count, 0)) : "—" },
                { l: "Token budget", v: tokenBudget !== null ? `${tokenBudget}%` : "—" },
              ].map(m => (
                <div key={m.l} className="p-2 bg-g850 rounded-kdls">
                  <p className="font-mono text-[11px] text-t3 mb-[3px]">{m.l}</p>
                  <p className="font-mono text-xs font-bold text-kgreen">{m.v}</p>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => router.push("/dashboard/syncbrain")}>Open SyncBrain →</Button>
          </Card>

          <Card accent={K.teal}>
            <div className="page-header-row">
              <h3 className="font-mono font-bold text-[13px] text-t1">Signal Quality</h3>
              <Badge color={K.teal}>LIVE</Badge>
            </div>
            {[
              { l: "Enrichment rate", v: enrichmentRate, c: K.mint, unit: "%" },
              { l: "LTV predictions", v: signalStats?.totalSignals ?? null, c: K.gold, unit: "" },
              { l: "Today's signals", v: signalStats?.todaySignals ?? null, c: K.blue, unit: "" },
              { l: "Fraud blocked", v: fraudRate, c: K.danger, unit: "%" },
            ].map(m => (
              <div key={m.l} className="mb-[10px]">
                <div className="flex justify-between mb-[3px]">
                  <span className="font-mono text-[11px] text-t3">{m.l}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: m.c }}>{m.v !== null ? `${m.v}${m.unit}` : "—"}</span>
                </div>
                <ProgressBar value={m.v !== null ? Math.min(100, m.unit === "%" ? m.v : Math.min(100, m.v / 10)) : 0} color={m.c} glow height={4} />
              </div>
            ))}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[16px]">📖</span>
              <p className="font-mono text-[11px] tracking-widest text-t3">QUICK START GUIDES</p>
            </div>
            <button key="seed" onClick={handleSeedDemo} disabled={seeding}
              className="w-full flex items-center gap-2 py-2 px-2 rounded-sm mb-1 cursor-pointer transition-all duration-150"
              style={{ background: "transparent", border: `1px solid ${K.gold}40`, opacity: seeding ? 0.6 : 1 }}
              onMouseEnter={e => { e.currentTarget.style.background = K.g800; e.currentTarget.style.borderColor = K.g600; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${K.gold}40`; }}>
              <span className="text-[12px]">{seeding ? "⏳" : "🚀"}</span>
              <span className="font-mono text-[10px] text-t3 flex-1 text-left">{seeding ? "Loading demo data..." : "Load demo data"}</span>
              <span className="font-mono text-[9px]" style={{ color: K.gold }}>↻</span>
            </button>
            {[
              { label: "Connect your first ad account", href: "/dashboard/guides/connect-accounts", icon: "🔗" },
              { label: "Run your first bid cycle", href: "/dashboard/guides/first-bid-cycle", icon: "⚡" },
              { label: "Set up LTV enrichment", href: "/dashboard/guides/ltv-enrichment", icon: "📈" },
            ].map(g => (
              <button key={g.href} onClick={() => router.push(g.href)}
                className="w-full flex items-center gap-2 py-2 px-2 rounded-sm mb-1 cursor-pointer transition-all duration-150"
                style={{ background: "transparent", border: `1px solid ${K.g700}` }}
                onMouseEnter={e => { e.currentTarget.style.background = K.g800; e.currentTarget.style.borderColor = K.g600; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = K.g700; }}>
                <span className="text-[12px]">{g.icon}</span>
                <span className="font-mono text-[10px] text-t3 flex-1 text-left">{g.label}</span>
                <span className="font-mono text-[9px]" style={{ color: K.blue4 }}>→</span>
              </button>
            ))}
          </Card>

          <Card accent={K.gold} glow={K.gold}>
            <div className="mb-[14px]">
              <p className="font-mono text-[11px] tracking-widest text-t3 mb-[6px]">WALLET BALANCE</p>
              <p className="font-mono text-[clamp(24px,4vw,32px)] font-bold text-kgold">${fmt(balance)}</p>
              <p className="font-mono text-[11px] text-t3 mt-1">{runwayDays !== null ? `~${runwayDays} days runway at current spend` : "—"}</p>
            </div>
            <ProgressBar value={Math.min(100, (balance / 100000) * 100)} color={K.gold} glow height={5} />
            <div className="mt-[14px] flex gap-2">
              <Button variant="mint" size="sm" full onClick={() => router.push("/dashboard/wallet")}>↑ Top Up</Button>
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/wallet")}>Details →</Button>
            </div>
          </Card>
        </div>
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
}

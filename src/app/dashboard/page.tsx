"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, Button, AIThinking, ProgressBar, StatusBadge } from "@/components/ui";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { useSSE } from "@/hooks/useSSE";
import { dashboard, type DashboardData } from "@/lib/api";
import { K } from "@/lib/kdls";
import { useRouter } from "next/navigation";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function DashboardPage() {
  const { agents: storeAgents, walletBalance, toggleAgent } = useKikiStore();
  const { token } = useAuth();
  const router = useRouter();
  const { connected } = useSSE();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!token) { router.push("/auth/login"); return; }
    dashboard.get(token).then(d => { setData(d); setLoading(false); setLastUpdate(new Date()); }).catch(() => setLoading(false));
  }, [token, router]);

  // Refresh data every 30 seconds
  useEffect(() => {
    if (!token) return;
    const iv = setInterval(() => {
      dashboard.get(token).then(d => { setData(d); setLastUpdate(new Date()); }).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, [token]);

  const agents = data?.agents || storeAgents;
  const balance = data?.wallet?.balance || walletBalance;

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Command Center</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>
              {loading ? "Loading..." : `Live platform overview · ${data?.system?.status || "nominal"} · ${data?.system?.agentsRunning || 0} agents running · Updated ${lastUpdate.toLocaleTimeString()}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {connected && <Badge color={K.mint} dot>SSE</Badge>}
            <Button size="sm" variant="ghost" onClick={() => dashboard.get(token!).then(d => { setData(d); setLastUpdate(new Date()); })}>↻ Refresh</Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Platform ROAS" value={data ? `${data.kpis.roas.value}×` : "—"} delta={data?.kpis.roas.delta} period="last month" accent={K.mint} loading={loading} />
          <StatCard label="Total Ad Spend" value={data ? `$${fmt(data.kpis.spend.value)}` : "—"} delta={data?.kpis.spend.delta} accent={K.blue} loading={loading} />
          <StatCard label="Avg LTV Signal" value={data ? `$${data.kpis.ltv.value}` : "—"} delta={data?.kpis.ltv.delta} accent={K.gold} loading={loading} />
          <StatCard label="Wallet Balance" value={`$${fmt(balance)}`} accent={K.gold} sub="~22 days runway" loading={loading} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, marginBottom: 12 }}>
          <Card padding={0}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>Active Campaigns</h2>
              <Button size="sm" onClick={() => router.push("/dashboard/campaigns")}>View All →</Button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px", gap: 12, padding: "8px 20px", borderBottom: `1px solid ${K.g800}`, background: K.g950 }}>
              {["NAME", "STATUS", "ROAS", "BUDGET", "AGENT"].map(h => (
                <span key={h} style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4 }}>{h}</span>
              ))}
            </div>
            {(data?.campaigns || []).slice(0, 5).map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px", gap: 12, padding: "12px 20px", borderBottom: `1px solid ${K.g900}`, alignItems: "center", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = K.g850)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                onClick={() => router.push("/dashboard/campaigns")}>
                <div>
                  <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1, marginBottom: 3 }}>{c.name}</p>
                  <ProgressBar value={c.budget > 0 ? (c.spend / c.budget) * 100 : 0} color={K.blue} height={3} />
                </div>
                <StatusBadge status={c.status} />
                <span style={{ fontFamily: K.mono, fontSize: 13, fontWeight: 700, color: c.roas >= 4 ? K.mint : c.roas >= 2 ? K.warn : K.danger }}>{c.roas}×</span>
                <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>${fmt(c.spend)}</span>
                <Badge color={K.blue} dot pulse>LIVE</Badge>
              </div>
            ))}
            {loading && [1, 2, 3].map(i => (
              <div key={i} style={{ padding: "12px 20px", borderBottom: `1px solid ${K.g900}` }}>
                <div style={{ height: 14, width: "60%", background: K.g850, borderRadius: 2, marginBottom: 6 }} />
                <div style={{ height: 3, width: "80%", background: K.g850, borderRadius: 2 }} />
              </div>
            ))}
          </Card>

          <Card accent={K.blue}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>AI Agents</h2>
              <Badge color={K.mint} dot pulse>{agents.filter((a: Record<string, unknown>) => a.status === "running").length} RUNNING</Badge>
            </div>
            {agents.map((agent: Record<string, unknown>) => (
              <div key={agent.id as string} style={{ padding: "10px 12px", marginBottom: 8, background: K.g850, borderRadius: 2, border: `1px solid ${agent.status === "running" ? (agent.color as string) + "30" : K.g700}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1 }}>{agent.name as string}</span>
                  <StatusBadge status={agent.status as string} />
                </div>
                <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t3, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.task as string}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, fontWeight: 700, color: agent.color as string }}>{agent.metric as string}</span>
                  <Button size="xs" variant="ghost" onClick={() => toggleAgent(agent.id as string)}>{agent.status === "running" ? "Pause" : "Resume"}</Button>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Card accent={K.green}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20, color: K.green }}>⬡</span>
              <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>SyncBrain™</h3>
              <Badge color={K.green} dot pulse>LIVE</Badge>
            </div>
            <AIThinking label="Routing AI tasks across GPT-4o-mini and GPT-4o..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              {[{ l: "Decisions/min", v: "47" }, { l: "Avg latency", v: "94ms" }, { l: "Primary model", v: "GPT-4o-mini" }, { l: "Token budget", v: "45%" }].map(m => (
                <div key={m.l} style={{ padding: "8px 10px", background: K.g850, borderRadius: 2 }}>
                  <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginBottom: 3 }}>{m.l}</p>
                  <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.green }}>{m.v}</p>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" style={{ marginTop: 12 }} onClick={() => router.push("/dashboard/syncbrain")}>Open SyncBrain →</Button>
          </Card>

          <Card accent={K.teal}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>Signal Quality</h3>
              <Badge color={K.teal}>LIVE</Badge>
            </div>
            {[{ l: "Enrichment rate", v: 94.2, c: K.mint }, { l: "LTV accuracy R²", v: 91, c: K.gold }, { l: "Consent coverage", v: 87.4, c: K.blue }, { l: "Fraud blocked", v: 99.1, c: K.danger }].map(m => (
              <div key={m.l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{m.l}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: m.c }}>{m.v}%</span>
                </div>
                <ProgressBar value={m.v} color={m.c} glow height={4} />
              </div>
            ))}
          </Card>

          <Card accent={K.gold} glow={K.gold}>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginBottom: 6 }}>WALLET BALANCE</p>
              <p style={{ fontFamily: K.mono, fontSize: 32, fontWeight: 700, color: K.gold }}>${fmt(balance)}</p>
              <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginTop: 4 }}>~22 days runway at current spend</p>
            </div>
            <ProgressBar value={Math.min(100, (balance / 100000) * 100)} color={K.gold} glow height={5} />
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <Button variant="mint" size="sm" full onClick={() => router.push("/dashboard/wallet")}>↑ Top Up</Button>
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/wallet")}>Details →</Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

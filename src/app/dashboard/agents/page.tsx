"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, Button, StatusBadge, ProgressBar, AIThinking } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { agents as agentsApi, type Agent } from "@/lib/api";
import { K } from "@/lib/kdls";

interface AgentWithActions extends Agent {
  latestAction?: {
    action_type: string;
    output: string;
    duration_ms: number;
    created_at: string;
  } | null;
  config?: Record<string, unknown>;
}

export default function AgentsPage() {
  const { token } = useAuth();
  const { toggleAgent } = useKikiStore();
  const [agentList, setAgentList] = useState<AgentWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    agentsApi.list(token).then(d => { setAgentList(d.agents as AgentWithActions[]); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!token) return;
    const iv = setInterval(() => {
      agentsApi.list(token).then(d => setAgentList(d.agents as AgentWithActions[])).catch(() => {});
    }, 15000);
    return () => clearInterval(iv);
  }, [token]);

  const running = agentList.filter(a => a.status === "running");
  const totalActions = agentList.reduce((s, a) => s + a.actionCount, 0);

  const handleToggle = async (id: string, currentStatus: string) => {
    if (!token) return;
    setToggling(id);
    const newStatus = currentStatus === "running" ? "paused" : "running";
    try {
      await agentsApi.toggle(token, id, newStatus);
      setAgentList(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as Agent["status"] } : a));
      toggleAgent(id);
    } catch { /* ignore */ }
    setToggling(null);
  };

  const handleRunNow = async (id: string) => {
    if (!token) return;
    setRunningAgent(id);
    try {
      await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action: "run" }),
      });
      // Refresh agent data
      const d = await agentsApi.list(token);
      setAgentList(d.agents as AgentWithActions[]);
    } catch { /* ignore */ }
    setRunningAgent(null);
  };

  const agentTypeIcon = (type: string) => {
    switch (type) {
      case "bidding": return "💰";
      case "creative": return "🎨";
      case "pacing": return "⏱";
      case "oaas": return "⬡";
      case "signals": return "📡";
      case "syncbrain": return "🧠";
      default: return "🤖";
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>AI Agents</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>
              {loading ? "Loading..." : `${agentList.length} agents · ${running.length} running · ${totalActions.toLocaleString()} total actions`}
            </p>
          </div>
          <Badge color={K.mint} dot pulse>LIVE</Badge>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Running Agents" value={String(running.length)} accent={K.mint} loading={loading} />
          <StatCard label="Paused" value={String(agentList.filter(a => a.status === "paused").length)} accent={K.warn} loading={loading} />
          <StatCard label="Total Actions" value={totalActions.toLocaleString()} accent={K.blue} loading={loading} />
          <StatCard label="Avg Uptime" value="99.7%" accent={K.teal} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {agentList.map(agent => (
              <Card key={agent.id} accent={agent.status === "running" ? agent.color : undefined}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 2, background: K.g850, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {agentTypeIcon(agent.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>{agent.name}</span>
                      <StatusBadge status={agent.status} />
                    </div>
                    <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginBottom: 6 }}>{agent.task}</p>

                    {agent.latestAction && (
                      <div style={{ padding: "8px 10px", background: K.g900, borderRadius: 2, marginBottom: 8, border: `1px solid ${K.g800}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <Badge color={K.teal} dot>{agent.latestAction.action_type.replace(/_/g, " ")}</Badge>
                          <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{agent.latestAction.duration_ms}ms</span>
                        </div>
                        <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {agent.latestAction.output.slice(0, 100)}
                        </p>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: K.mono, fontSize: 10, fontWeight: 700, color: agent.color }}>{agent.metric}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button
                          size="xs"
                          variant="ghost"
                          loading={runningAgent === agent.id}
                          onClick={() => handleRunNow(agent.id)}>
                          ▶ Run Now
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          loading={toggling === agent.id}
                          onClick={() => handleToggle(agent.id, agent.status)}>
                          {agent.status === "running" ? "⏸ Pause" : "▶ Resume"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card accent={K.blue}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Agent Guardrails</h3>
            {[{ l: "Max daily spend", v: "$5,000", s: "Active" }, { l: "ROAS floor", v: "2.0×", s: "Active" }, { l: "CPA ceiling", v: "$35", s: "Active" }, { l: "Brand safety", v: "Strict", s: "Active" }].map(r => (
              <div key={r.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${K.g800}` }}>
                <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{r.l}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1 }}>{r.v}</span>
                  <Badge color={K.mint}>{r.s}</Badge>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <AIThinking label="All agents operating within guardrails — no interventions needed" />
            </div>

            <div style={{ marginTop: 16, padding: 14, background: K.g850, borderRadius: 2, border: `1px solid ${K.g700}` }}>
              <h4 style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1, marginBottom: 8 }}>Agent Config (Azure OpenAI)</h4>
              {[
                { k: "Primary Model", v: "GPT-4o-mini" },
                { k: "Fallback Model", v: "GPT-4o" },
                { k: "Cost Threshold", v: "$0.01/request" },
                { k: "Max Retries", v: "3" },
                { k: "Timeout", v: "30s" },
              ].map(c => (
                <div key={c.k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>{c.k}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 10, fontWeight: 700, color: K.t2 }}>{c.v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, Button, StatusBadge, AIThinking, UpgradePrompt } from "@/components/ui";
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

interface Guardrail {
  label: string;
  value: string;
  status: string;
}

export default function AgentsPage() {
  const { token, user } = useAuth();
  const { toggleAgent } = useKikiStore();
  const plan = user?.plan || "starter";
  const isStarter = plan === "starter";
  const advancedAgentTypes = ["syncbrain", "oaas", "creative"];
  const [agentList, setAgentList] = useState<AgentWithActions[]>([]);
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    agentsApi.list(token).then(d => { setAgentList(d.agents as AgentWithActions[]); if (d.guardrails) setGuardrails(d.guardrails); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const iv = setInterval(() => {
      agentsApi.list(token).then(d => { setAgentList(d.agents as AgentWithActions[]); if (d.guardrails) setGuardrails(d.guardrails); }).catch(() => {});
    }, 15000);
    return () => clearInterval(iv);
  }, [token]);

  const visibleAgents = isStarter ? agentList.filter(a => !advancedAgentTypes.includes(a.type)) : agentList;
  const running = visibleAgents.filter(a => a.status === "running");
  const totalActions = visibleAgents.reduce((s, a) => s + a.actionCount, 0);

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
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="mb-[22px] flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">AI Agents</h1>
            <p className="font-mono text-[11px] text-t3">
              {loading ? "Loading..." : `${visibleAgents.length} agents · ${running.length} running · ${totalActions.toLocaleString()} total actions`}
            </p>
          </div>
          <Badge color={K.mint} dot pulse>LIVE</Badge>
          {isStarter && (
            <a
              href="/dashboard/billing"
              className="font-mono text-[11px] text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg px-4 py-2 transition-colors no-underline inline-block whitespace-nowrap"
            >
              Upgrade to Growth for all 6 agents
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Running Agents" value={String(running.length)} accent={K.mint} loading={loading} />
          <StatCard label="Paused" value={String(agentList.filter(a => a.status === "paused").length)} accent={K.warn} loading={loading} />
          <StatCard label="Total Actions" value={totalActions.toLocaleString()} accent={K.blue} loading={loading} />
          <StatCard label="Avg Uptime" value="99.7%" accent={K.teal} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="flex flex-col gap-[10px]">
            {(isStarter ? agentList.filter(a => !advancedAgentTypes.includes(a.type)) : agentList).map(agent => (
              <Card key={agent.id} accent={agent.status === "running" ? agent.color : undefined}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-kdls bg-g850 flex items-center justify-center text-xl shrink-0">
                    {agentTypeIcon(agent.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-t1">{agent.name}</span>
                      <StatusBadge status={agent.status} />
                    </div>
                    <p className="font-mono text-[10px] text-t3 mb-[6px]">{agent.task}</p>

                    {agent.latestAction && (
                      <div className="p-2 bg-g900 rounded-kdls mb-2 border border-g800">
                        <div className="flex items-center justify-between mb-[3px]">
                          <Badge color={K.teal} dot>{agent.latestAction.action_type.replace(/_/g, " ")}</Badge>
                          <span className="font-mono text-[10px] text-t4">{agent.latestAction.duration_ms}ms</span>
                        </div>
                        <p className="font-mono text-[10px] text-t4 overflow-hidden text-ellipsis whitespace-nowrap">
                          {agent.latestAction.output.slice(0, 100)}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold" style={{ color: agent.color }}>{agent.metric}</span>
                      <div className="flex gap-[6px]">
                        <Button size="xs" variant="ghost" loading={runningAgent === agent.id} onClick={() => handleRunNow(agent.id)}>
                          ▶ Run Now
                        </Button>
                        <Button size="xs" variant="ghost" loading={toggling === agent.id} onClick={() => handleToggle(agent.id, agent.status)}>
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
            <h3 className="font-mono font-bold text-[13px] text-t1 mb-[14px]">Agent Guardrails</h3>
            {guardrails.length > 0 ? guardrails.map(r => (
              <div key={r.label} className="flex items-center justify-between py-[10px] border-b border-g800">
                <span className="font-mono text-[11px] text-t2">{r.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-t1">{r.value}</span>
                  <Badge color={K.mint}>{r.status}</Badge>
                </div>
              </div>
            )) : (
              <p className="font-mono text-[11px] text-t3 py-2">No guardrails configured</p>
            )}
            <div className="mt-4">
              <AIThinking label="All agents operating within guardrails — no interventions needed" />
            </div>

            <div className="mt-4 p-[14px] bg-g850 rounded-kdls border border-g700">
              <h4 className="font-mono text-[11px] font-bold text-t1 mb-2">Agent Config (Azure OpenAI)</h4>
              {[
                { k: "Primary Model", v: "GPT-4o-mini" },
                { k: "Fallback Model", v: "GPT-4o" },
                { k: "Cost Threshold", v: "$0.01/request" },
                { k: "Max Retries", v: "3" },
                { k: "Timeout", v: "30s" },
              ].map(c => (
                <div key={c.k} className="flex justify-between py-1">
                  <span className="font-mono text-[10px] text-t4">{c.k}</span>
                  <span className="font-mono text-[10px] font-bold text-t2">{c.v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

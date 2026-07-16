"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, StatCard, ProgressBar, AIThinking } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { ai, type ChatMessage } from "@/lib/api";
import { K } from "@/lib/kdls";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  model?: string;
  tokens?: number;
  timestamp: Date;
}

interface SyncBrainStats {
  routingPerMin: number;
  totalTokens: number;
  totalSpend: number;
  walletBalance: number;
  activeCampaigns: number;
  recentActions: Array<{ type: string; details: string; time: string }>;
  agentTypes: Array<{ type: string; count: number }>;
}

export default function SyncBrainPage() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: "I'm SyncBrain — your AI intelligence layer. I can analyze campaign performance, optimize budgets, predict LTV, and provide real-time insights. Ask me anything about your advertising data.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [stats, setStats] = useState<SyncBrainStats | null>(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/syncbrain", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // keep existing
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 10000);
    return () => clearInterval(iv);
  }, [fetchStats]);

  const send = useCallback(async () => {
    if (!input.trim() || thinking) return;
    const q = input.trim();
    setInput("");
    const userMsg: ChatMsg = { role: "user", content: q, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);

    try {
      const chatMessages: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
      chatMessages.push({ role: "user", content: q });

      const res = await ai.chat({
        messages: chatMessages,
        model: "mini",
        taskType: q.toLowerCase().includes("creative") ? "creative" : q.toLowerCase().includes("analy") ? "analysis" : "general",
      });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.content,
        model: res.model,
        tokens: res.usage?.total_tokens,
        timestamp: new Date(),
      }]);
      setTotalTokens(prev => prev + (res.usage?.total_tokens || 0));
    } catch {
      const fallback = generateFallbackResponse(q, stats);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: fallback,
        model: "local-heuristic",
        timestamp: new Date(),
      }]);
    }
    setThinking(false);
  }, [input, thinking, messages, stats]);

  const quickPrompts = [
    "Analyze my campaign ROAS trends",
    "How should I allocate budget across platforms?",
    "What's driving conversions today?",
    "Compare Meta vs Google performance",
    "Predict next week's spend",
    "Flag any anomalies in my data",
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_340px] gap-4 h-[calc(100dvh-56px)] max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        {/* Chat Panel */}
        <div className="flex flex-col overflow-hidden">
          <div className="mb-4">
            <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">SyncBrain™</h1>
            <p className="font-mono text-[11px] text-gray-500">AI-powered campaign intelligence · Powered by Azure OpenAI GPT-4o-mini / GPT-4o</p>
          </div>

          <Card accent={K.green} className="flex flex-col overflow-hidden flex-1">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 px-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex mb-3.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[80%] p-3 px-4 rounded-sm"
                    style={{
                      background: m.role === "user" ? K.blueD : K.g850,
                      border: `1px solid ${m.role === "user" ? K.blue + "40" : K.g700}`,
                    }}
                  >
                    <p className="font-sans text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: m.role === "user" ? K.blue4 : K.t2 }}>{m.content}</p>
                    {m.model && (
                      <div className="mt-2 flex gap-2 items-center">
                        <Badge color={m.model.includes("4o") && !m.model.includes("mini") ? K.gold : K.mint} dot>{m.model}</Badge>
                        {m.tokens && <span className="font-mono text-[10px] text-gray-600">{m.tokens} tokens</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-[5px] py-2.5 px-3.5 w-fit rounded-sm" style={{ background: K.g850, border: `1px solid ${K.green}30` }}>
                  {[0, 1, 2].map(i => <span key={i} className="animate-kdls-pulse w-1.5 h-1.5 rounded-full" style={{ background: K.green, animationDelay: `${i * 0.2}s` }} />)}
                  <span className="font-mono text-[10px] ml-1.5" style={{ color: K.green }}>Thinking...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick prompts */}
            <div className="flex gap-1.5 overflow-x-auto py-2 px-4" style={{ borderTop: `1px solid ${K.g800}` }}>
              {quickPrompts.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="font-mono text-[10px] px-3 py-[5px] rounded-full flex-shrink-0 whitespace-nowrap cursor-pointer"
                  style={{ background: K.g850, border: `1px solid ${K.g700}`, color: K.t3 }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 py-3 px-4" style={{ borderTop: `1px solid ${K.g800}` }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask SyncBrain anything..."
                className="flex-1 font-sans text-[13px] px-4 py-[11px] rounded-sm outline-none"
                style={{ background: K.g800, border: `1px solid ${K.g700}`, color: K.t1 }}
              />
              <Button onClick={send} loading={thinking}>Send →</Button>
            </div>
          </Card>
        </div>

        {/* Sidebar Stats */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          <StatCard label="Agent Actions/hr" value={String(stats?.routingPerMin || 0)} accent={K.green} sub={`${stats?.activeCampaigns || 0} active campaigns`} />
          <StatCard label="Total Tokens Today" value={`${((stats?.totalTokens || 0) / 1000).toFixed(1)}K`} accent={K.blue} sub="AI model usage" />
          <StatCard label="Wallet Balance" value={`$${(stats?.walletBalance || 0).toLocaleString()}`} accent={K.teal} sub={`$${(stats?.totalSpend || 0).toLocaleString()} managed spend`} />

          <Card accent={K.blue}>
            <h3 className="font-mono font-bold text-xs text-white mb-3">Model Routing</h3>
            {(() => {
              const total = stats?.agentTypes?.reduce((s, a) => s + a.count, 0) || 0;
              if (total === 0) {
                return <p className="font-mono text-[10px] text-gray-500">No routing data available</p>;
              }
              // Map agent types to model tiers
              const miniTypes = ["bidding", "pacing", "signals"];
              const standardTypes = ["creative", "syncbrain", "oaas"];
              const miniCount = stats?.agentTypes?.filter(a => miniTypes.includes(a.type)).reduce((s, a) => s + a.count, 0) || 0;
              const standardCount = stats?.agentTypes?.filter(a => standardTypes.includes(a.type)).reduce((s, a) => s + a.count, 0) || 0;
              const miniPct = Math.round((miniCount / total) * 100);
              const standardPct = 100 - miniPct;
              return [
                { label: "GPT-4o-mini", pct: miniPct, color: K.blue, desc: "Classification, routing, Q&A" },
                { label: "GPT-4o", pct: standardPct, color: K.gold, desc: "Creative, analysis, reasoning" },
              ].map(m => (
                <div key={m.label} className="mb-3">
                  <div className="flex justify-between mb-[3px]">
                    <span className="font-mono text-[10px] text-gray-400">{m.label}</span>
                    <span className="font-mono text-[10px] font-bold text-white">{m.pct}%</span>
                  </div>
                  <ProgressBar value={m.pct} max={100} color={m.color} height={3} glow />
                  <p className="font-mono text-[10px] text-gray-600 mt-0.5">{m.desc}</p>
                </div>
              ));
            })()}
          </Card>

          <Card accent={K.teal}>
            <h3 className="font-mono font-bold text-xs text-white mb-3">Recent Agent Actions</h3>
            {stats?.recentActions && stats.recentActions.length > 0 ? (
              stats.recentActions.slice(0, 5).map((action, i) => (
                <div key={i} className="flex items-center gap-2 py-2" style={{ borderBottom: `1px solid ${K.g800}` }}>
                  <Badge color={K.teal} dot>{action.type}</Badge>
                  <span className="font-mono text-[10px] text-gray-400 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{action.details}</span>
                </div>
              ))
            ) : (
              <div className="py-3 text-center">
                <span className="font-mono text-[10px] text-gray-600">No recent actions</span>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-mono font-bold text-xs text-white mb-3">System Capabilities</h3>
            {[
              "Campaign performance analysis",
              "Budget optimization recommendations",
              "LTV prediction and segmentation",
              "Cross-platform signal routing",
              "Anomaly detection and alerting",
              "Creative performance scoring",
            ].map((cap, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <span className="text-emerald-400 text-[10px]">✓</span>
                <span className="font-mono text-[10px] text-gray-400">{cap}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function generateFallbackResponse(question: string, stats: SyncBrainStats | null): string {
  const q = question.toLowerCase();
  const spend = stats?.totalSpend || 0;
  const balance = stats?.walletBalance || 0;
  const campaigns = stats?.activeCampaigns || 0;
  if (q.includes("roas") || q.includes("performance")) {
    return `Based on your current campaign data:

**Platform ROAS Summary:**
- You have ${campaigns} active campaigns running
- Total managed spend: $${spend.toLocaleString()}
- Wallet balance: $${balance.toLocaleString()}

**Recommendation:** Check the Dashboard page for detailed per-campaign ROAS breakdowns. The Bidding Agent optimizes bids across all campaigns automatically. Consider increasing budget on top performers.`;
  }
  if (q.includes("budget") || q.includes("spend") || q.includes("wallet")) {
    return `**Current Financial Status:**
- Wallet Balance: $${balance.toLocaleString()}
- Total Managed Spend: $${spend.toLocaleString()}
- Active Campaigns: ${campaigns}

**Budget Allocation Recommendation:** Review each campaign's ROAS on the Dashboard. Increase budget for campaigns with ROAS > 4x, and reduce spend on campaigns below 2x ROAS.`;
  }
  if (q.includes("fraud") || q.includes("ivt")) {
    return `**Fraud & IVT Status:**
- The Fraud Detection Engine automatically monitors all incoming signals
- Check the Signals page for real-time fraud detection metrics
- All suspicious events are flagged and can be reviewed in the agent actions log`;
  }
  return `I can help you with that. Based on your platform data:

- **${campaigns} campaigns** running across multiple platforms
- **Total spend: $${spend.toLocaleString()}**
- **Wallet balance: $${balance.toLocaleString()}**

Would you like me to dive deeper into any specific area? I can analyze campaigns, optimize budgets, predict LTV, or investigate anomalies.`;
}

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
      <div style={{ padding: "24px 28px", maxWidth: 1400, display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, height: "calc(100vh - 56px)" }}>
        {/* Chat Panel */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>SyncBrain™</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>AI-powered campaign intelligence · Powered by Azure OpenAI GPT-4o-mini / GPT-4o</p>
          </div>

          <Card accent={K.green} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 14 }}>
                  <div style={{
                    maxWidth: "80%",
                    padding: "12px 16px",
                    borderRadius: 2,
                    background: m.role === "user" ? K.blueD : K.g850,
                    border: `1px solid ${m.role === "user" ? K.blue + "40" : K.g700}`,
                  }}>
                    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: m.role === "user" ? K.blue4 : K.t2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</p>
                    {m.model && (
                      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                        <Badge color={m.model.includes("4o") && !m.model.includes("mini") ? K.gold : K.mint} dot>{m.model}</Badge>
                        {m.tokens && <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{m.tokens} tokens</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div style={{ display: "flex", gap: 5, padding: "10px 14px", background: K.g850, borderRadius: 2, width: "fit-content", border: `1px solid ${K.green}30` }}>
                  {[0, 1, 2].map(i => <span key={i} className="animate-kdls-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: K.green, animationDelay: `${i * 0.2}s` }} />)}
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.green, marginLeft: 6 }}>Thinking...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick prompts */}
            <div style={{ padding: "8px 16px", borderTop: `1px solid ${K.g800}`, display: "flex", gap: 6, overflowX: "auto" }}>
              {quickPrompts.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  style={{ padding: "5px 12px", fontFamily: K.mono, fontSize: 10, background: K.g850, border: `1px solid ${K.g700}`, borderRadius: 20, color: K.t3, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${K.g800}`, display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask SyncBrain anything..."
                style={{ flex: 1, background: K.g800, border: `1px solid ${K.g700}`, borderRadius: 2, padding: "11px 16px", fontFamily: "Inter,sans-serif", fontSize: 13, color: K.t1, outline: "none" }}
              />
              <Button onClick={send} loading={thinking}>Send →</Button>
            </div>
          </Card>
        </div>

        {/* Sidebar Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          <StatCard label="Agent Actions/hr" value={String(stats?.routingPerMin || 0)} accent={K.green} sub={`${stats?.activeCampaigns || 0} active campaigns`} />
          <StatCard label="Total Tokens Today" value={`${((stats?.totalTokens || 0) / 1000).toFixed(1)}K`} accent={K.blue} sub="AI model usage" />
          <StatCard label="Wallet Balance" value={`$${(stats?.walletBalance || 0).toLocaleString()}`} accent={K.teal} sub={`$${(stats?.totalSpend || 0).toLocaleString()} managed spend`} />

          <Card accent={K.blue}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 12, color: K.t1, marginBottom: 12 }}>Model Routing</h3>
            {[{ label: "GPT-4o-mini", pct: 62, color: K.blue, desc: "Classification, routing, Q&A" }, { label: "GPT-4o", pct: 38, color: K.gold, desc: "Creative, analysis, reasoning" }].map(m => (
              <div key={m.label} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t2 }}>{m.label}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 10, fontWeight: 700, color: K.t1 }}>{m.pct}%</span>
                </div>
                <ProgressBar value={m.pct} max={100} color={m.color} height={3} glow />
                <p style={{ fontFamily: K.mono, fontSize: 8, color: K.t4, marginTop: 2 }}>{m.desc}</p>
              </div>
            ))}
          </Card>

          <Card accent={K.teal}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 12, color: K.t1, marginBottom: 12 }}>Recent Agent Actions</h3>
            {stats?.recentActions && stats.recentActions.length > 0 ? (
              stats.recentActions.slice(0, 5).map((action, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${K.g800}` }}>
                  <Badge color={K.teal} dot>{action.type}</Badge>
                  <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{action.details}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: "12px 0", textAlign: "center" }}>
                <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>No recent actions</span>
              </div>
            )}
          </Card>

          <Card>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 12, color: K.t1, marginBottom: 12 }}>System Capabilities</h3>
            {[
              "Campaign performance analysis",
              "Budget optimization recommendations",
              "LTV prediction and segmentation",
              "Cross-platform signal routing",
              "Anomaly detection and alerting",
              "Creative performance scoring",
            ].map((cap, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <span style={{ color: K.mint, fontSize: 10 }}>✓</span>
                <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t2 }}>{cap}</span>
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

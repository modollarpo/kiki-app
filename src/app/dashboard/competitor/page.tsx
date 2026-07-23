"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard, Badge, Button, ScrollableTable } from "@/components/ui";
import { K } from "@/lib/kdls";
import { competitor as competitorApi } from "@/lib/api";

interface CompetitorConfig {
  id: string;
  domain: string;
  productCategory: string;
  priceDropThreshold: number;
  lastCheckedAt?: number;
  status: string;
}

interface DefensiveAction {
  platform: string;
  action: string;
  campaignName: string;
  reason: string;
  executed: boolean;
}

interface ArbitrageResult {
  competitorDomain: string;
  priceDropPct: number;
  defensiveActions: DefensiveAction[];
  creativeQueued: boolean;
  summary: string;
}

const PLATFORM_EMOJI: Record<string, string> = {
  meta: "🟦", google: "🔴", tiktok: "⬛", snap: "🟡",
  pinterest: "🔴", linkedin: "🔵",
};

const ACTION_COLOR: Record<string, string> = {
  increase_bid: K.mint,
  pause_campaign: K.warn,
  queue_counter_offer: K.blue,
  hold_spend: K.gold,
};

export default function CompetitorPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [configs, setConfigs] = useState<CompetitorConfig[]>([]);
  const [results, setResults] = useState<ArbitrageResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const json = await competitorApi.list(token);
      if (json.ok) setConfigs(json.configs);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRunMonitor = async () => {
    if (!token) return;
    setRunning(true);
    setResults([]);
    try {
      const json = await competitorApi.runMonitor(token);
      if (json.ok) {
        setResults(json.results);
        setLastSummary(`Checked ${json.configsChecked} competitor(s) — ${json.dropsDetected} price drop(s) detected`);
        await fetchData();
      }
    } finally {
      setRunning(false);
    }
  };

  const handleAddCompetitor = async () => {
    if (!token || !newDomain.trim()) return;
    setAdding(true);
    try {
      const json = await competitorApi.addCompetitor(token, newDomain.trim(), newCategory);
      if (json.ok) {
        setNewDomain("");
        await fetchData();
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1400, padding: "clamp(14px,3vw,28px)" }}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-mono font-bold text-[clamp(16px,2.5vw,20px)] tracking-tight mb-1" style={{ color: K.t1 }}>
              Competitor Intelligence
            </h1>
            <p className="font-mono text-[11px]" style={{ color: K.t3 }}>
              Real-time competitor price monitoring · Autonomous cross-platform defensive response
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleRunMonitor}
              disabled={running || configs.length === 0}
              style={{ background: K.danger, color: "#fff", border: "none", opacity: running ? 0.6 : 1 }}
            >
              {running ? "⚡ Scanning..." : "⬟ Run Monitor"}
            </Button>
          </div>
        </div>

        {lastSummary && (
          <div className="mb-4 px-4 py-3 rounded font-mono text-[11px]" style={{ background: K.g850, border: `1px solid ${K.mint}`, color: K.mint }}>
            ✅ {lastSummary}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Competitors Tracked" value={loading ? "…" : String(configs.length)} accent={K.danger} />
          <StatCard label="Drops Detected" value={String(results.length)} accent={K.warn} />
          <StatCard label="Actions Taken" value={String(results.reduce((s, r) => s + r.defensiveActions.filter(a => a.executed).length, 0))} accent={K.mint} />
          <StatCard label="Platforms Protected" value="6" accent={K.blue} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Competitors List */}
          <Card padding={0}>
            <div className="px-5 py-4 border-b" style={{ borderColor: K.cardBorder }}>
              <h2 className="font-mono font-bold text-[13px]" style={{ color: K.t1 }}>Monitored Competitors</h2>
            </div>
            {!configs.length ? (
              <div className="px-5 py-8 text-center font-mono text-[11px]" style={{ color: K.t3 }}>
                No competitors added yet — add one below
              </div>
            ) : (
              configs.map(c => (
                <div key={c.id} className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: K.g900 }}>
                  <div>
                    <p className="font-mono text-[12px] font-semibold" style={{ color: K.t1 }}>{c.domain}</p>
                    <p className="font-mono text-[10px]" style={{ color: K.t3 }}>
                      {c.productCategory} · alert at &gt;{c.priceDropThreshold}% drop
                      {c.lastCheckedAt ? ` · checked ${new Date(c.lastCheckedAt).toLocaleTimeString()}` : ""}
                    </p>
                  </div>
                  <Badge color={c.status === "active" ? K.mint : K.t3}>{c.status}</Badge>
                </div>
              ))
            )}
            {/* Add Competitor Form */}
            <div className="px-5 py-4 border-t" style={{ borderColor: K.cardBorder }}>
              <p className="font-mono text-[10px] mb-3" style={{ color: K.t3 }}>ADD COMPETITOR</p>
              <div className="flex gap-2 flex-wrap">
                <input
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  placeholder="competitor-store.com"
                  className="font-mono text-[11px] px-3 py-2 rounded flex-1 min-w-[140px]"
                  style={{ background: K.g900, border: `1px solid ${K.cardBorder}`, color: K.t1, outline: "none" }}
                />
                <input
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="category"
                  className="font-mono text-[11px] px-3 py-2 rounded w-24"
                  style={{ background: K.g900, border: `1px solid ${K.cardBorder}`, color: K.t1, outline: "none" }}
                />
                <Button
                  onClick={handleAddCompetitor}
                  disabled={adding || !newDomain.trim()}
                  size="sm"
                  style={{ background: K.blue, color: K.t1, border: "none", opacity: adding ? 0.6 : 1 }}
                >
                  {adding ? "…" : "+ Add"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Defensive Response Playbook */}
          <Card>
            <h2 className="font-mono font-bold text-[13px] mb-4" style={{ color: K.t1 }}>⚡ Defensive Response Playbook</h2>
            <div className="space-y-3">
              {[
                { platform: "Google", action: "Bid +15% on competitor keywords immediately", icon: "🔴", color: "#ef4444" },
                { platform: "Meta", action: "Queue counter-offer creative for Slack approval", icon: "🟦", color: "#3b82f6" },
                { platform: "TikTok", action: "Queue counter-offer creative for Slack approval", icon: "⬛", color: "#f0f0f0" },
                { platform: "Snap", action: "Queue counter-offer creative for Slack approval", icon: "🟡", color: "#f59e0b" },
                { platform: "LinkedIn", action: "Pause B2B campaigns (reduce wasted CPCs)", icon: "🔵", color: "#0a66c2" },
                { platform: "Pinterest", action: "Hold discovery spend — reduce bids 20%", icon: "🔴", color: "#bd1e2d" },
              ].map(p => (
                <div key={p.platform} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: K.g900 }}>
                  <span className="text-base shrink-0">{p.icon}</span>
                  <div>
                    <p className="font-mono text-[11px] font-bold" style={{ color: p.color }}>{p.platform}</p>
                    <p className="font-mono text-[10px]" style={{ color: K.t3 }}>{p.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Arbitrage Results */}
        {results.length > 0 && (
          <Card padding={0}>
            <div className="px-5 py-4 border-b" style={{ borderColor: K.cardBorder }}>
              <h2 className="font-mono font-bold text-[13px]" style={{ color: K.t1 }}>🚨 Latest Arbitrage Actions</h2>
            </div>
            {results.map((r, i) => (
              <div key={i} className="border-b" style={{ borderColor: K.g900 }}>
                <div className="px-5 py-3" style={{ background: K.g950 }}>
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <span className="font-mono text-[12px] font-bold" style={{ color: K.danger }}>{r.competitorDomain}</span>
                    <Badge color={K.danger}>{`-${r.priceDropPct.toFixed(1)}% price drop`}</Badge>
                    {r.creativeQueued && <Badge color={K.blue}>counter-offer queued</Badge>}
                  </div>
                  <p className="font-mono text-[10px]" style={{ color: K.t3 }}>{r.summary}</p>
                </div>
                <ScrollableTable>
                  <div style={{ minWidth: 500 }}>
                    {r.defensiveActions.map((a, j) => (
                      <div key={j} className="grid px-5 py-2 border-b gap-4 items-center" style={{ gridTemplateColumns: "80px 1fr 140px 60px", borderColor: K.g900 }}>
                        <span className="font-mono text-[10px]">{PLATFORM_EMOJI[a.platform] ?? "📢"} {a.platform}</span>
                        <span className="font-mono text-[10px]" style={{ color: K.t2 }}>{a.campaignName || a.reason}</span>
                        <Badge color={ACTION_COLOR[a.action] ?? K.t3}>{a.action.replace(/_/g, " ")}</Badge>
                        <Badge color={a.executed ? K.mint : K.danger}>{a.executed ? "done" : "failed"}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollableTable>
              </div>
            ))}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}


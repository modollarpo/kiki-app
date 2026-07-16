"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, StatCard, AIThinking } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { K } from "@/lib/kdls";

interface Signal {
  id: string;
  platform: string;
  eventType: string;
  value: number;
  ltvPredicted: number;
  ltvConfidence: number;
  segment: string;
  bidMultiplier: number;
  enriched: boolean;
  timestamp: string;
}

interface SignalStats {
  totalSignals: number;
  processedSignals: number;
  avgLtv: number;
  avgConfidence: number;
  platformBreakdown: Record<string, number>;
  recentSignals: Signal[];
}

export default function SignalsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSignals = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/signals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchSignals, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchSignals]);

  const platformColors: Record<string, string> = {
    meta: K.blue,
    google: K.mint,
    tiktok: K.teal,
    linkedin: K.indigo,
    snap: K.gold,
    pinterest: K.warn,
  };

  const totalSignals = stats?.totalSignals || 0;
  const processedSignals = stats?.processedSignals || 0;
  const avgLtv = stats?.avgLtv || 0;
  const avgConfidence = stats?.avgConfidence || 0;
  const recentSignals = stats?.recentSignals || [];
  const platformBreakdown = stats?.platformBreakdown || {};

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="flex justify-between items-start mb-[22px]">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Signal Processing</h1>
            <p className="font-mono text-[11px] text-t3">Real-time conversion signals · LTV enrichment · {recentSignals.length > 0 ? `${recentSignals.length} recent signals` : "No signals yet"}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-[6px] font-mono text-[10px] font-semibold rounded-kdls cursor-pointer transition-colors ${
                autoRefresh ? "bg-kgreen/20 border border-kgreen/40 text-kgreen" : "bg-g900 border border-g800 text-t3"
              }`}>
              {autoRefresh ? "● LIVE" : "○ PAUSED"}
            </button>
            <Button onClick={fetchSignals} variant="ghost" size="sm">Refresh</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-[60px]">
            <AIThinking text="Loading signals..." />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard label="Total Signals" value={totalSignals.toLocaleString()} accent={K.green} sub="All time" />
              <StatCard label="Processed" value={processedSignals.toLocaleString()} accent={K.mint} sub={`${totalSignals > 0 ? ((processedSignals / totalSignals) * 100).toFixed(1) : 0}% enrichment rate`} />
              <StatCard label="Avg Predicted LTV" value={`$${avgLtv.toFixed(2)}`} accent={K.blue} sub="Per conversion" />
              <StatCard label="Avg Confidence" value={`${(avgConfidence * 100).toFixed(1)}%`} accent={K.gold} sub="Model accuracy" />
            </div>

            {Object.keys(platformBreakdown).length > 0 && (
              <Card accent={K.blue} className="mb-4">
                <h3 className="font-mono font-bold text-xs text-t1 mb-3">Platform Breakdown</h3>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(platformBreakdown).length, 6)}, 1fr)` }}>
                  {Object.entries(platformBreakdown).map(([platform, count]) => (
                    <div key={platform} className="p-3 bg-g850 rounded-kdls border border-g800"
                      style={{ borderColor: `${platformColors[platform] || K.t3}30` }}>
                      <p className="font-mono text-[10px] tracking-widest text-t4 mb-[6px]">PLATFORM</p>
                      <p className="font-mono text-sm font-bold capitalize"
                        style={{ color: platformColors[platform] || K.t1 }}>{platform}</p>
                      <p className="font-mono text-[11px] text-t2 mt-1">{count.toLocaleString()} signals</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card accent={K.green}>
              <div className="px-5 py-[14px] border-b border-g800 flex justify-between items-center">
                <h2 className="font-mono font-bold text-[13px] text-t1">Recent Signals</h2>
                {autoRefresh && (
                  <div className="flex gap-[5px] items-center">
                    {[0, 1, 2].map(i => <span key={i} className="animate-kdls-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: K.green, animationDelay: `${i * 0.2}s` }} />)}
                    <span className="font-mono text-[10px] text-kgreen ml-1">Live</span>
                  </div>
                )}
              </div>
              {recentSignals.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-mono text-xs text-t4">No signals processed yet. Send a signal via POST /api/signals to see data here.</p>
                </div>
              ) : (
                recentSignals.map((signal, i) => (
                  <div key={signal.id || i}
                    className="px-5 py-3 grid grid-cols-[140px_120px_1fr_120px_100px_80px] gap-3 items-center"
                    style={{ borderBottom: i < recentSignals.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                    <div>
                      <Badge color={platformColors[signal.platform] || K.t3} dot>{signal.platform}</Badge>
                    </div>
                    <span className="font-mono text-[11px] text-t2">{signal.eventType}</span>
                    <div>
                      <p className="font-mono text-[11px] text-t1 mb-[2px]">LTV: ${signal.ltvPredicted.toFixed(2)}</p>
                      <p className="font-mono text-[10px] text-t4">Confidence: {(signal.ltvConfidence * 100).toFixed(1)}%</p>
                    </div>
                    <Badge color={signal.segment === "high" ? K.mint : signal.segment === "medium" ? K.gold : K.t3}>{signal.segment}</Badge>
                    <span className="font-mono text-[11px] text-t2">{signal.bidMultiplier.toFixed(2)}x</span>
                    <Badge color={signal.enriched ? K.mint : K.warn}>{signal.enriched ? "✓" : "..."}</Badge>
                  </div>
                ))
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

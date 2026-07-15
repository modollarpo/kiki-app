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
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Signal Processing</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Real-time conversion signals · LTV enrichment · {recentSignals.length > 0 ? `${recentSignals.length} recent signals` : "No signals yet"}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              style={{ padding: "6px 14px", fontFamily: K.mono, fontSize: 10, fontWeight: 600, background: autoRefresh ? K.green + "20" : K.g900, border: `1px solid ${autoRefresh ? K.green + "40" : K.g800}`, borderRadius: 2, color: autoRefresh ? K.green : K.t3, cursor: "pointer" }}>
              {autoRefresh ? "● LIVE" : "○ PAUSED"}
            </button>
            <Button onClick={fetchSignals} variant="ghost" size="sm">Refresh</Button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <AIThinking text="Loading signals..." />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Total Signals" value={totalSignals.toLocaleString()} accent={K.green} sub="All time" />
              <StatCard label="Processed" value={processedSignals.toLocaleString()} accent={K.mint} sub={`${totalSignals > 0 ? ((processedSignals / totalSignals) * 100).toFixed(1) : 0}% enrichment rate`} />
              <StatCard label="Avg Predicted LTV" value={`$${avgLtv.toFixed(2)}`} accent={K.blue} sub="Per conversion" />
              <StatCard label="Avg Confidence" value={`${(avgConfidence * 100).toFixed(1)}%`} accent={K.gold} sub="Model accuracy" />
            </div>

            {Object.keys(platformBreakdown).length > 0 && (
              <Card accent={K.blue} style={{ marginBottom: 16 }}>
                <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 12, color: K.t1, marginBottom: 12 }}>Platform Breakdown</h3>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(Object.keys(platformBreakdown).length, 6)}, 1fr)`, gap: 12 }}>
                  {Object.entries(platformBreakdown).map(([platform, count]) => (
                    <div key={platform} style={{ padding: "12px 16px", background: K.g850, borderRadius: 2, border: `1px solid ${(platformColors[platform] || K.t3)}30` }}>
                      <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4, marginBottom: 6 }}>PLATFORM</p>
                      <p style={{ fontFamily: K.mono, fontSize: 14, fontWeight: 700, color: platformColors[platform] || K.t1, textTransform: "capitalize" }}>{platform}</p>
                      <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t2, marginTop: 4 }}>{count.toLocaleString()} signals</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card accent={K.green}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>Recent Signals</h2>
                {autoRefresh && (
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(i => <span key={i} className="animate-kdls-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: K.green, animationDelay: `${i * 0.2}s` }} />)}
                    <span style={{ fontFamily: K.mono, fontSize: 9, color: K.green, marginLeft: 4 }}>Live</span>
                  </div>
                )}
              </div>
              {recentSignals.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <p style={{ fontFamily: K.mono, fontSize: 12, color: K.t4 }}>No signals processed yet. Send a signal via POST /api/signals to see data here.</p>
                </div>
              ) : (
                recentSignals.map((signal, i) => (
                  <div key={signal.id || i} style={{
                    padding: "12px 20px",
                    borderBottom: i < recentSignals.length - 1 ? `1px solid ${K.g900}` : undefined,
                    display: "grid",
                    gridTemplateColumns: "140px 120px 1fr 120px 100px 80px",
                    gap: 12,
                    alignItems: "center",
                  }}>
                    <div>
                      <Badge color={platformColors[signal.platform] || K.t3} dot>{signal.platform}</Badge>
                    </div>
                    <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{signal.eventType}</span>
                    <div>
                      <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t1, marginBottom: 2 }}>LTV: ${signal.ltvPredicted.toFixed(2)}</p>
                      <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Confidence: {(signal.ltvConfidence * 100).toFixed(1)}%</p>
                    </div>
                    <Badge color={signal.segment === "high" ? K.mint : signal.segment === "medium" ? K.gold : K.t3}>{signal.segment}</Badge>
                    <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{signal.bidMultiplier.toFixed(2)}x</span>
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

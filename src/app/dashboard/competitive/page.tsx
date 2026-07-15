"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Competitor {
  name: string; platform: string; spend: number; roas: number;
  cpa: number; marketShare: number; trend: string;
}

interface MarketTrend {
  metric: string; value: string; change: string; direction: string;
}

export default function CompetitiveIntelligencePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [sov, setSov] = useState<{ yourShare: number; topCompetitor: number; industryAvg: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/competitive")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCompetitors(d.data.competitors);
          setTrends(d.data.marketTrends);
          setSov(d.data.shareOfVoice);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400, color: K.t1 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Competitive Intelligence</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Track competitor ad spend, benchmarks, and market share</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Market Share" value={sov ? `${sov.yourShare}%` : "—"} delta={2.3} sub="+2.3% vs last quarter" accent={K.mint} loading={loading} />
          <StatCard label="Top Competitor" value={sov ? `${sov.topCompetitor}%` : "—"} sub="Share of voice" accent={K.warn} loading={loading} />
          <StatCard label="Industry Average" value={sov ? `${sov.industryAvg}%` : "—"} sub="Market benchmark" accent={K.t3} loading={loading} />
          <StatCard label="Competitors Tracked" value={competitors.length > 0 ? String(competitors.length - 1) : "—"} sub="Active monitoring" accent={K.blue} loading={loading} />
        </div>

        <Card accent={K.mint} style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Competitor Spend Tracker</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {competitors.map((comp, i) => {
              const isYou = comp.name === "Your Account";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: isYou ? K.g850 : K.g900, borderRadius: 2, borderLeft: isYou ? `3px solid ${K.mint}` : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 600, color: K.t1 }}>{comp.name}</span>
                      {isYou && <Badge color={K.mint}>You</Badge>}
                      <Badge color={comp.platform === "meta" ? "#1877F2" : comp.platform === "google" ? "#4285F4" : comp.platform === "tiktok" ? "#000" : K.t3}>{comp.platform}</Badge>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 80 }}>
                    <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>${(comp.spend / 1000).toFixed(0)}K</p>
                    <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>spend</p>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 60 }}>
                    <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: comp.roas >= 4 ? K.mint : comp.roas >= 2.5 ? K.warn : K.danger }}>{comp.roas}×</p>
                    <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>ROAS</p>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 60 }}>
                    <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>${comp.cpa.toFixed(2)}</p>
                    <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>CPA</p>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 60 }}>
                    <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.gold }}>{comp.marketShare}%</p>
                    <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>share</p>
                  </div>
                  <span style={{ fontFamily: K.mono, fontSize: 14, color: comp.trend === "up" ? K.mint : K.danger }}>{comp.trend === "up" ? "↑" : "↓"}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card accent={K.blue}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Market Trends</h3>
            {trends.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < trends.length - 1 ? `1px solid ${K.g800}` : undefined }}>
                <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{t.metric}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>{t.value}</span>
                  <Badge color={t.direction === "up" ? K.mint : K.danger}>{t.change}</Badge>
                </div>
              </div>
            ))}
          </Card>

          <Card accent={K.gold}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>CPM Benchmarks</h3>
            {[
              { platform: "Google Display", yours: 7.2, benchmark: 8.4, industry: 9.1 },
              { platform: "Meta Feed", yours: 11.8, benchmark: 12.6, industry: 14.2 },
              { platform: "TikTok", yours: 5.9, benchmark: 6.8, industry: 7.4 },
              { platform: "YouTube", yours: 16.4, benchmark: 18.2, industry: 20.1 },
            ].map((b, i) => (
              <div key={i} style={{ padding: "10px 12px", marginBottom: 8, background: K.g850, borderRadius: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{b.platform}</span>
                  <Badge color={b.yours < b.benchmark ? K.mint : K.warn}>{b.yours < b.benchmark ? "Below" : "Above"} Benchmark</Badge>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                  <div>
                    <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Yours</p>
                    <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.mint }}>${b.yours}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Benchmark</p>
                    <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t2 }}>${b.benchmark}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Industry</p>
                    <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t3 }}>${b.industry}</p>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface ChannelMargin { name: string; spend: number; revenue: number; margin: number; cac: number; ltv: number; }

export default function ProfitMarginPage() {
  const [overview, setOverview] = useState<{ avgMargin: number; profitAdjCAC: number; grossProfit: number } | null>(null);
  const [channels, setChannels] = useState<ChannelMargin[]>([]);
  const [trend, setTrend] = useState<{ month: string; margin: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/margin")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setOverview(d.data.overview);
          setChannels(d.data.byChannel);
          setTrend(d.data.marginTrend);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400, color: K.t1 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Profit Margin Center</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Channel-level margins and profit-adjusted acquisition costs</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Avg Margin" value={overview ? `${overview.avgMargin}%` : "—"} delta={3.2} sub="+3.2% this quarter" accent={K.mint} loading={loading} />
          <StatCard label="Profit-Adj CAC" value={overview ? `$${overview.profitAdjCAC}` : "—"} delta={-4.8} sub="-$4.80 improvement" accent={K.blue} loading={loading} />
          <StatCard label="Gross Profit" value={overview ? `$${(overview.grossProfit / 1000).toFixed(0)}K` : "—"} delta={180} sub="+$180K vs last month" accent={K.mint} loading={loading} />
          <StatCard label="Channels" value={channels.length > 0 ? String(channels.length) : "—"} sub="Tracked channels" accent={K.teal} loading={loading} />
        </div>

        <Card accent={K.mint} style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Channel Margins</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {channels.map((ch, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: K.g900, borderRadius: 2 }}>
                <div style={{ minWidth: 100 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{ch.name}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>MARGIN</span>
                    <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: ch.margin > 75 ? K.mint : ch.margin > 60 ? K.gold : K.danger }}>{ch.margin}%</span>
                  </div>
                  <ProgressBar value={ch.margin} color={ch.margin > 75 ? K.mint : ch.margin > 60 ? K.gold : K.danger} height={4} />
                </div>
                <div style={{ textAlign: "right", minWidth: 70 }}>
                  <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>${(ch.spend / 1000).toFixed(0)}K</p>
                  <p style={{ fontFamily: K.mono, fontSize: 8, color: K.t4 }}>spend</p>
                </div>
                <div style={{ textAlign: "right", minWidth: 70 }}>
                  <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.mint }}>${(ch.revenue / 1000).toFixed(0)}K</p>
                  <p style={{ fontFamily: K.mono, fontSize: 8, color: K.t4 }}>revenue</p>
                </div>
                <div style={{ textAlign: "right", minWidth: 50 }}>
                  <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.blue }}>${ch.cac}</p>
                  <p style={{ fontFamily: K.mono, fontSize: 8, color: K.t4 }}>CAC</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card accent={K.teal}>
          <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Margin Trend (Last 6 Months)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {trend.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: K.g850, borderRadius: 2 }}>
                <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, minWidth: 30 }}>{t.month}</span>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={t.margin} color={K.mint} height={4} />
                </div>
                <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.mint, minWidth: 40, textAlign: "right" }}>{t.margin}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

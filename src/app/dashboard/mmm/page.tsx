"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Channel {
  name: string; contribution: number; share: number; roi: number;
  optimal: number; elasticity: number;
}

export default function MixModellingPage() {
  const [modelFit, setModelFit] = useState<{ rSquared: number; adjRSquared: number; aic: number; bic: number } | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [budgetRec, setBudgetRec] = useState<{ current: number; optimal: number; lift: number; confidence: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mmm")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setModelFit(d.data.modelFit);
          setChannels(d.data.channels);
          setBudgetRec(d.data.budgetRecommendation);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalContribution = channels.reduce((s, c) => s + c.contribution, 0);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400, color: K.t1 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Marketing Mix Modelling</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Statistical analysis of channel contributions and budget optimization</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Model R² Score" value={modelFit ? String(modelFit.rSquared) : "—"} sub="High accuracy" accent={K.mint} loading={loading} />
          <StatCard label="Total Contribution" value={totalContribution > 0 ? `$${(totalContribution / 1000000).toFixed(2)}M` : "—"} delta={18} sub="+18% vs last quarter" accent={K.blue} loading={loading} />
          <StatCard label="Optimal Spend" value={budgetRec ? `$${(budgetRec.optimal / 1000).toFixed(0)}K` : "—"} delta={budgetRec?.lift} sub={`+${budgetRec?.lift || 0}% lift recommended`} accent={K.gold} loading={loading} />
          <StatCard label="Channels Tracked" value={channels.length > 0 ? String(channels.length) : "—"} sub="Active channels" accent={K.teal} loading={loading} />
        </div>

        <Card accent={K.mint} style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Channel Contribution Analysis</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {channels.map((ch, i) => {
              const sharePct = totalContribution > 0 ? (ch.contribution / totalContribution) * 100 : 0;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: K.g900, borderRadius: 2 }}>
                  <div style={{ minWidth: 120 }}>
                    <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{ch.name}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>CONTRIBUTION</span>
                      <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.mint }}>${(ch.contribution / 1000).toFixed(0)}K</span>
                    </div>
                    <ProgressBar value={sharePct} color={K.mint} height={4} />
                  </div>
                  <div style={{ textAlign: "right", minWidth: 50 }}>
                    <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: ch.roi >= 5 ? K.mint : ch.roi >= 3 ? K.gold : K.danger }}>{ch.roi}×</p>
                    <p style={{ fontFamily: K.mono, fontSize: 8, color: K.t4 }}>ROAS</p>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 50 }}>
                    <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: ch.elasticity > 0.7 ? K.mint : K.t2 }}>{ch.elasticity}</p>
                    <p style={{ fontFamily: K.mono, fontSize: 8, color: K.t4 }}>elasticity</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card accent={K.teal}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Budget Recommendation</h3>
            <div style={{ padding: "14px", background: K.g850, borderRadius: 2, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>Current Annual Spend</span>
                <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>${budgetRec ? (budgetRec.current / 1000000).toFixed(2) : "—"}M</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>Optimal Spend</span>
                <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.mint }}>${budgetRec ? (budgetRec.optimal / 1000000).toFixed(2) : "—"}M</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>Projected Lift</span>
                <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.mint }}>+{budgetRec?.lift || 0}%</span>
              </div>
            </div>
            <div style={{ padding: "10px 14px", background: `${K.mint}10`, border: `1px solid ${K.mint}30`, borderRadius: 2 }}>
              <span style={{ fontFamily: K.mono, fontSize: 10, color: K.mint }}>Recommendation: Increase spend by {budgetRec ? `$${((budgetRec.optimal - budgetRec.current) / 1000).toFixed(0)}K` : "—"} annually for maximum ROI</span>
            </div>
          </Card>

          <Card accent={K.gold}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Model Performance</h3>
            {[
              { label: "R² Score", value: modelFit?.rSquared || 0, max: 1, color: K.mint },
              { label: "Adjusted R²", value: modelFit?.adjRSquared || 0, max: 1, color: K.blue },
            ].map((m, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{m.label}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1 }}>{m.value.toFixed(3)}</span>
                </div>
                <ProgressBar value={m.value * 100} color={m.color} height={5} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <div style={{ padding: "8px 12px", background: K.g850, borderRadius: 2, textAlign: "center" }}>
                <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>AIC</p>
                <p style={{ fontFamily: K.mono, fontSize: 14, fontWeight: 700, color: K.t1 }}>{modelFit?.aic || "—"}</p>
              </div>
              <div style={{ padding: "8px 12px", background: K.g850, borderRadius: 2, textAlign: "center" }}>
                <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>BIC</p>
                <p style={{ fontFamily: K.mono, fontSize: 14, fontWeight: 700, color: K.t1 }}>{modelFit?.bic || "—"}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

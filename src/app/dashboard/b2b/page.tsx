"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Pipeline { totalValue: number; deals: number; avgSize: number; winRate: number; }
interface Stage { name: string; count: number; value: number; color: string; }
interface Account { name: string; value: number; stage: string; owner: string; daysInStage: number; }

export default function B2BPage() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/b2b")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPipeline(d.data.pipeline);
          setStages(d.data.stages);
          setAccounts(d.data.topAccounts);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalStageValue = stages.reduce((s, st) => s + st.value, 0);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400, color: K.t1 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>B2B Pipeline</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Account-based metrics and pipeline tracking</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Pipeline Value" value={pipeline ? `$${(pipeline.totalValue / 1000).toFixed(0)}K` : "—"} delta={340} sub="+$340K this quarter" accent={K.mint} loading={loading} />
          <StatCard label="Total Deals" value={pipeline ? String(pipeline.deals) : "—"} sub="Active opportunities" accent={K.blue} loading={loading} />
          <StatCard label="Avg Deal Size" value={pipeline ? `$${(pipeline.avgSize / 1000).toFixed(1)}K` : "—"} sub="Per deal" accent={K.gold} loading={loading} />
          <StatCard label="Win Rate" value={pipeline ? `${pipeline.winRate}%` : "—"} delta={3.2} sub="+3.2% improvement" accent={K.mint} loading={loading} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 12, marginBottom: 16 }}>
          <Card accent={K.blue}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Pipeline Stages</h3>
            {stages.map((stage, i) => {
              const pct = totalStageValue > 0 ? (stage.value / totalStageValue) * 100 : 0;
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{stage.name}</span>
                    <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1 }}>${(stage.value / 1000).toFixed(0)}K · {stage.count} deals</span>
                  </div>
                  <ProgressBar value={pct} color={stage.color} height={5} />
                </div>
              );
            })}
          </Card>

          <Card accent={K.teal}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Top Accounts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {accounts.map((account, i) => (
                <div key={i} style={{ padding: "10px 12px", background: K.g850, borderRadius: 2, borderLeft: `3px solid ${account.stage === "Closed Won" ? K.mint : account.stage === "Negotiation" ? K.gold : K.blue}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{account.name}</span>
                    <Badge color={account.stage === "Closed Won" ? K.mint : account.stage === "Negotiation" ? K.gold : K.blue}>{account.stage}</Badge>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{account.owner} · {account.daysInStage}d in stage</span>
                    <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.mint }}>${(account.value / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card accent={K.gold}>
          <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Channel Attribution</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {[
              { channel: "LinkedIn", credit: 32.4, pipeline: 376000, deals: 8, color: "#0A66C2" },
              { channel: "Google", credit: 28.1, pipeline: 326000, deals: 12, color: "#4285F4" },
              { channel: "Email", credit: 18.6, pipeline: 216000, deals: 6, color: K.teal },
              { channel: "Webinars", credit: 12.8, pipeline: 148000, deals: 4, color: K.gold },
              { channel: "Direct", credit: 8.1, pipeline: 94000, deals: 3, color: K.t3 },
            ].map((ch, i) => (
              <div key={i} style={{ padding: "14px", background: K.g850, borderRadius: 2, textAlign: "center" }}>
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginBottom: 4 }}>{ch.channel}</p>
                <p style={{ fontFamily: K.mono, fontSize: 20, fontWeight: 700, color: ch.color }}>{ch.credit}%</p>
                <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginTop: 2 }}>${(ch.pipeline / 1000).toFixed(0)}K · {ch.deals} deals</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

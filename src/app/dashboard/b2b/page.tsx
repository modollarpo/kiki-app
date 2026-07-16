"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Pipeline { totalValue: number; deals: number; avgSize: number; winRate: number; }
interface Stage { name: string; count: number; value: number; color: string; }
interface Account { name: string; value: number; stage: string; owner: string; daysInStage: number; }
interface ChannelAttribution { channel: string; credit: number; pipeline: number; deals: number; }

export default function B2BPage() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [channelAttribution, setChannelAttribution] = useState<ChannelAttribution[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/b2b", { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPipeline(d.data.pipeline);
          setStages(d.data.stages);
          setAccounts(d.data.topAccounts);
          if (d.data.channelAttribution) setChannelAttribution(d.data.channelAttribution);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  const totalStageValue = stages.reduce((s, st) => s + st.value, 0);

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-white">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">B2B Pipeline</h1>
          <p className="font-mono text-[11px] text-gray-500">Account-based metrics and pipeline tracking</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Pipeline Value" value={pipeline ? `$${(pipeline.totalValue / 1000).toFixed(0)}K` : "—"} delta={340} sub="+$340K this quarter" accent={K.mint} loading={loading} />
          <StatCard label="Total Deals" value={pipeline ? String(pipeline.deals) : "—"} sub="Active opportunities" accent={K.blue} loading={loading} />
          <StatCard label="Avg Deal Size" value={pipeline ? `$${(pipeline.avgSize / 1000).toFixed(1)}K` : "—"} sub="Per deal" accent={K.gold} loading={loading} />
          <StatCard label="Win Rate" value={pipeline ? `${pipeline.winRate}%` : "—"} delta={3.2} sub="+3.2% improvement" accent={K.mint} loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 mb-4">
          <Card accent={K.blue}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Pipeline Stages</h3>
            {stages.map((stage, i) => {
              const pct = totalStageValue > 0 ? (stage.value / totalStageValue) * 100 : 0;
              return (
                <div key={i} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-[11px] text-gray-400">{stage.name}</span>
                    <span className="font-mono text-[11px] font-bold text-white">${(stage.value / 1000).toFixed(0)}K · {stage.count} deals</span>
                  </div>
                  <ProgressBar value={pct} color={stage.color} height={5} />
                </div>
              );
            })}
          </Card>

          <Card accent={K.teal}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Top Accounts</h3>
            <div className="flex flex-col gap-2">
              {accounts.map((account, i) => (
                <div key={i} className="p-2.5 px-3 rounded-sm bg-g850" style={{ borderLeft: `3px solid ${account.stage === "Closed Won" ? K.mint : account.stage === "Negotiation" ? K.gold : K.blue}` }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[11px] font-semibold text-white">{account.name}</span>
                    <Badge color={account.stage === "Closed Won" ? K.mint : account.stage === "Negotiation" ? K.gold : K.blue}>{account.stage}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] text-gray-500">{account.owner} · {account.daysInStage}d in stage</span>
                    <span className="font-mono text-[11px] font-bold text-kmint">${(account.value / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card accent={K.gold}>
          <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Channel Attribution</h3>
          {channelAttribution.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {channelAttribution.map((ch, i) => (
                <div key={i} className="p-3.5 rounded-sm text-center bg-g850">
                  <p className="font-mono text-[10px] text-gray-500 mb-1">{ch.channel}</p>
                  <p className="font-mono text-xl font-bold" style={{ color: K.blue }}>{ch.credit}%</p>
                  <p className="font-mono text-[10px] text-gray-600 mt-0.5">${(ch.pipeline / 1000).toFixed(0)}K · {ch.deals} deals</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="font-mono text-[11px] text-gray-500">No channel attribution data available</p>
              <p className="font-mono text-[10px] text-gray-600 mt-1">Attribution data will appear once campaigns have conversion data</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

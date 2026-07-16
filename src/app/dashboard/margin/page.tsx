"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface ChannelMargin { name: string; spend: number; revenue: number; margin: number; cac: number; ltv: number; }

export default function ProfitMarginPage() {
  const [overview, setOverview] = useState<{ avgMargin: number; profitAdjCAC: number; grossProfit: number } | null>(null);
  const [channels, setChannels] = useState<ChannelMargin[]>([]);
  const [trend, setTrend] = useState<{ month: string; margin: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/margin", { headers: { "Authorization": `Bearer ${token}` } })
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
  }, [token]);

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-white">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Profit Margin Center</h1>
          <p className="font-mono text-[11px] text-gray-500">Channel-level margins and profit-adjusted acquisition costs</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Avg Margin" value={overview ? `${overview.avgMargin}%` : "—"} delta={3.2} sub="+3.2% this quarter" accent={K.mint} loading={loading} />
          <StatCard label="Profit-Adj CAC" value={overview ? `$${overview.profitAdjCAC}` : "—"} delta={-4.8} sub="-$4.80 improvement" accent={K.blue} loading={loading} />
          <StatCard label="Gross Profit" value={overview ? `$${(overview.grossProfit / 1000).toFixed(0)}K` : "—"} delta={180} sub="+$180K vs last month" accent={K.mint} loading={loading} />
          <StatCard label="Channels" value={channels.length > 0 ? String(channels.length) : "—"} sub="Tracked channels" accent={K.teal} loading={loading} />
        </div>

        <Card accent={K.mint} className="mb-4">
          <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Channel Margins</h3>
          <div className="flex flex-col gap-2">
            {channels.map((ch, i) => (
              <div key={i} className="flex items-center gap-3 p-3 px-3.5 rounded-sm bg-g900">
                <div className="min-w-[100px]">
                  <span className="font-mono text-[11px] font-semibold text-white">{ch.name}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-[3px]">
                    <span className="font-mono text-[10px] text-gray-600">MARGIN</span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: ch.margin > 75 ? K.mint : ch.margin > 60 ? K.gold : K.danger }}>{ch.margin}%</span>
                  </div>
                  <ProgressBar value={ch.margin} color={ch.margin > 75 ? K.mint : ch.margin > 60 ? K.gold : K.danger} height={4} />
                </div>
                <div className="text-right min-w-[70px]">
                  <p className="font-mono text-[11px] font-semibold text-white">${(ch.spend / 1000).toFixed(0)}K</p>
                  <p className="font-mono text-[10px] text-gray-600">spend</p>
                </div>
                <div className="text-right min-w-[70px]">
                  <p className="font-mono text-[11px] font-semibold text-kmint">${(ch.revenue / 1000).toFixed(0)}K</p>
                  <p className="font-mono text-[10px] text-gray-600">revenue</p>
                </div>
                <div className="text-right min-w-[50px]">
                  <p className="font-mono text-[11px] font-semibold text-kblue">${ch.cac}</p>
                  <p className="font-mono text-[10px] text-gray-600">CAC</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card accent={K.teal}>
          <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Margin Trend (Last 6 Months)</h3>
          <div className="flex flex-col gap-1.5">
            {trend.map((t, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-sm bg-g850">
                <span className="font-mono text-[10px] text-gray-500 min-w-[30px]">{t.month}</span>
                <div className="flex-1">
                  <ProgressBar value={t.margin} color={K.mint} height={4} />
                </div>
                <span className="font-mono text-[11px] font-bold min-w-[40px] text-right text-kmint">{t.margin}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

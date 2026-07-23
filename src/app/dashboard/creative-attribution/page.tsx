"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard, Badge, ScrollableTable, AIThinking } from "@/components/ui";
import { K } from "@/lib/kdls";
import { attribution } from "@/lib/api";

interface Attribution { creative_id: string; platform: string; attributions: number; total_revenue: number; total_ltv: number; }

export default function CreativeAttributionPage() {
  const [attributions, setAttributions] = useState<Attribution[]>([]);
  const [model, setModel] = useState("last_touch");
  const [loading, setLoading] = useState(false);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  const fetchBreakdown = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await attribution.breakdown(token);
      if (data.success) setAttributions(data.data as Attribution[]);
    } catch {}
    setLoading(false);
  }, [token]);

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  const totalRevenue = attributions.reduce((s, a) => s + (a.total_revenue || 0), 0);
  const totalLtv = attributions.reduce((s, a) => s + (a.total_ltv || 0), 0);

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px] text-t1">
        <div className="mb-[22px] flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Creative Attribution</h1>
            <p className="font-mono text-[11px] text-t3">Per-signal-variant revenue attribution</p>
          </div>
          <div className="flex gap-2 items-center shrink-0 flex-wrap">
            <select value={model} onChange={e => setModel(e.target.value)}
              className="px-[10px] py-[6px] font-mono text-[11px] bg-g850 border border-g700 rounded-kdls text-t1 min-h-[32px] outline-none">
              <option value="last_touch">Last Touch</option><option value="first_touch">First Touch</option><option value="linear">Linear</option><option value="position">Position (U-Shape)</option><option value="time_decay">Time Decay</option>
            </select>
            <button onClick={fetchBreakdown}
              className="px-5 py-2 font-mono text-[11px] font-semibold rounded-kdls border border-kblue/40 bg-kblue/20 text-kblue cursor-pointer min-h-[32px]">
              Load Breakdown
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <StatCard label="Total Attributions" value={String(attributions.reduce((s, a) => s + (a.attributions || 0), 0))} accent={K.blue} loading={loading} />
          <StatCard label="Attributed Revenue" value={`$${totalRevenue.toLocaleString()}`} accent={K.mint} loading={loading} />
          <StatCard label="Attributed LTV" value={`$${totalLtv.toLocaleString()}`} accent={K.gold} loading={loading} />
        </div>

        {loading ? (
          <div className="flex justify-center p-15"><AIThinking text="Computing attribution..." /></div>
        ) : (
          <Card accent={K.mint}>
            <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Signal-Variant Breakdown</h3>
            {attributions.length === 0 ? (
              <div className="p-10 text-center"><p className="font-mono text-xs text-t3">No attribution data yet. Signals will be matched to creative variants.</p></div>
            ) : (
              attributions.map((a, i) => (
                <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-[14px] py-3 bg-g850 rounded-kdls mb-[6px]">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-semibold text-t1 overflow-hidden text-ellipsis whitespace-nowrap">{a.creative_id}</div>
                    <Badge color={a.platform === "meta" ? "#1877F2" : a.platform === "google" ? "#4285F4" : K.t3}>{a.platform}</Badge>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs font-bold text-kmint">${(a.total_revenue || 0).toLocaleString()}</p>
                    <p className="font-mono text-[11px] text-t3">revenue</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs font-bold text-kgold">${(a.total_ltv || 0).toLocaleString()}</p>
                    <p className="font-mono text-[11px] text-t3">LTV</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs font-bold text-kblue">{a.attributions || 0}</p>
                    <p className="font-mono text-[11px] text-t3">attrib.</p>
                  </div>
                </div>
              ))
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

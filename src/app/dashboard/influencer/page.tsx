"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard, ScrollableTable } from "@/components/ui";
import { K } from "@/lib/kdls";
import { influencer as influencerApi } from "@/lib/api";

interface Creator { id: string; name: string; handle: string; platform: string; promoCode: string; totalConversions: number; totalRevenue: number; totalLtv: number; roi: number; }

export default function InfluencerPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [darkSocial, setDarkSocial] = useState<{ totalUnattributedConversions: number; totalUnattributedRevenue: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", handle: "", platform: "meta" });
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [creatorsRes, darkRes] = await Promise.all([
        influencerApi.list(token),
        influencerApi.darkSocial(token).catch(() => null),
      ]);
      if (creatorsRes.success) setCreators(creatorsRes.data);
      if (darkRes?.success) setDarkSocial(darkRes.data);
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  const registerCreator = async () => {
    if (!token) return;
    await influencerApi.create(token, form);
    setForm({ name: "", handle: "", platform: "meta" });
    setShowForm(false);
    fetchData();
  };

  const totalRevenue = creators.reduce((s, c) => s + (c.totalRevenue || 0), 0);
  const totalConversions = creators.reduce((s, c) => s + (c.totalConversions || 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-white">
        <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Influencer & Dark Social</h1>
            <p className="font-mono text-[11px] text-gray-500">Track creator ROI, promo codes, and unattributed conversions</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="font-mono text-[11px] font-semibold px-5 py-2 rounded-sm cursor-pointer"
            style={{ border: `1px solid ${K.blue}40`, background: K.blue + "20", color: K.blue }}>
            {showForm ? "Cancel" : "+ Add Creator"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Creators" value={String(creators.length)} accent={K.blue} loading={loading} />
          <StatCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} accent={K.mint} loading={loading} />
          <StatCard label="Conversions" value={String(totalConversions)} accent={K.gold} loading={loading} />
          <StatCard label="Dark Social" value={darkSocial ? `$${darkSocial.totalUnattributedRevenue?.toLocaleString() || 0}` : "—"} sub={`${darkSocial?.totalUnattributedConversions || 0} unattributed`} accent={K.danger} loading={loading} />
        </div>

        {showForm && (
          <Card accent={K.blue} className="mb-4">
            <h3 className="font-mono font-bold text-[13px] text-white mb-3">Register Creator</h3>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <div>
                <label className="font-mono text-[11px] text-gray-500 block mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full py-2 px-2.5 font-mono text-xs rounded-sm"
                  style={{ background: K.inputBg, border: `1px solid ${K.inputBorder}`, color: K.t1 }} />
              </div>
              <div>
                <label className="font-mono text-[11px] text-gray-500 block mb-1">Handle</label>
                <input value={form.handle} onChange={e => setForm({ ...form, handle: e.target.value })} placeholder="@username"
                  className="w-full py-2 px-2.5 font-mono text-xs rounded-sm"
                  style={{ background: K.inputBg, border: `1px solid ${K.inputBorder}`, color: K.t1 }} />
              </div>
              <div>
                <label className="font-mono text-[11px] text-gray-500 block mb-1">Platform</label>
                <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}
                  className="w-full py-2 px-2.5 font-mono text-xs rounded-sm"
                  style={{ background: K.inputBg, border: `1px solid ${K.inputBorder}`, color: K.t1 }}>
                  <option value="meta">Meta</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="instagram">Instagram</option>
                </select>
              </div>
              <button onClick={registerCreator} className="font-mono text-[11px] font-semibold px-4 py-2 rounded-sm cursor-pointer"
                style={{ border: `1px solid ${K.mint}40`, background: K.mint + "20", color: K.mint }}>Register</button>
            </div>
          </Card>
        )}

        <Card accent={K.mint}>
          <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Creators</h3>
          {creators.length === 0 ? (
            <div className="p-10 text-center"><p className="font-mono text-xs text-gray-500">No creators registered yet.</p></div>
          ) : (
            <ScrollableTable>
              <div className="min-w-[600px]">
                {creators.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 px-3.5 mb-1.5 rounded-sm bg-g850">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-white">{c.name}</span>
                        <Badge color={K.t3}>{c.platform}</Badge>
                      </div>
                      <span className="font-mono text-[11px] text-gray-500">{c.handle} · Code: {c.promoCode}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-xs font-bold text-kmint">${c.totalRevenue?.toLocaleString() || 0}</p>
                      <p className="font-mono text-[11px] text-gray-500">revenue</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-xs font-bold text-kblue">{c.totalConversions || 0}</p>
                      <p className="font-mono text-[11px] text-gray-500">conv.</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-xs font-bold" style={{ color: c.roi >= 2 ? K.mint : K.danger }}>{c.roi?.toFixed(1) || "0.0"}×</p>
                      <p className="font-mono text-[11px] text-gray-500">ROI</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollableTable>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

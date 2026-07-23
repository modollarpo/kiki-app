"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Button, StatusBadge, ProgressBar, ScrollableTable } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { campaigns as campaignsApi, type Campaign } from "@/lib/api";
import { K } from "@/lib/kdls";
import { useRouter } from "next/navigation";

const PLATFORM_COLORS: Record<string,string> = { meta:"#1877F2", google:"#4285F4", tiktok:"#FF0050", linkedin:"#0A66C2", youtube:"#FF0000", pinterest:"#E60023" };

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString(); }

export default function CampaignsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [campaignList, setCampaignList] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("meta");
  const [newBudget, setNewBudget] = useState(5000);

  useEffect(() => {
    if (!token) { router.push("/auth/login"); return; }
    campaignsApi.list(token).then(d => { setCampaignList(d.campaigns); setLoading(false); }).catch(() => setLoading(false));
  }, [token, router]);

  const active = campaignList.filter(c => c.status === "active");
  const bestRoas = campaignList.length ? Math.max(...campaignList.map(c => c.roas)) : 0;
  const totalSpend = campaignList.reduce((s, c) => s + c.spend, 0);

  const handleCreate = async () => {
    if (!token || !newName.trim()) return;
    try {
      const c = await campaignsApi.create(token, { name: newName, platform: newPlatform, budget: newBudget });
      setCampaignList(prev => [...prev, c]);
      setCreating(false);
      setNewName("");
    } catch { /* ignore */ }
  };

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="mb-[22px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Campaigns</h1>
            <p className="font-mono text-[11px] text-t3">
              {loading ? "Loading..." : `${campaignList.length} campaigns · ${active.length} active · Bidding Agent active`}
            </p>
          </div>
          <div className="page-header-actions">
            <Button variant="secondary" size="sm">⬡ Zero-Shot Create</Button>
            <Button size="sm" onClick={() => setCreating(true)}>+ New Campaign</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Active Campaigns" value={String(active.length)} accent={K.mint} loading={loading} />
          <StatCard label="Best ROAS" value={`${bestRoas.toFixed(2)}×`} accent={K.mint} delta={12.4} loading={loading} />
          <StatCard label="Total Spend" value={`$${fmt(totalSpend)}`} accent={K.blue} loading={loading} />
          <StatCard label="Total Budget" value={`$${fmt(campaignList.reduce((s, c) => s + c.budget, 0))}`} accent={K.teal} loading={loading} />
        </div>

        {creating && (
          <div className="mb-4 p-5 bg-koaas/10 border border-koaas/40 rounded-kdls">
            <div className="page-header-row">
              <span className="font-mono text-[13px] font-bold text-koaas">⬡ New Campaign</span>
              <Button size="xs" variant="ghost" onClick={() => setCreating(false)}>✕</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px] gap-[10px] mb-[10px]">
              <input placeholder="Campaign name" value={newName} onChange={e => setNewName(e.target.value)}
                className="bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-sans text-[13px] text-t1 outline-none focus:border-kblue" />
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)}
                className="bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-[11px] text-t1 outline-none">
                {["meta","google","tiktok","linkedin","youtube","pinterest"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="number" placeholder="Budget" value={newBudget} onChange={e => setNewBudget(Number(e.target.value))}
                className="bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-[11px] text-t1 outline-none" />
            </div>
            <div className="page-header-actions">
              <Button variant="violet" size="md" onClick={handleCreate}>Create Campaign →</Button>
              <Button variant="ghost" size="md" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <Card padding={0}>
          <div className="px-5 py-3 border-b border-g800 flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-[13px] font-bold text-t1">All Campaigns</span>
          </div>
          <ScrollableTable>
          <div className="grid grid-cols-[1fr_90px_80px_80px_80px_90px_70px] gap-[10px] px-5 py-2 border-b border-g800 bg-g950 min-w-[700px]">
            {["NAME","STATUS","ROAS","SPEND","BUDGET","PLATFORM","CREATED"].map(h => (
              <span key={h} className="font-mono text-[10px] tracking-widest text-t4">{h}</span>
            ))}
          </div>
          {campaignList.map(c => {
            const rc = c.roas >= 4 ? "text-kmint" : c.roas >= 2 ? "text-kwarn" : "text-t3";
            return (
              <div key={c.id}
                className="grid grid-cols-[1fr_90px_80px_80px_80px_90px_70px] gap-[10px] px-5 py-3 border-b border-g900 items-center cursor-pointer hover:bg-g850 transition-colors">
                <div>
                  <p className="font-mono text-[11px] font-bold text-t1 mb-[3px]">{c.name}</p>
                  {c.budget > 0 && <ProgressBar value={(c.spend / c.budget) * 100} color={K.blue} height={2} />}
                </div>
                <StatusBadge status={c.status} />
                <span className={`font-mono text-xs font-bold ${rc}`}>{c.roas > 0 ? `${c.roas}×` : "—"}</span>
                <span className="font-mono text-[11px] text-t2">{c.spend > 0 ? `$${fmt(c.spend)}` : "—"}</span>
                <span className="font-mono text-[11px] text-t2">${fmt(c.budget)}</span>
                <span className="w-4 h-4 rounded-kdls inline-flex items-center justify-center font-mono text-[10px] font-bold"
                  style={{ background: `${PLATFORM_COLORS[c.platform] || K.g800}18`, color: PLATFORM_COLORS[c.platform] || K.t2 }}>
                  {c.platform[0]?.toUpperCase()}
                </span>
                <span className="font-mono text-[10px] text-t4">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            );
          })}
          {loading && [1,2,3].map(i => (
            <div key={i} className="px-5 py-3 border-b border-g900">
              <div className="h-[14px] w-1/2 bg-g850 rounded-kdls mb-[6px]" />
              <div className="h-[3px] w-[70%] bg-g850 rounded-kdls" />
            </div>
          ))}
          </ScrollableTable>
        </Card>
      </div>
    </DashboardLayout>
  );
}

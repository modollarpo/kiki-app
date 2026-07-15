"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, Button, StatusBadge, ProgressBar, AIThinking } from "@/components/ui";
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
      <div style={{ padding:"24px 28px", maxWidth:1400 }}>
        <div style={{ marginBottom:22, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:18, color:K.t1, letterSpacing:"-0.02em", marginBottom:4 }}>Campaigns</h1>
            <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>
              {loading ? "Loading..." : `${campaignList.length} campaigns · ${active.length} active · Bidding Agent active`}
            </p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Button variant="secondary" size="sm">⬡ Zero-Shot Create</Button>
            <Button size="sm" onClick={() => setCreating(true)}>+ New Campaign</Button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
          <StatCard label="Active Campaigns" value={String(active.length)} accent={K.mint} loading={loading} />
          <StatCard label="Best ROAS" value={`${bestRoas.toFixed(2)}×`} accent={K.mint} delta={12.4} loading={loading} />
          <StatCard label="Total Spend" value={`$${fmt(totalSpend)}`} accent={K.blue} loading={loading} />
          <StatCard label="Total Budget" value={`$${fmt(campaignList.reduce((s, c) => s + c.budget, 0))}`} accent={K.teal} loading={loading} />
        </div>

        {creating && (
          <div style={{ marginBottom:16, padding:20, background:K.oaasD, border:`1px solid ${K.oaas}40`, borderRadius:2 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontFamily:K.mono, fontSize:13, fontWeight:700, color:K.oaas }}>⬡ New Campaign</span>
              <Button size="xs" variant="ghost" onClick={() => setCreating(false)}>✕</Button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 120px", gap:10, marginBottom:10 }}>
              <input placeholder="Campaign name" value={newName} onChange={e => setNewName(e.target.value)}
                style={{ background:K.g850, border:`1px solid ${K.g700}`, borderRadius:2, padding:"10px 14px", fontFamily:"Inter,sans-serif", fontSize:13, color:K.t1, outline:"none" }} />
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)}
                style={{ background:K.g850, border:`1px solid ${K.g700}`, borderRadius:2, padding:"10px 14px", fontFamily:K.mono, fontSize:11, color:K.t1, outline:"none" }}>
                {["meta","google","tiktok","linkedin","youtube","pinterest"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="number" placeholder="Budget" value={newBudget} onChange={e => setNewBudget(Number(e.target.value))}
                style={{ background:K.g850, border:`1px solid ${K.g700}`, borderRadius:2, padding:"10px 14px", fontFamily:K.mono, fontSize:11, color:K.t1, outline:"none" }} />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Button variant="violet" size="md" onClick={handleCreate}>Create Campaign →</Button>
              <Button variant="ghost" size="md" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <Card padding={0}>
          <div style={{ padding:"12px 20px", borderBottom:`1px solid ${K.g800}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontFamily:K.mono, fontSize:13, fontWeight:700, color:K.t1 }}>All Campaigns</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 90px 80px 80px 80px 90px 70px", gap:10, padding:"8px 20px", borderBottom:`1px solid ${K.g800}`, background:K.g950 }}>
            {["NAME","STATUS","ROAS","SPEND","BUDGET","PLATFORM","CREATED"].map(h => (
              <span key={h} style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.1em", color:K.t4 }}>{h}</span>
            ))}
          </div>
          {campaignList.map(c => {
            const rc = c.roas >= 4 ? K.mint : c.roas >= 2 ? K.warn : K.t3;
            return (
              <div key={c.id}
                style={{ display:"grid", gridTemplateColumns:"1fr 90px 80px 80px 80px 90px 70px", gap:10, padding:"12px 20px", borderBottom:`1px solid ${K.g900}`, alignItems:"center", cursor:"pointer", transition:"background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = K.g850)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div>
                  <p style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:K.t1, marginBottom:3 }}>{c.name}</p>
                  {c.budget > 0 && <ProgressBar value={(c.spend / c.budget) * 100} color={K.blue} height={2} />}
                </div>
                <StatusBadge status={c.status} />
                <span style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:rc }}>{c.roas > 0 ? `${c.roas}×` : "—"}</span>
                <span style={{ fontFamily:K.mono, fontSize:11, color:K.t2 }}>{c.spend > 0 ? `$${fmt(c.spend)}` : "—"}</span>
                <span style={{ fontFamily:K.mono, fontSize:11, color:K.t2 }}>${fmt(c.budget)}</span>
                <span style={{ width:16, height:16, borderRadius:2, background:`${PLATFORM_COLORS[c.platform] || "#555"}18`, color:PLATFORM_COLORS[c.platform] || "#888", fontFamily:"monospace", fontSize:8, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>{c.platform[0]?.toUpperCase()}</span>
                <span style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            );
          })}
          {loading && [1,2,3].map(i => (
            <div key={i} style={{ padding:"12px 20px", borderBottom:`1px solid ${K.g900}` }}>
              <div style={{ height:14, width:"50%", background:K.g850, borderRadius:2, marginBottom:6 }} />
              <div style={{ height:3, width:"70%", background:K.g850, borderRadius:2 }} />
            </div>
          ))}
        </Card>
      </div>
    </DashboardLayout>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard, AIThinking, Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";

interface CreativeAsset {
  id: string;
  name: string;
  type: string;
  platform: string;
  status: string;
  ctr: string;
  conversions: number;
  roas: number;
  spend: number;
}

interface CreativeData {
  assets: CreativeAsset[];
  summary: {
    totalAssets: number;
    avgCtr: string;
    totalConversions: number;
    avgRoas: string;
  };
}

const platformColors: Record<string, string> = {
  meta: K.blue,
  google: K.mint,
  tiktok: K.teal,
  linkedin: K.indigo,
  snap: K.gold,
  pinterest: K.warn,
  youtube: K.pink,
  programmatic: K.t3,
};

export default function CreativeLibraryPage() {
  const { token } = useAuth();
  const [data, setData] = useState<CreativeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [newCreative, setNewCreative] = useState({ headline: "", type: "headline", platform: "multi", status: "draft" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const addToast = useKikiStore(s => s.addToast);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/creative-library", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createCreative = async () => {
    if (!token) return;
    if (!newCreative.headline.trim()) { addToast("error", "Creative content is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/creative-library", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: newCreative.type,
          platform: newCreative.platform,
          status: newCreative.status,
          content: newCreative.headline.trim(),
        }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to save creative");
      setNewCreative({ headline: "", type: "headline", platform: "multi", status: "draft" });
      setShowForm(false);
      await fetchData();
      addToast("success", "Creative added");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to save creative");
    } finally {
      setSaving(false);
    }
  };

  const deleteCreative = async (id: string) => {
    if (!token) return;
    if (!confirm("Delete this creative?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/creative-library?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to delete creative");
      await fetchData();
      addToast("success", "Creative deleted");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to delete creative");
    } finally {
      setDeletingId(null);
    }
  };

  const assets = data?.assets || [];
  const filtered = filter === "All" ? assets : assets.filter(a => a.type === filter);
  const summary = data?.summary;
  const typeFilters = ["All", ...Array.from(new Set(assets.map(a => a.type)))];

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Creative Library</h1>
            <p className="font-mono text-caption text-t3">Manage and analyze your creative assets across all platforms</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowForm(v => !v)}>{showForm ? "Close" : "+ Add Creative"}</Button>
        </div>

        {showForm && (
          <Card className="mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div className="lg:col-span-2">
                <label htmlFor="creative-content" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">HEADLINE / CONTENT</label>
                <input id="creative-content" value={newCreative.headline} onChange={e => setNewCreative({ ...newCreative, headline: e.target.value })} placeholder="Unlock 20% off your first order" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
              </div>
              <div>
                <label htmlFor="creative-type" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">TYPE</label>
                <select id="creative-type" value={newCreative.type} onChange={e => setNewCreative({ ...newCreative, type: e.target.value })} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                  {["headline", "cta", "description", "image", "video", "copy"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="creative-platform" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">PLATFORM</label>
                <select id="creative-platform" value={newCreative.platform} onChange={e => setNewCreative({ ...newCreative, platform: e.target.value })} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                  {["multi", "meta", "google", "tiktok", "youtube", "linkedin", "pinterest"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select aria-label="Creative status" value={newCreative.status} onChange={e => setNewCreative({ ...newCreative, status: e.target.value })} className="bg-g850 border border-g700 rounded-kdls px-3 py-2 font-mono text-caption text-t1 outline-none focus:border-kblue">
                {["draft", "approved", "rejected"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Button size="sm" loading={saving} onClick={createCreative}>Save Creative</Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-15">
            <AIThinking text="Loading creative assets..." />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {typeFilters.map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className="font-mono text-caption font-semibold px-4 py-1.5 rounded-sm cursor-pointer"
                  style={{ border: `1px solid ${filter === f ? K.blue + "40" : K.g700}`, background: filter === f ? K.blue + "20" : K.g900, color: filter === f ? K.blue : K.t3 }}>
                  {f}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <Card>
                <div className="p-10 text-center">
                  <p className="font-mono text-xs text-t4">
                    {assets.length === 0
                      ? "No creative assets found. Create campaigns to populate this library."
                      : "No assets match this filter."}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 mb-4">
                {filtered.map(asset => (
                  <Card key={asset.id} accent={platformColors[asset.platform] || K.t3}>
                    <div className="h-[100px] rounded-sm flex items-center justify-center mb-3" style={{ background: (platformColors[asset.platform] || K.t3) + "15" }}>
                      <span className="font-mono text-caption" style={{ color: platformColors[asset.platform] || K.t3 }}>{asset.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-caption font-semibold text-t1 truncate max-w-full">{asset.name}</span>
                      <Badge color={K.t3}>{asset.type}</Badge>
                    </div>
                    <Badge color={platformColors[asset.platform] || K.t3}>{asset.platform}</Badge>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                      <div className="py-2 px-2.5 rounded-sm text-center bg-g900">
                        <div className="font-mono text-caption text-t4">CTR</div>
                        <div className="font-mono text-xs font-bold text-kmint">{asset.ctr === "—" ? "—" : `${asset.ctr}%`}</div>
                      </div>
                      <div className="py-2 px-2.5 rounded-sm text-center bg-g900">
                        <div className="font-mono text-caption text-t4">Conv.</div>
                        <div className="font-mono text-xs font-bold text-kblue">{asset.conversions.toLocaleString()}</div>
                      </div>
                      <div className="py-2 px-2.5 rounded-sm text-center bg-g900">
                        <div className="font-mono text-caption text-t4">ROAS</div>
                        <div className="font-mono text-xs font-bold text-kgold">{asset.roas}x</div>
                      </div>
                    </div>
                    <ProgressBar value={Math.min(100, parseFloat(asset.ctr) || 0)} max={100} color={platformColors[asset.platform] || K.t3} height={3} label={`${asset.name} click-through rate`} />
                    {asset.type === "AI Generated" && (
                      <div className="flex justify-end mt-2">
                        <Button variant="ghost" size="xs" loading={deletingId === asset.id} onClick={() => deleteCreative(asset.id)}>Delete</Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {summary && (
              <Card>
                <h3 className="font-mono font-bold text-xs text-t1 mb-3">Performance Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Total Assets" value={String(summary.totalAssets)} accent={K.mint} />
                  <StatCard label="Avg CTR" value={`${summary.avgCtr}%`} accent={K.mint} />
                  <StatCard label="Total Conversions" value={summary.totalConversions.toLocaleString()} accent={K.mint} />
                  <StatCard label="Avg ROAS" value={`${summary.avgRoas}x`} accent={K.mint} />
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}


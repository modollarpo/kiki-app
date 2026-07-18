"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard, AIThinking } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
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

  const assets = data?.assets || [];
  const filtered = filter === "All" ? assets : assets.filter(a => a.type === filter);
  const summary = data?.summary;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Creative Library</h1>
          <p className="font-mono text-[11px] text-gray-500">Manage and analyze your creative assets across all platforms</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-15">
            <AIThinking text="Loading creative assets..." />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["All", "Image", "Video"].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className="font-mono text-[10px] font-semibold px-4 py-1.5 rounded-sm cursor-pointer"
                  style={{ border: `1px solid ${filter === f ? K.blue + "40" : K.g700}`, background: filter === f ? K.blue + "20" : K.g900, color: filter === f ? K.blue : K.t3 }}>
                  {f}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <Card>
                <div className="p-10 text-center">
                  <p className="font-mono text-xs text-gray-600">No creative assets found. Create campaigns to populate this library.</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 mb-4">
                {filtered.map(asset => (
                  <Card key={asset.id} accent={platformColors[asset.platform] || K.t3}>
                    <div className="h-[100px] rounded-sm flex items-center justify-center mb-3" style={{ background: (platformColors[asset.platform] || K.t3) + "15" }}>
                      <span className="font-mono text-[11px]" style={{ color: platformColors[asset.platform] || K.t3 }}>{asset.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-semibold text-white truncate max-w-full">{asset.name}</span>
                      <Badge color={K.t3}>{asset.type}</Badge>
                    </div>
                    <Badge color={platformColors[asset.platform] || K.t3}>{asset.platform}</Badge>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                      <div className="py-2 px-2.5 rounded-sm text-center bg-g900">
                        <div className="font-mono text-[10px] text-gray-600">CTR</div>
                        <div className="font-mono text-xs font-bold text-kmint">{asset.ctr}%</div>
                      </div>
                      <div className="py-2 px-2.5 rounded-sm text-center bg-g900">
                        <div className="font-mono text-[10px] text-gray-600">Conv.</div>
                        <div className="font-mono text-xs font-bold text-kblue">{asset.conversions.toLocaleString()}</div>
                      </div>
                      <div className="py-2 px-2.5 rounded-sm text-center bg-g900">
                        <div className="font-mono text-[10px] text-gray-600">ROAS</div>
                        <div className="font-mono text-xs font-bold text-kgold">{asset.roas}x</div>
                      </div>
                    </div>
                    <ProgressBar value={parseFloat(asset.ctr) * 20} max={100} color={platformColors[asset.platform] || K.t3} height={3} />
                  </Card>
                ))}
              </div>
            )}

            {summary && (
              <Card>
                <h3 className="font-mono font-bold text-xs text-white mb-3">Performance Summary</h3>
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

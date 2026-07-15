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
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Creative Library</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Manage and analyze your creative assets across all platforms</p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <AIThinking text="Loading creative assets..." />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {["All", "Image", "Video"].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: "6px 16px", fontFamily: K.mono, fontSize: 10, fontWeight: 600, borderRadius: 2, border: `1px solid ${filter === f ? K.blue + "40" : K.g700}`, background: filter === f ? K.blue + "20" : K.g900, color: filter === f ? K.blue : K.t3, cursor: "pointer" }}>
                  {f}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <Card>
                <div style={{ padding: 40, textAlign: "center" }}>
                  <p style={{ fontFamily: K.mono, fontSize: 12, color: K.t4 }}>No creative assets found. Create campaigns to populate this library.</p>
                </div>
              </Card>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginBottom: 16 }}>
                {filtered.map(asset => (
                  <Card key={asset.id} accent={platformColors[asset.platform] || K.t3}>
                    <div style={{ height: 100, borderRadius: 2, background: (platformColors[asset.platform] || K.t3) + "15", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                      <span style={{ fontFamily: K.mono, fontSize: 11, color: platformColors[asset.platform] || K.t3 }}>{asset.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{asset.name}</span>
                      <Badge color={K.t3}>{asset.type}</Badge>
                    </div>
                    <Badge color={platformColors[asset.platform] || K.t3}>{asset.platform}</Badge>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                      <div style={{ padding: "8px 10px", background: K.g900, borderRadius: 2, textAlign: "center" }}>
                        <div style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>CTR</div>
                        <div style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.mint }}>{asset.ctr}%</div>
                      </div>
                      <div style={{ padding: "8px 10px", background: K.g900, borderRadius: 2, textAlign: "center" }}>
                        <div style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Conv.</div>
                        <div style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.blue }}>{asset.conversions.toLocaleString()}</div>
                      </div>
                      <div style={{ padding: "8px 10px", background: K.g900, borderRadius: 2, textAlign: "center" }}>
                        <div style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>ROAS</div>
                        <div style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.gold }}>{asset.roas}x</div>
                      </div>
                    </div>
                    <ProgressBar value={parseFloat(asset.ctr) * 20} max={100} color={platformColors[asset.platform] || K.t3} height={3} />
                  </Card>
                ))}
              </div>
            )}

            {summary && (
              <Card>
                <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 12, color: K.t1, marginBottom: 12 }}>Performance Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
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

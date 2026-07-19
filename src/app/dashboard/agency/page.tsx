"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, StatCard, AIThinking, ScrollableTable } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { K, fmt } from "@/lib/kdls";

interface PlatformCampaign {
  id: string;
  name: string;
  status: string;
  roas: number;
  spend: number;
  conversions: number;
}

interface Platform {
  name: string;
  campaignCount: number;
  totalSpend: number;
  totalBudget: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgRoas: number;
  avgCpa: number;
  campaigns: PlatformCampaign[];
}

interface AgencyData {
  platforms: Platform[];
  summary: {
    totalPlatforms: number;
    totalCampaigns: number;
    totalSpend: number;
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

export default function AgencyPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AgencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/agency", {
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

  const platforms = data?.platforms || [];
  const summary = data?.summary;
  const selected = selectedPlatform ? platforms.find(p => p.name === selectedPlatform) : null;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Agency View</h1>
          <p className="font-mono text-[11px] text-gray-500">Cross-platform campaign management · Real data from your connected platforms</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-15">
            <AIThinking text="Loading agency data..." />
          </div>
        ) : platforms.length === 0 ? (
          <Card>
            <div className="p-10 text-center">
              <p className="font-mono text-xs text-gray-600 mb-3">No platform data available yet.</p>
              <p className="font-mono text-[11px] text-gray-500">Connect platforms and create campaigns to see agency data here.</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <StatCard label="Total Platforms" value={String(summary?.totalPlatforms || 0)} accent={K.blue} sub="Connected platforms" />
              <StatCard label="Total Campaigns" value={String(summary?.totalCampaigns || 0)} accent={K.mint} sub="Across all platforms" />
              <StatCard label="Total Spend" value={`$${fmt.compact(summary?.totalSpend || 0)}`} accent={K.gold} sub="All platforms combined" />
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 mb-4">
              {platforms.map(p => (
                <Card key={p.name}
                  accent={platformColors[p.name] || K.t3}
                  className={selectedPlatform && selectedPlatform !== p.name ? "opacity-50" : ""}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedPlatform(selectedPlatform === p.name ? null : p.name)}>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-gray-600 mb-1.5">PLATFORM</p>
                  <p className="font-mono text-sm font-bold capitalize mb-2" style={{ color: platformColors[p.name] || K.t1 }}>{p.name}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <p className="font-mono text-[10px] text-gray-600">Campaigns</p>
                      <p className="font-mono text-xs font-bold text-white">{p.campaignCount}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-gray-600">Spend</p>
                      <p className="font-mono text-xs font-bold text-white">${fmt.compact(p.totalSpend)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-gray-600">ROAS</p>
                      <p className="font-mono text-xs font-bold" style={{ color: p.avgRoas >= 4 ? K.mint : p.avgRoas >= 2 ? K.gold : K.warn }}>{p.avgRoas.toFixed(1)}x</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-gray-600">Conv.</p>
                      <p className="font-mono text-xs font-bold text-white">{p.totalConversions}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {selected && (
              <Card accent={platformColors[selected.name] || K.t3}>
                <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${K.g800}` }}>
                  <h2 className="font-mono font-bold text-[13px] text-white capitalize">{selected.name} Campaigns</h2>
                </div>
                {selected.campaigns.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="font-mono text-[11px] text-gray-600">No campaigns on this platform yet.</p>
                  </div>
                ) : (
                  <ScrollableTable>
                  {selected.campaigns.map((c, i) => (
                    <div key={c.id} className="grid grid-cols-[1fr_100px_100px_80px_80px] gap-3 px-5 py-3 items-center min-w-[500px]"
                      style={{ borderBottom: i < selected.campaigns.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                      <div>
                        <p className="font-mono text-[11px] font-semibold text-white">{c.name}</p>
                        <Badge color={c.status === "active" ? K.mint : K.t3} dot>{c.status}</Badge>
                      </div>
                      <span className="font-mono text-[11px] text-gray-400">${fmt.compact(c.spend)}</span>
                      <span className="font-mono text-[11px] font-bold" style={{ color: c.roas >= 4 ? K.mint : c.roas >= 2 ? K.gold : K.warn }}>{c.roas.toFixed(1)}x</span>
                      <span className="font-mono text-[11px] text-gray-400">{c.conversions}</span>
                      <Button variant="ghost" size="xs">View →</Button>
                    </div>
                  ))}
                  </ScrollableTable>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

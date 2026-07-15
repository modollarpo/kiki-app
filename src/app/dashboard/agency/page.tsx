"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, StatCard, AIThinking } from "@/components/ui";
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
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Agency View</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Cross-platform campaign management · Real data from your connected platforms</p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <AIThinking text="Loading agency data..." />
          </div>
        ) : platforms.length === 0 ? (
          <Card>
            <div style={{ padding: 40, textAlign: "center" }}>
              <p style={{ fontFamily: K.mono, fontSize: 12, color: K.t4, marginBottom: 12 }}>No platform data available yet.</p>
              <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Connect platforms and create campaigns to see agency data here.</p>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Total Platforms" value={String(summary?.totalPlatforms || 0)} accent={K.blue} sub="Connected platforms" />
              <StatCard label="Total Campaigns" value={String(summary?.totalCampaigns || 0)} accent={K.mint} sub="Across all platforms" />
              <StatCard label="Total Spend" value={`$${fmt.compact(summary?.totalSpend || 0)}`} accent={K.gold} sub="All platforms combined" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              {platforms.map(p => (
                <Card key={p.name}
                  accent={platformColors[p.name] || K.t3}
                  style={{ cursor: "pointer", opacity: selectedPlatform && selectedPlatform !== p.name ? 0.5 : 1 }}
                  onClick={() => setSelectedPlatform(selectedPlatform === p.name ? null : p.name)}>
                  <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4, marginBottom: 6 }}>PLATFORM</p>
                  <p style={{ fontFamily: K.mono, fontSize: 14, fontWeight: 700, color: platformColors[p.name] || K.t1, textTransform: "capitalize", marginBottom: 8 }}>{p.name}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Campaigns</p>
                      <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>{p.campaignCount}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Spend</p>
                      <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>${fmt.compact(p.totalSpend)}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>ROAS</p>
                      <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: p.avgRoas >= 4 ? K.mint : p.avgRoas >= 2 ? K.gold : K.warn }}>{p.avgRoas.toFixed(1)}x</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Conv.</p>
                      <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>{p.totalConversions}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {selected && (
              <Card accent={platformColors[selected.name] || K.t3}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}` }}>
                  <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, textTransform: "capitalize" }}>{selected.name} Campaigns</h2>
                </div>
                {selected.campaigns.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center" }}>
                    <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t4 }}>No campaigns on this platform yet.</p>
                  </div>
                ) : (
                  selected.campaigns.map((c, i) => (
                    <div key={c.id} style={{
                      padding: "12px 20px",
                      borderBottom: i < selected.campaigns.length - 1 ? `1px solid ${K.g900}` : undefined,
                      display: "grid",
                      gridTemplateColumns: "1fr 100px 100px 80px 80px",
                      gap: 12,
                      alignItems: "center",
                    }}>
                      <div>
                        <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{c.name}</p>
                        <Badge color={c.status === "active" ? K.mint : K.t3} dot>{c.status}</Badge>
                      </div>
                      <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>${fmt.compact(c.spend)}</span>
                      <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: c.roas >= 4 ? K.mint : c.roas >= 2 ? K.gold : K.warn }}>{c.roas.toFixed(1)}x</span>
                      <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{c.conversions}</span>
                      <Button variant="ghost" size="xs">View →</Button>
                    </div>
                  ))
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

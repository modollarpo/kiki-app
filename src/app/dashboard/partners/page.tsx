"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, Button, AIThinking } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

const TIER_COLORS: Record<string, string> = {
  Platinum: K.oaas, Gold: K.gold, Silver: K.t2, Bronze: K.crm, active: K.mint, pending: K.warn,
};

export default function PartnersPage() {
  const { data, loading } = useInsights();
  const partners = data?.partners || [];

  const totalRevenue = partners.reduce((s: number, p: any) => s + (p.revenueGenerated || 0), 0);
  const totalCampaigns = partners.reduce((s: number, p: any) => s + (p.activeCampaigns || 0), 0);
  const activePartners = partners.filter((p: any) => p.status === "active").length;

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Partner Management</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Reseller network · Tier management · Commission tracking</p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <AIThinking text="Loading partners..." />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Total Integrations" value={String(partners.length)} accent={K.blue} />
              <StatCard label="Active" value={String(activePartners)} accent={K.mint} />
              <StatCard label="Connected Platforms" value={String(new Set(partners.map((p: any) => p.name)).size)} accent={K.gold} />
              <StatCard label="Sync Status" value={partners.length > 0 ? "LIVE" : "NONE"} accent={K.oaas} />
            </div>

            {partners.length === 0 ? (
              <Card>
                <div style={{ padding: 40, textAlign: "center" }}>
                  <p style={{ fontFamily: K.mono, fontSize: 12, color: K.t4, marginBottom: 12 }}>No platform integrations connected yet.</p>
                  <Button variant="primary" size="sm" onClick={() => window.location.href = "/dashboard/settings"}>Connect a Platform →</Button>
                </div>
              </Card>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card accent={K.gold}>
                  <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Connected Platforms</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {partners.map((p: any) => (
                      <div key={p.name} style={{ padding: "14px 0", borderBottom: `1px solid ${K.g800}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1, textTransform: "capitalize" }}>{p.name}</span>
                            <Badge color={p.status === "active" ? K.mint : K.warn} dot>{p.status.toUpperCase()}</Badge>
                          </div>
                          <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>Since {new Date(p.connectedAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>
                            Last sync: {p.lastSync ? new Date(p.lastSync).toLocaleString() : "—"}
                          </span>
                          <Button variant="ghost" size="xs">Details</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Card accent={K.oaas}>
                    <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Platform Status</h3>
                    {partners.map((p: any) => (
                      <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${K.g800}` }}>
                        <Badge color={p.status === "active" ? K.mint : K.warn} dot>{p.status === "active" ? "CONNECTED" : "INACTIVE"}</Badge>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1, textTransform: "capitalize" }}>{p.name}</p>
                          <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>OAuth connected</p>
                        </div>
                      </div>
                    ))}
                  </Card>

                  <Card accent={K.mint}>
                    <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Commission Tiers</h3>
                    {[
                      { tier: "Platinum", rate: "18%", minRev: "$250K+/mo", benefits: "Priority support, custom reporting" },
                      { tier: "Gold", rate: "15%", minRev: "$100K+/mo", benefits: "Dedicated CMO, API access" },
                      { tier: "Silver", rate: "12%", minRev: "$25K+/mo", benefits: "Standard reporting, email support" },
                      { tier: "Bronze", rate: "10%", minRev: "Any", benefits: "Self-serve dashboard" },
                    ].map(t => (
                      <div key={t.tier} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${K.g800}` }}>
                        <Badge color={TIER_COLORS[t.tier]}>{t.tier}</Badge>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1 }}>{t.rate} commission</p>
                          <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Min: {t.minRev} · {t.benefits}</p>
                        </div>
                      </div>
                    ))}
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

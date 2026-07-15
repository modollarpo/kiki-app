"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, PlatformChip } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

const CREATORS = [
  { name: "@sarahstyles", platform: "TikTok", followers: "1.2M", promoCodes: ["SARAH20", "KIKI15"], conversions: 342, revenue: 18900, status: "active", engagement: "4.8%" },
  { name: "@techreview_mike", platform: "YouTube", followers: "890K", promoCodes: ["MIKEDEAL"], conversions: 187, revenue: 12400, status: "active", engagement: "3.2%" },
  { name: "@fitnessjenna", platform: "Instagram", followers: "2.1M", promoCodes: ["JENNAFIT", "KIKI25"], conversions: 521, revenue: 31200, status: "active", engagement: "5.1%" },
  { name: "@thegamingnest", platform: "Twitch", followers: "450K", promoCodes: ["NESTPLAY"], conversions: 98, revenue: 5600, status: "paused", engagement: "6.3%" },
  { name: "@cookingwithalex", platform: "TikTok", followers: "3.4M", promoCodes: ["ALEXCOOK", "KIKIFOOD"], conversions: 876, revenue: 42100, status: "active", engagement: "3.9%" },
  { name: "@digitalnomadlife", platform: "YouTube", followers: "620K", promoCodes: ["NOMAD10"], conversions: 134, revenue: 8700, status: "active", engagement: "4.1%" },
  { name: "@beautybyluna", platform: "Instagram", followers: "1.8M", promoCodes: ["LUNABEAUTY"], conversions: 412, revenue: 24300, status: "active", engagement: "4.5%" },
];

const DARK_SOCIAL_CHANNELS = [
  { channel: "WhatsApp Groups", signals: 1240, conversions: 89, revenue: 5200 },
  { channel: "Telegram Channels", signals: 890, conversions: 54, revenue: 3100 },
  { channel: "Discord Servers", signals: 560, conversions: 32, revenue: 1800 },
  { channel: "Private Slack", signals: 320, conversions: 21, revenue: 1200 },
];

export default function InfluencerPage() {
  const { data, loading } = useInsights();
  const inf = data?.influencer ?? { campaigns: 0, platforms: [], totalReach: 0, avgRoas: 0 };

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Influencer & Dark Social</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Creator tracking · Promo code attribution · Dark social attribution</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Campaigns Tracked" value={loading ? "…" : String(inf.campaigns)} accent={K.oaas} sub={`${inf.platforms?.length ?? 0} platforms`} />
          <StatCard label="Total Reach" value={loading ? "…" : fmt.compact(inf.totalReach)} accent={K.mint} sub="Across channels" />
          <StatCard label="Avg ROAS" value={loading ? "…" : `${inf.avgRoas?.toFixed(1)}×`} accent={K.teal} />
          <StatCard label="Creator Network" value={String(CREATORS.length)} accent={K.blue} sub="Sample · illustrative" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <Card accent={K.oaas}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>Creator Tracking <Badge color={K.t4} style={{ fontSize: 8 }}>SAMPLE</Badge></h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Creator", "Platform", "Followers", "Promo Codes", "Conversions", "Revenue", "Status"].map(h => (
                      <th key={h} style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4, textTransform: "uppercase", textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${K.g800}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CREATORS.map(c => (
                    <tr key={c.name}>
                      <td style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1, padding: "10px", borderBottom: `1px solid ${K.g800}` }}>{c.name}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${K.g800}` }}><PlatformChip platform={c.platform} /></td>
                      <td style={{ fontFamily: K.mono, fontSize: 11, color: K.t2, padding: "10px", borderBottom: `1px solid ${K.g800}` }}>{c.followers}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${K.g800}` }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {c.promoCodes.map(code => (
                            <Badge key={code} color={K.oaas}>{code}</Badge>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.mint, padding: "10px", borderBottom: `1px solid ${K.g800}` }}>{c.conversions.toLocaleString()}</td>
                      <td style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.gold, padding: "10px", borderBottom: `1px solid ${K.g800}` }}>{fmt.currency(c.revenue)}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${K.g800}` }}><Badge color={c.status === "active" ? K.mint : K.warn} dot>{c.status.toUpperCase()}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card accent={K.teal}>
              <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>Dark Social Attribution <Badge color={K.t4} style={{ fontSize: 8 }}>SAMPLE</Badge></h3>
              {DARK_SOCIAL_CHANNELS.map(ch => (
                <div key={ch.channel} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{ch.channel}</span>
                    <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.gold }}>{fmt.currency(ch.revenue)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
                    <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{fmt.compact(ch.signals)} signals</span>
                    <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{ch.conversions} conversions</span>
                  </div>
                  <ProgressBar value={ch.revenue} max={6000} color={K.teal} height={3} />
                </div>
              ))}
            </Card>

            <Card accent={K.gold}>
              <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>Top Promo Codes <Badge color={K.t4} style={{ fontSize: 8 }}>SAMPLE</Badge></h3>
              {[
                { code: "KIKI25", conversions: 234, revenue: 12800 },
                { code: "SARAH20", conversions: 198, revenue: 10200 },
                { code: "ALEXCOOK", conversions: 176, revenue: 9400 },
                { code: "JENNAFIT", conversions: 156, revenue: 8100 },
                { code: "LUNABEAUTY", conversions: 134, revenue: 7200 },
              ].map((p, i) => (
                <div key={p.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${K.g800}` }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4, width: 16 }}>#{i + 1}</span>
                  <Badge color={K.oaas}>{p.code}</Badge>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, flex: 1 }}>{p.conversions} conv</span>
                  <span style={{ fontFamily: K.mono, fontSize: 10, fontWeight: 700, color: K.gold }}>{fmt.currency(p.revenue)}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

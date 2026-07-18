import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, AbsoluteFill, Sequence } from "remotion";
import { K, PLATFORMS } from "../lib/theme";

// Simplified Dashboard walkthrough — lighter on SVG/animations
export const DashboardWalkthrough: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: K.g950 }}>
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 56,
        background: K.g900, borderBottom: `1px solid ${K.g800}`,
        display: "flex", alignItems: "center", padding: "0 32px",
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{ fontFamily: "monospace", color: K.t1, fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>KIKI</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: "monospace", color: K.mint, fontSize: 14 }}>● Live</div>
      </div>

      {/* Sidebar */}
      <div style={{
        position: "absolute", top: 56, left: 0, bottom: 0, width: 240,
        background: K.g900, borderRight: `1px solid ${K.g800}`, padding: "24px 16px",
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {["Command Center", "Campaigns", "Agents", "Analytics", "Wallet"].map((item, i) => (
          <div key={i} style={{
            fontFamily: "sans-serif", fontSize: 14, padding: "10px 16px", borderRadius: 8, marginBottom: 4,
            color: i === 0 ? K.t1 : K.t3,
            background: i === 0 ? `${K.blue}20` : "transparent",
            borderLeft: i === 0 ? `3px solid ${K.blue}` : "3px solid transparent",
          }}>{item}</div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ position: "absolute", top: 56, left: 240, right: 0, bottom: 0, padding: 32 }}>
        <Sequence from={0} durationInFrames={180}><CampaignCards /></Sequence>
        <Sequence from={180} durationInFrames={180}><MetricsView /></Sequence>
      </div>
    </AbsoluteFill>
  );
};

const CampaignCards: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const campaigns = [
    { name: "Q4 Holiday Push", status: "active", roas: 4.2, spend: "12.4K", revenue: "52.1K" },
    { name: "Summer Collection", status: "active", roas: 3.8, spend: "8.2K", revenue: "31.2K" },
    { name: "Black Friday Blast", status: "paused", roas: 5.1, spend: "18.9K", revenue: "96.4K" },
  ];

  return (
    <div>
      <div style={{ fontFamily: "monospace", color: K.t2, fontSize: 13, letterSpacing: 3, marginBottom: 24 }}>CAMPAIGNS</div>
      <div style={{ display: "flex", gap: 24 }}>
        {campaigns.map((c, i) => {
          const delay = i * 20;
          const progress = spring({ frame: frame - delay, fps, config: { damping: 15 } });
          return (
            <div key={i} style={{
              opacity: interpolate(progress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(progress, [0, 1], [60, 0])}px)`,
              background: K.g850, border: `1px solid ${K.g750}`, borderRadius: 16, padding: 28, width: 340,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontFamily: "sans-serif", color: K.t1, fontSize: 18, fontWeight: 700 }}>{c.name}</div>
                <div style={{
                  fontFamily: "monospace", fontSize: 11, padding: "4px 10px", borderRadius: 20,
                  background: c.status === "active" ? `${K.mint}20` : `${K.warn}20`,
                  color: c.status === "active" ? K.mint : K.warn,
                }}>{c.status === "active" ? "● LIVE" : "◯ PAUSED"}</div>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div><div style={{ color: K.t3, fontSize: 12 }}>ROAS</div><div style={{ fontFamily: "monospace", color: K.mint, fontSize: 28, fontWeight: 800 }}>{c.roas}×</div></div>
                <div><div style={{ color: K.t3, fontSize: 12 }}>SPEND</div><div style={{ fontFamily: "monospace", color: K.t1, fontSize: 28, fontWeight: 800 }}>${c.spend}</div></div>
                <div><div style={{ color: K.t3, fontSize: 12 }}>REVENUE</div><div style={{ fontFamily: "monospace", color: K.mint, fontSize: 28, fontWeight: 800 }}>${c.revenue}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MetricsView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const metrics = [
    { label: "Total ROAS", value: "4.2×", color: K.mint, bar: 70 },
    { label: "Revenue", value: "$179.6K", color: K.blue, bar: 65 },
    { label: "Conversions", value: "2,847", color: K.gold, bar: 55 },
    { label: "LTV Predicted", value: "$639", color: K.oaas, bar: 80 },
  ];

  const platforms = [
    { name: "Meta", roas: "4.2×", color: "#1877F2" },
    { name: "Google", roas: "3.8×", color: "#4285F4" },
    { name: "TikTok", roas: "5.1×", color: "#FF0050" },
    { name: "LinkedIn", roas: "3.2×", color: "#0A66C2" },
  ];

  return (
    <div>
      <div style={{ fontFamily: "monospace", color: K.t2, fontSize: 13, letterSpacing: 3, marginBottom: 24 }}>PERFORMANCE</div>
      <div style={{ display: "flex", gap: 24, marginBottom: 40 }}>
        {metrics.map((m, i) => {
          const delay = i * 15;
          const progress = spring({ frame: frame - delay, fps, config: { damping: 15 } });
          return (
            <div key={i} style={{
              opacity: interpolate(progress, [0, 1], [0, 1]),
              transform: `scale(${interpolate(progress, [0, 1], [0.85, 1])})`,
              background: K.g850, border: `1px solid ${m.color}30`, borderRadius: 16, padding: 24, width: 240,
            }}>
              <div style={{ fontFamily: "sans-serif", color: K.t3, fontSize: 12, marginBottom: 8 }}>{m.label}</div>
              <div style={{ fontFamily: "monospace", color: m.color, fontSize: 32, fontWeight: 800, marginBottom: 12 }}>{m.value}</div>
              {/* Simple bar */}
              <div style={{ width: "100%", height: 6, background: K.g800, borderRadius: 3 }}>
                <div style={{
                  width: `${interpolate(progress, [0, 1], [0, m.bar])}%`,
                  height: "100%", background: m.color, borderRadius: 3,
                  boxShadow: `0 0 8px ${m.color}40`,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontFamily: "monospace", color: K.t2, fontSize: 13, letterSpacing: 3, marginBottom: 16 }}>PLATFORMS</div>
      <div style={{ display: "flex", gap: 20 }}>
        {platforms.map((p, i) => {
          const delay = 60 + i * 12;
          const progress = spring({ frame: frame - delay, fps, config: { damping: 15 } });
          return (
            <div key={i} style={{
              opacity: interpolate(progress, [0, 1], [0, 1]),
              background: K.g850, border: `1px solid ${K.g750}`, borderRadius: 12, padding: "16px 24px", width: 220,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${p.color}20`, display: "flex", alignItems: "center", justifyContent: "center", color: p.color, fontWeight: 800, fontSize: 16 }}>{p.name[0]}</div>
                <div style={{ fontFamily: "sans-serif", color: K.t1, fontSize: 15, fontWeight: 600 }}>{p.name}</div>
              </div>
              <div style={{ fontFamily: "monospace", color: K.mint, fontSize: 18, fontWeight: 800 }}>{p.roas} ROAS</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, AbsoluteFill } from "remotion";
import { K } from "../lib/theme";

// Simplified Problem scene
export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const segments = [
    { label: "Effective", pct: 35, color: K.mint },
    { label: "Bots", pct: 25, color: K.danger },
    { label: "Poor Targeting", pct: 22, color: K.warn },
    { label: "Ad Fatigue", pct: 18, color: K.crm },
  ];

  let cumulative = 0;
  const radius = 140;
  const cx = 250, cy = 250;

  return (
    <AbsoluteFill style={{ background: K.g950, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${K.g800}15 1px, transparent 1px), linear-gradient(90deg, ${K.g800}15 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 120, zIndex: 1 }}>
        <div style={{ maxWidth: 700 }}>
          <div style={{ opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }), transform: `translateY(${interpolate(frame, [0, 20], [30, 0], { extrapolateRight: "clamp" })}px)` }}>
            <div style={{ fontFamily: "monospace", color: K.danger, fontSize: 18, letterSpacing: 4, marginBottom: 16 }}>THE PROBLEM</div>
            <div style={{ fontFamily: "sans-serif", color: K.t1, fontSize: 56, fontWeight: 800, lineHeight: 1.15 }}>
              65% of ad spend<br /><span style={{ color: K.danger }}>is wasted.</span>
            </div>
          </div>
          <div style={{ opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), marginTop: 32 }}>
            <div style={{ fontFamily: "sans-serif", color: K.t2, fontSize: 22, lineHeight: 1.6 }}>
              Bots, poor targeting, and ad fatigue drain budgets.<br />Manual optimization can't keep up.
            </div>
          </div>
        </div>

        <svg width={500} height={500} viewBox="0 0 500 500">
          {segments.map((seg, i) => {
            const segProgress = spring({ frame: frame - 30 - i * 15, fps, config: { damping: 20 } });
            const segAngle = interpolate(segProgress, [0, 1], [0, (seg.pct / 100) * 360]);
            const startAngle = cumulative;
            cumulative += seg.pct / 100 * 360;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (startAngle + segAngle - 90) * (Math.PI / 180);
            const largeArc = segAngle > 180 ? 1 : 0;
            const x1 = cx + radius * Math.cos(startRad);
            const y1 = cy + radius * Math.sin(startRad);
            const x2 = cx + radius * Math.cos(endRad);
            const y2 = cy + radius * Math.sin(endRad);
            if (segAngle < 0.5) return null;
            return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={seg.color} opacity={0.85} />;
          })}
          <circle cx={cx} cy={cy} r={70} fill={K.g950} />
          <text x={cx} y={cy - 8} textAnchor="middle" fill={K.danger} fontFamily="monospace" fontSize={36} fontWeight={800}>65%</text>
          <text x={cx} y={cy + 22} textAnchor="middle" fill={K.t3} fontFamily="sans-serif" fontSize={14}>WASTED</text>
        </svg>
      </div>
    </AbsoluteFill>
  );
};

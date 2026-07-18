import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, AbsoluteFill } from "remotion";
import { K } from "../lib/theme";

// Simplified Logo reveal — fewer particles
export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 12, mass: 0.5 } });
  const logoOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowSize = interpolate(frame, [20, 80], [0, 600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowOpacity = interpolate(frame, [20, 50, 200, 270], [0, 0.6, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tagline = "Autonomous LTV Campaign Execution";
  const tagProgress = spring({ frame: frame - 60, fps, config: { damping: 25 } });
  const tagChars = Math.floor(interpolate(tagProgress, [0, 1], [0, tagline.length]));

  return (
    <AbsoluteFill style={{ background: K.g950, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", width: glowSize, height: glowSize, borderRadius: "50%",
        background: `radial-gradient(circle, ${K.blue}50 0%, ${K.blue}15 40%, transparent 70%)`, opacity: glowOpacity,
      }} />

      {/* Fewer particles */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 200 + Math.sin(frame * 0.02 + i) * 80;
        const x = Math.cos(angle + frame * 0.003) * dist;
        const y = Math.sin(angle + frame * 0.003) * dist;
        return (
          <div key={i} style={{
            position: "absolute", left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`,
            width: 4, height: 4, borderRadius: "50%", background: K.blue,
            opacity: interpolate(frame, [30, 60], [0, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (0.3 + Math.sin(frame * 0.05 + i) * 0.2),
            boxShadow: `0 0 8px ${K.blue}`,
          }} />
        );
      })}

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ opacity: logoOpacity, transform: `scale(${interpolate(logoScale, [0, 1], [0.5, 1])})` }}>
          <div style={{ fontFamily: "monospace", fontSize: 120, fontWeight: 900, color: K.t1, letterSpacing: 12, textShadow: `0 0 60px ${K.blue}80, 0 0 120px ${K.blue}40` }}>KIKI</div>
          <div style={{ fontFamily: "monospace", fontSize: 20, color: K.blue, letterSpacing: 8, marginTop: -8 }}>AGENT™</div>
        </div>
        <div style={{ marginTop: 48, fontFamily: "monospace", fontSize: 28, color: K.t2, letterSpacing: 2, minHeight: 40 }}>
          {tagline.slice(0, tagChars)}
          {tagChars < tagline.length && <span style={{ opacity: frame % 15 < 8 ? 1 : 0, color: K.blue }}>_</span>}
        </div>
        <div style={{ marginTop: 24, opacity: interpolate(frame, [120, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), fontFamily: "sans-serif", fontSize: 18, color: K.t3 }}>
          One platform. Every channel. Maximum lifetime value.
        </div>
      </div>
    </AbsoluteFill>
  );
};

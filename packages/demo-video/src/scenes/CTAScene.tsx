import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, AbsoluteFill } from "remotion";
import { K } from "../lib/theme";

// Simplified CTA
export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const logoOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlProgress = spring({ frame: frame - 80, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ background: K.g950, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", width: 1000, height: 1000, borderRadius: "50%",
        background: `radial-gradient(circle, ${K.blue}18 0%, transparent 70%)`,
        opacity: Math.sin(frame * 0.04) * 0.2 + 0.8,
      }} />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ opacity: logoOpacity, transform: `scale(${interpolate(logoProgress, [0, 1], [0.6, 1])})`, marginBottom: 40 }}>
          <div style={{ fontFamily: "monospace", fontSize: 100, fontWeight: 900, color: K.t1, letterSpacing: 10, textShadow: `0 0 60px ${K.blue}60` }}>KIKI</div>
          <div style={{ fontFamily: "monospace", fontSize: 18, color: K.blue, letterSpacing: 8, marginTop: -6 }}>AGENT™</div>
        </div>
        <div style={{ opacity: ctaOpacity, marginBottom: 32 }}>
          <div style={{ fontFamily: "sans-serif", color: K.t1, fontSize: 40, fontWeight: 700 }}>Ready to transform your ad spend?</div>
        </div>
        <div style={{
          opacity: interpolate(urlProgress, [0, 1], [0, 1]),
          transform: `scale(${interpolate(urlProgress, [0, 1], [0.9, 1])})`,
          display: "inline-flex", alignItems: "center", gap: 16,
          background: `${K.blue}15`, border: `2px solid ${K.blue}50`, borderRadius: 16, padding: "20px 48px",
          boxShadow: `0 0 40px ${K.blue}25`,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: K.mint, boxShadow: `0 0 10px ${K.mint}` }} />
          <div style={{ fontFamily: "monospace", color: K.t1, fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>keekii.net</div>
        </div>
        <div style={{ opacity: interpolate(frame, [120, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), marginTop: 32, fontFamily: "sans-serif", color: K.t3, fontSize: 18 }}>
          Free tier available · No credit card required · Launch in 5 minutes
        </div>
      </div>
    </AbsoluteFill>
  );
};

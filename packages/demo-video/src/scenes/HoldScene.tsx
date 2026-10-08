import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { K } from "../lib/theme";

// Simplified Hold — logo with subtle glow (fewer particles)
export const HoldScene: React.FC = () => {
  const frame = useCurrentFrame();
  const glowPulse = Math.sin(frame * 0.03) * 0.15 + 0.85;

  return (
    <AbsoluteFill style={{ background: K.g950, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", width: 800, height: 800, borderRadius: "50%",
        background: `radial-gradient(circle, ${K.blue}12 0%, transparent 70%)`, opacity: glowPulse,
      }} />
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ fontFamily: "monospace", fontSize: 80, fontWeight: 900, color: K.t1, letterSpacing: 8, textShadow: `0 0 40px ${K.blue}40`, opacity: 0.9 }}>KIKI</div>
        <div style={{ fontFamily: "monospace", fontSize: 14, color: K.blue, letterSpacing: 6, marginTop: -4, opacity: 0.7 }}>AGENT™</div>
        <div style={{ fontFamily: "monospace", color: K.t3, fontSize: 14, marginTop: 32, opacity: 0.5, letterSpacing: 2 }}>keekii.net</div>
      </div>
    </AbsoluteFill>
  );
};

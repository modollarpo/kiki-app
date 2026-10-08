import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, AbsoluteFill } from "remotion";
import { K } from "../lib/theme";

// Simplified Results
export const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const metrics = [
    { label: "AI AGENTS", value: 6, from: 0, suffix: "", color: K.blue },
    { label: "SIGNAL FEATURES", value: 28, from: 0, suffix: "", color: K.mint },
    { label: "AD PLATFORMS", value: 8, from: 0, suffix: "", color: K.teal },
    { label: "LTV HORIZON", value: 90, from: 0, suffix: "d", color: K.oaas },
  ];

  return (
    <AbsoluteFill style={{ background: K.g950, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", zIndex: 1, width: 1600 }}>
        <div style={{ opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }), marginBottom: 60 }}>
          <div style={{ fontFamily: "monospace", color: K.mint, fontSize: 14, letterSpacing: 4, marginBottom: 12 }}>THE ENRICHMENT</div>
          <div style={{ fontFamily: "sans-serif", color: K.t1, fontSize: 52, fontWeight: 800 }}>A raw order becomes an <span style={{ color: K.mint }}>LTV signal.</span></div>
        </div>

        <div style={{ display: "flex", gap: 32, justifyContent: "center", marginBottom: 60 }}>
          {metrics.map((m, i) => {
            const delay = 20 + i * 25;
            const progress = spring({ frame: frame - delay, fps, config: { damping: 18 } });
            const valueProgress = spring({ frame: frame - delay - 10, fps, config: { damping: 25, mass: 0.8 } });
            const currentValue = interpolate(valueProgress, [0, 1], [m.from, m.value]);
            return (
              <div key={i} style={{
                opacity: interpolate(progress, [0, 1], [0, 1]),
                transform: `scale(${interpolate(progress, [0, 1], [0.85, 1])})`,
                background: K.g850, border: `1px solid ${m.color}30`, borderRadius: 20, padding: "36px 48px", width: 300,
                boxShadow: `0 0 30px ${m.color}10`,
              }}>
                <div style={{ fontFamily: "sans-serif", color: K.t3, fontSize: 14, marginBottom: 12, letterSpacing: 2 }}>{m.label}</div>
                <div style={{ fontFamily: "monospace", color: m.color, fontSize: 56, fontWeight: 900 }}>
                  {currentValue.toFixed(0)}{m.suffix}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ opacity: interpolate(frame, [200, 240], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), display: "flex", gap: 40, justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "monospace", color: K.t3, fontSize: 13, marginBottom: 8 }}>RAW ORDER</div>
            <div style={{ fontFamily: "monospace", color: K.danger, fontSize: 36, fontWeight: 800 }}>$149</div>
          </div>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${K.mint}20`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${K.mint}40` }}>
            <div style={{ fontFamily: "sans-serif", color: K.mint, fontSize: 32 }}>→</div>
          </div>
          <div>
            <div style={{ fontFamily: "monospace", color: K.t3, fontSize: 13, marginBottom: 8 }}>ENRICHED SIGNAL</div>
            <div style={{ fontFamily: "monospace", color: K.mint, fontSize: 36, fontWeight: 800 }}>$639 LTV</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

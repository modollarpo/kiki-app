import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, AbsoluteFill } from "remotion";
import { K, AGENT_COLORS } from "../lib/theme";

// Simplified Agents showcase — static cards with status pulse
export const AgentsShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const agents = AGENT_COLORS.map((a, i) => ({
    ...a,
    code: ["BD", "CR", "SP", "SG", "OS", "SB"][i],
    tasks: [142, 89, 203, 167, 94, 312][i],
    accuracy: [96.2, 91.8, 98.1, 94.5, 97.3, 99.1][i],
  }));

  return (
    <AbsoluteFill style={{ background: K.g950, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", zIndex: 1, width: 1500 }}>
        <div style={{ opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }), marginBottom: 48 }}>
          <div style={{ fontFamily: "monospace", color: K.blue, fontSize: 14, letterSpacing: 4, marginBottom: 12 }}>AI-POWERED AGENTS</div>
          <div style={{ fontFamily: "sans-serif", color: K.t1, fontSize: 48, fontWeight: 800 }}>6 agents. Working 24/7.</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
          {[0, 1].map(row => (
            <div key={row} style={{ display: "flex", gap: 24 }}>
              {agents.slice(row * 3, row * 3 + 3).map((agent, idx) => {
                const i = row * 3 + idx;
                const delay = 30 + i * 18;
                const progress = spring({ frame: frame - delay, fps, config: { damping: 14 } });
                const pulseOpacity = 0.6 + Math.sin(frame * 0.08 + i) * 0.4;

                return (
                  <div key={i} style={{
                    opacity: interpolate(progress, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(progress, [0, 1], [60, 0])}px)`,
                    background: K.g850, border: `1px solid ${agent.color}40`, borderRadius: 16,
                    padding: "28px 28px 24px", width: 468, textAlign: "left",
                    boxShadow: `0 0 20px ${agent.color}10`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 12, background: `${agent.color}1c`, border: `1px solid ${agent.color}45`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ fontFamily: "monospace", color: agent.color, fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>{agent.code}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "sans-serif", color: K.t1, fontSize: 18, fontWeight: 700 }}>{agent.name}</div>
                        </div>
                      </div>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: K.mint, opacity: pulseOpacity, boxShadow: `0 0 8px ${K.mint}` }} />
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: K.t3, fontSize: 12 }}>TASKS</div>
                        <div style={{ fontFamily: "monospace", color: K.t1, fontSize: 24, fontWeight: 800 }}>{agent.tasks}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: K.t3, fontSize: 12 }}>ACCURACY</div>
                        <div style={{ fontFamily: "monospace", color: agent.color, fontSize: 24, fontWeight: 800 }}>{agent.accuracy}%</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: K.t3, fontSize: 12 }}>STATUS</div>
                        <div style={{ fontFamily: "monospace", color: K.mint, fontSize: 15, marginTop: 5 }}>● RUNNING</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

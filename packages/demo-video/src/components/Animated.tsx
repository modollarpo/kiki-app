import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { K } from "../lib/theme";

// ─── AnimatedText ─── Types on letter by letter
export const AnimatedText: React.FC<{
  text: string;
  delay?: number;
  speed?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, speed = 2, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  const chars = Math.floor(interpolate(progress, [0, 1], [0, text.length]));

  return (
    <span style={{ fontFamily: "monospace", color: K.t1, ...style }}>
      {text.slice(0, chars)}
      {chars < text.length && (
        <span style={{ opacity: frame % 15 < 8 ? 1 : 0, color: K.blue }}>_</span>
      )}
    </span>
  );
};

// ─── MetricCounter ─── Animated number
export const MetricCounter: React.FC<{
  from?: number;
  to: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: React.CSSProperties;
}> = ({ from = 0, to, delay = 0, prefix = "", suffix = "", decimals = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 30, mass: 0.8 } });
  const value = interpolate(progress, [0, 1], [from, to]);

  return (
    <span style={{ fontFamily: "monospace", fontWeight: 700, color: K.t1, ...style }}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
};

// ─── GlowCard ─── Card with colored border + glow
export const GlowCard: React.FC<{
  color?: string;
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ color = K.blue, delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = spring({ frame: frame - delay, fps, config: { damping: 15, mass: 0.6 } });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${interpolate(scale, [0, 1], [0.9, 1])})`,
        background: K.g850,
        border: `1px solid ${color}`,
        borderRadius: 16,
        padding: "24px 32px",
        boxShadow: `0 0 40px ${color}40, 0 8px 32px rgba(0,0,0,0.4)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── FadeIn ─── Simple fade + slide up
export const FadeIn: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const translateY = interpolate(frame - delay, [0, 20], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
};

// ─── GlowPulse ─── Pulsing glow circle behind content
export const GlowPulse: React.FC<{
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ color = K.blue, size = 400, style }) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.05) * 0.15 + 0.85;

  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
        transform: `scale(${pulse})`,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
};

// ─── ProgressBar ─── Animated bar fill
export const ProgressBar: React.FC<{
  from?: number;
  to: number;
  delay?: number;
  color?: string;
  height?: number;
  width?: string | number;
}> = ({ from = 0, to, delay = 0, color = K.blue, height = 8, width = "100%" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 25 } });
  const pct = interpolate(progress, [0, 1], [from, to]);

  return (
    <div style={{ width, height, background: K.g800, borderRadius: height / 2, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${color}, ${color}CC)`,
          borderRadius: height / 2,
          boxShadow: `0 0 12px ${color}60`,
        }}
      />
    </div>
  );
};

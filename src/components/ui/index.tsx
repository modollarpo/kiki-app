"use client";

import React, { useState } from "react";
import { K, PLATFORM_COLORS } from "@/lib/kdls";

// ─── Button ───────────────────────────────────────────────
type BtnVariant = "primary"|"secondary"|"ghost"|"danger"|"mint"|"violet"|"gold"|"teal";
type BtnSize    = "xs"|"sm"|"md"|"lg"|"xl";

export function Button({
  children, variant = "primary", size = "md", onClick, icon, disabled, full, loading, className = "", style,
}: {
  children?: React.ReactNode; variant?: BtnVariant; size?: BtnSize;
  onClick?: (e: React.MouseEvent) => void; icon?: React.ReactNode; disabled?: boolean;
  full?: boolean; loading?: boolean; className?: string; style?: React.CSSProperties;
}) {
  const [hov, setHov] = useState(false);
  const bgMap: Record<BtnVariant, string> = {
    primary:   hov ? K.blue : K.blue,
    secondary: hov ? K.g800 : K.g750,
    ghost:     "transparent",
    danger:    hov ? K.danger : K.danger,
    mint:      hov ? K.mint4 : K.mint,
    violet:    hov ? K.oaas : K.oaas,
    gold:      K.goldD,
    teal:      K.tealD,
  };
  const colorMap: Record<BtnVariant, string> = {
    primary: "white", secondary: K.t2, ghost: hov ? K.t2 : K.t3,
    danger: "white", mint: K.void, violet: "white", gold: K.gold, teal: K.teal,
  };
  const borderMap: Record<BtnVariant, string> = {
    primary: "transparent", secondary: K.g700, ghost: "transparent",
    danger: "transparent", mint: "transparent", violet: "transparent",
    gold: `${K.gold}40`, teal: `${K.teal}40`,
  };
  const glowMap: Record<BtnVariant, string | undefined> = {
    primary: K.blue, secondary: undefined, ghost: undefined,
    danger: K.danger, mint: K.mint, violet: K.oaas, gold: undefined, teal: undefined,
  };
  const padMap: Record<BtnSize, string> = {
    xs: "4px 10px", sm: "7px 14px", md: "10px 18px", lg: "12px 24px", xl: "14px 32px",
  };
  const fsMap: Record<BtnSize, number> = { xs: 10, sm: 11, md: 12, lg: 13, xl: 14 };
  const glow = glowMap[variant];

  return (
    <button
      onClick={disabled || loading ? undefined : (e) => onClick?.(e)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: padMap[size], background: bgMap[variant], color: colorMap[variant],
        border: `1px solid ${borderMap[variant]}`, borderRadius: 2,
        fontFamily: K.mono, fontSize: fsMap[size], fontWeight: 600,
        letterSpacing: "0.04em", transition: "all 0.15s",
        opacity: disabled || loading ? 0.38 : 1,
        width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined,
        boxShadow: hov && glow ? `0 0 20px ${glow}30` : undefined,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        position: "relative", overflow: "hidden", ...style,
      }}
    >
      {loading ? (
        <span style={{ width: 12, height: 12, border: `2px solid ${colorMap[variant]}30`, borderTopColor: colorMap[variant], borderRadius: "50%", display: "inline-block", animation: "kdls-spin 1s linear infinite" }} />
      ) : icon}
      {children}
      {hov && !disabled && (
        <span style={{ position: "absolute", top: 0, left: "-100%", width: "60%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)", animation: "kdls-beam 0.5s ease-out" }} />
      )}
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────────
export function Badge({ children, color = K.blue, dot, pulse, style }: {
  children: React.ReactNode; color?: string; dot?: boolean; pulse?: boolean; style?: React.CSSProperties;
}) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 7px", background: `${color}14`, color,
      fontFamily: K.mono, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.08em", borderRadius: 2, flexShrink: 0,
      ...style,
    }}>
      {dot && <span className={pulse ? "animate-kdls-pulse" : ""} style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />}
      {children}
    </span>
  );
}

// ─── StatusBadge ──────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    active:    { label: "ACTIVE",    color: K.mint },
    live:      { label: "LIVE",      color: K.mint },
    running:   { label: "RUNNING",   color: K.blue },
    paused:    { label: "PAUSED",    color: K.warn },
    error:     { label: "ERROR",     color: K.danger },
    pending:   { label: "PENDING",   color: K.t3 },
    completed: { label: "DONE",      color: K.pos },
    draft:     { label: "DRAFT",     color: K.t3 },
    degraded:  { label: "DEGRADED",  color: K.warn },
    suspended: { label: "SUSPENDED", color: K.danger },
    healthy:   { label: "HEALTHY",   color: K.mint },
    connected: { label: "CONNECTED", color: K.mint },
    settled:   { label: "SETTLED",   color: K.pos },
  };
  const cfg = map[status] || { label: status.toUpperCase(), color: K.t3 };
  const liveStatuses = ["active", "live", "running", "healthy", "connected"];
  return <Badge color={cfg.color} dot pulse={liveStatuses.includes(status)}>{cfg.label}</Badge>;
}

// ─── Card ─────────────────────────────────────────────────
export function Card({ children, accent, glow, padding = 20, hover, onClick, style, className = "" }: {
  children: React.ReactNode; accent?: string; glow?: string;
  padding?: number; hover?: boolean; onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties; className?: string;
}) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => setH(false)}
      className={className}
      style={{
        background: h ? K.g850 : K.g900,
        border: `1px solid ${h ? K.g700 : K.g800}`,
        borderRadius: 2, padding,
        position: "relative", overflow: "hidden",
        transition: "all 0.15s",
        cursor: onClick ? "pointer" : undefined,
        boxShadow: glow ? `0 0 20px ${glow}25` : undefined,
        ...style,
      }}
    >
      {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accent}80,transparent)` }} />}
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────
export function Input({ placeholder, prefix, suffix, value, onChange, type = "text", mono, error, label, hint, style }: {
  placeholder?: string; prefix?: string; suffix?: string;
  value?: string; onChange?: (v: string) => void; type?: string;
  mono?: boolean; error?: string; label?: string; hint?: string;
  style?: React.CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={style}>
      {label && <p style={{ fontFamily: K.mono, fontSize: 10, letterSpacing: "0.1em", color: K.t3, marginBottom: 6, textTransform: "uppercase" }}>{label}</p>}
      <div style={{
        display: "flex", alignItems: "center",
        background: K.g800, borderRadius: 2,
        border: `1px solid ${error ? K.danger : focused ? K.blue : K.g700}`,
        boxShadow: focused && !error ? `0 0 0 2px ${K.blueD}` : undefined,
        transition: "all 0.15s",
      }}>
        {prefix && <span style={{ paddingLeft: 12, fontFamily: K.mono, fontSize: 12, color: K.t3, flexShrink: 0 }}>{prefix}</span>}
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            flex: 1, padding: "10px 14px", background: "transparent", border: "none", outline: "none",
            fontFamily: mono ? K.mono : K.sans, fontSize: 13, color: K.t1,
            letterSpacing: mono ? "-0.01em" : undefined,
          }}
        />
        {suffix && <span style={{ paddingRight: 12, fontFamily: K.mono, fontSize: 12, color: error ? K.danger : focused ? K.blue4 : K.t3, flexShrink: 0 }}>{suffix}</span>}
      </div>
      {error && <p style={{ fontFamily: K.mono, fontSize: 10, color: K.danger, marginTop: 4 }}>{error}</p>}
      {hint && !error && <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        onClick={() => onChange(!on)}
        style={{
          width: 38, height: 20, borderRadius: 10,
          background: on ? K.blue : K.g700,
          position: "relative", border: "none", cursor: "pointer",
          transition: "background 0.2s",
          boxShadow: on ? `0 0 12px ${K.blue}40` : undefined,
          flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 2, width: 16, height: 16,
          left: on ? 20 : 2, borderRadius: "50%", background: "white",
          transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }} />
      </button>
      {label && <span style={{ fontFamily: K.sans, fontSize: 13, color: K.t2 }}>{label}</span>}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────
export function Divider({ my = 14 }: { my?: number }) {
  return (
    <div style={{
      height: 1, margin: `${my}px 0`,
      background: `linear-gradient(90deg, transparent, ${K.g700}, transparent)`,
    }} />
  );
}

// ─── ProgressBar ──────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = K.blue, height = 4, glow }: {
  value: number; max?: number; color?: string; height?: number; glow?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: K.g800, borderRadius: height, overflow: "hidden", height }}>
      <div style={{
        width: `${pct}%`, height: "100%", background: color,
        borderRadius: height, transition: "width 0.5s",
        boxShadow: glow ? `0 0 8px ${color}60` : undefined,
      }} />
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────
export function Sparkline({ data, color = K.blue, width = 80, height = 28 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - mn) / range) * (height - 4) - 2}`
  ).join(" ");
  return (
    <svg width={width} height={height} style={{ flexShrink: 0, overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── PlatformChip ─────────────────────────────────────────
export function PlatformChip({ platform, size = 18 }: { platform: string; size?: number }) {
  const color = PLATFORM_COLORS[platform.toLowerCase()] || K.t3;
  const letter = platform?.[0]?.toUpperCase() || "?";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: 2,
      background: `${color}18`, color,
      fontFamily: K.mono, fontSize: size * 0.45, fontWeight: 700, flexShrink: 0,
    }}>
      {letter}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────
export function Skeleton({ width = "100%", height = 14 }: { width?: string | number; height?: number }) {
  return (
    <div className="animate-kdls-shimmer" style={{
      width, height, borderRadius: 2,
      background: `linear-gradient(90deg, ${K.g850}, ${K.g800}, ${K.g850})`,
      backgroundSize: "200% 100%",
    }} />
  );
}

// ─── StatCard ─────────────────────────────────────────────
export function StatCard({ label, value, delta, period, accent = K.blue, sparkline, sub, loading }: {
  label: string; value: string; delta?: number; period?: string;
  accent?: string; sparkline?: number[]; sub?: string; loading?: boolean;
}) {
  return (
    <Card accent={accent}>
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.18em", color: K.t4, textTransform: "uppercase" }}>{label}</p>
      </div>
      {loading ? (
        <><Skeleton width="45%" height={28} /><div style={{ marginTop: 8 }}><Skeleton width="35%" height={10} /></div></>
      ) : (
        <>
          <span className="mono-value" style={{ fontSize: 26, fontWeight: 700, color: K.t1, display: "block" }}>{value}</span>
          {sub && <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginTop: 4 }}>{sub}</p>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            {delta !== undefined && (
              <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: delta >= 0 ? K.mint : K.danger }}>
                {delta >= 0 ? "↑" : "↓"}{Math.abs(delta).toFixed(1)}%
                {period && <span style={{ fontWeight: 400, color: K.t4, fontSize: 10 }}> vs {period}</span>}
              </span>
            )}
            {sparkline && <Sparkline data={sparkline} color={accent} />}
          </div>
        </>
      )}
    </Card>
  );
}

// ─── SectionLabel ─────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.18em", color: K.t4, textTransform: "uppercase", marginBottom: 10 }}>
      {children}
    </p>
  );
}

// ─── AIThinking ───────────────────────────────────────────
export function AIThinking({ label = "SyncBrain is analyzing...", text }: { label?: string; text?: string }) {
  const message = text ?? label;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", background: `${K.blue}08`,
      border: `1px solid ${K.blue}25`, borderRadius: 2,
    }}>
      <span style={{
        width: 12, height: 12,
        border: `2px solid ${K.blue}30`, borderTopColor: K.blue,
        borderRadius: "50%", display: "inline-block", flexShrink: 0,
        animation: "kdls-spin 1s linear infinite",
      }} />
      <span style={{ fontFamily: K.mono, fontSize: 11, color: K.blue, fontStyle: "italic" }}>{message}</span>
      <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="animate-kdls-pulse" style={{ width: 4, height: 4, borderRadius: "50%", background: K.blue, animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────
export function EmptyState({ icon, title, body, cta, onCta, accent = K.t3 }: {
  icon?: string; title: string; body?: string; cta?: string; onCta?: () => void; accent?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", textAlign: "center" }}>
      {icon && (
        <div className="animate-float" style={{ width: 56, height: 56, borderRadius: 2, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: accent, marginBottom: 14 }}>
          {icon}
        </div>
      )}
      <p style={{ fontFamily: K.mono, fontSize: 13, fontWeight: 700, color: K.t3, marginBottom: body ? 8 : 0 }}>{title}</p>
      {body && <p style={{ fontFamily: K.sans, fontSize: 12, color: K.t4, lineHeight: 1.6, maxWidth: 320 }}>{body}</p>}
      {cta && onCta && (
        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" size="sm" onClick={onCta}>{cta}</Button>
        </div>
      )}
    </div>
  );
}

// KIKI Design Language System — Resolved hex for Remotion (no CSS vars)
// Mirrors src/lib/kdls.ts BRAND_COLORS + GLOWS

export const K = {
  // Surfaces
  g950: "#030712",
  g900: "#111827",
  g850: "#1f2937",
  g800: "#374151",
  g750: "#4b5563",
  g700: "#6b7280",

  // Text
  t1: "#f9fafb",
  t2: "#9ca3af",
  t3: "#6b7280",

  // Brand
  blue: "#005CFF",
  blue4: "#3380FF",
  blueDim: "rgba(0,92,255,0.15)",
  blueGlow: "rgba(0,92,255,0.35)",

  mint: "#31F3C3",
  mint4: "#5AF5D0",
  mintDim: "rgba(49,243,195,0.12)",

  gold: "#F0A500",
  goldDim: "rgba(240,165,0,0.12)",

  oaas: "#7B2FFF",
  oaasDim: "rgba(123,47,255,0.12)",

  teal: "#00B8CC",
  green: "#00CC66",
  danger: "#FF3B3B",
  warn: "#F5A623",
  pink: "#FF4D9D",
  crm: "#FF6A1A",
  indigo: "#4040CF",

  // Glow shadows
  glowBlue: "0 0 30px rgba(0,92,255,0.5)",
  glowMint: "0 0 30px rgba(49,243,195,0.4)",
  glowGold: "0 0 30px rgba(240,165,0,0.4)",
  glowOaas: "0 0 30px rgba(123,47,255,0.4)",
  glowDanger: "0 0 30px rgba(255,59,59,0.5)",
} as const;

// Agent brand colors (6 agents)
export const AGENT_COLORS = [
  { name: "Bid Optimizer", color: K.blue, icon: "⚡" },
  { name: "Creative Analyst", color: K.mint, icon: "🎨" },
  { name: "Budget Guardian", color: K.gold, icon: "🛡" },
  { name: "Signal Scanner", color: K.teal, icon: "📡" },
  { name: "LTV Predictor", color: K.oaas, icon: "📊" },
  { name: "Fraud Detector", color: K.danger, icon: "🔒" },
] as const;

// Platform colors
export const PLATFORMS = {
  meta: "#1877F2",
  google: "#4285F4",
  tiktok: "#FF0050",
  linkedin: "#0A66C2",
  snapchat: "#FFFC00",
  pinterest: "#E60023",
} as const;

// Video config
export const VIDEO = {
  WIDTH: 1920,
  HEIGHT: 1080,
  FPS: 24,
  DURATION_SECONDS: 60,
  get TOTAL_FRAMES() {
    return this.FPS * this.DURATION_SECONDS;
  },
} as const;

// Scene timing (in frames at 24fps)
export const TIMING = {
  FPS: 24,
  PROBLEM: { start: 0, duration: 168 },       // 0:00 – 0:07
  LOGO: { start: 168, duration: 96 },         // 0:07 – 0:11
  DASHBOARD: { start: 264, duration: 360 },   // 0:11 – 0:26
  AGENTS: { start: 624, duration: 240 },      // 0:26 – 0:36
  RESULTS: { start: 864, duration: 240 },     // 0:36 – 0:46
  CTA: { start: 1104, duration: 144 },        // 0:46 – 0:52
  HOLD: { start: 1248, duration: 192 },       // 0:52 – 1:00
} as const;

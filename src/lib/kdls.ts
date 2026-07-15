// ============================================================
// KIKI Design Language System (KDLS) — Complete Token Library
// ============================================================

export const K = {
  // Substrate
  void: "#0A0A0B", g950: "#0F0F0F", g900: "#131316", g850: "#181820",
  g800: "#1E1E28", g750: "#222232", g700: "#252535", g600: "#32324A",
  // Text
  t1: "#F0F0FA", t2: "#9090AA", t3: "#50506A", t4: "#2E2E48",
  // Brand
  blue: "#005CFF", blue4: "#3380FF", blueD: "#060E28", blueT: "rgba(0,92,255,0.08)",
  mint: "#31F3C3", mint4: "#5AF5D0", mintD: "#061A14", mintT: "rgba(49,243,195,0.08)",
  gold: "#F0A500", goldD: "#1A1000", goldT: "rgba(240,165,0,0.08)",
  oaas: "#7B2FFF", oaasD: "#100820", oaasT: "rgba(123,47,255,0.08)",
  indigo: "#4040CF", indigoD: "#0A0A28",
  crm: "#FF6A1A", crmD: "#1A0800", crmT: "rgba(255,106,26,0.08)",
  teal: "#00B8CC", tealD: "#001418", tealT: "rgba(0,184,204,0.08)",
  green: "#00CC66", greenD: "#001A0E", greenT: "rgba(0,204,102,0.08)",
  pos: "#00D084", posD: "#001A0E",
  warn: "#F5A623", warnD: "#1A1000", warnT: "rgba(245,166,35,0.08)",
  danger: "#FF3B3B", dangerD: "#1A0606", dangerT: "rgba(255,59,59,0.08)",
  pink: "#FF4D9D", pinkD: "#1A0810", pinkT: "rgba(255,77,157,0.08)",
  // Typography
  mono: "'JetBrains Mono', 'Courier New', monospace",
  sans: "'Inter', system-ui, sans-serif",
} as const;

// Service accent colors map
export const SERVICE_COLORS: Record<string, string> = {
  agent:    K.blue,
  campaign: K.mint,
  wallet:   K.gold,
  oaas:     K.oaas,
  cards:    K.indigo,
  crm:      K.crm,
  signals:  K.teal,
  syncbrain:K.green,
  fraud:    K.danger,
  analytics:K.oaas,
  billing:  K.gold,
  aiops:    K.green,
};

// Platform colors
export const PLATFORM_COLORS: Record<string, string> = {
  meta:      "#1877F2",
  google:    "#4285F4",
  tiktok:    "#FF0050",
  linkedin:  "#0A66C2",
  youtube:   "#FF0000",
  snapchat:  "#FFFC00",
  pinterest: "#E60023",
  twitter:   "#1DA1F2",
  amazon:    "#FF9900",
  dv360:     "#4285F4",
  reddit:    "#FF4500",
};

// Glow shadows
export const GLOWS = {
  blue:   "0 0 20px rgba(0,92,255,0.35)",
  mint:   "0 0 20px rgba(49,243,195,0.30)",
  gold:   "0 0 20px rgba(240,165,0,0.30)",
  oaas:   "0 0 20px rgba(123,47,255,0.30)",
  danger: "0 0 20px rgba(255,59,59,0.35)",
} as const;

// cn utility (className merger)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Format utilities
export const fmt = {
  currency: (n: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n),
  percent: (n: number, decimals = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`,
  compact: (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` :
    n.toLocaleString(),
  roas: (n: number) => `${n.toFixed(2)}×`,
  timestamp: (d: Date) => d.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
};

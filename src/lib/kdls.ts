// ============================================================
// KIKI Design Language System (KDLS) — Theme-Aware Token Library
// All tokens resolve to CSS variables, enabling light/dark toggle.
// ============================================================

export const K = {
  // Substrate (surface colors)
  void: "var(--void)", g950: "var(--g950)", g900: "var(--g900)", g850: "var(--g850)",
  g800: "var(--g800)", g750: "var(--g750)", g700: "var(--g700)", g600: "var(--g600)",
  // Text (WCAG AA compliant in both themes)
  t1: "var(--t1)", t2: "var(--t2)", t3: "var(--t3)", t4: "var(--t4)",
  // Brand
  blue: "var(--blue)", blue4: "var(--blue4)", blueD: "var(--blue-d)", blueT: "var(--blueT)",
  mint: "var(--mint)", mint4: "var(--mint4)", mintD: "var(--mint-d)", mintT: "var(--mintT)",
  gold: "var(--gold)", goldD: "var(--gold-d)", goldT: "var(--goldT)",
  oaas: "var(--oaas)", oaasD: "var(--oaas-d)", oaasT: "var(--oaasT)",
  indigo: "var(--indigo)", indigoD: "var(--indigo-d)",
  crm: "var(--crm)", crmD: "var(--crm-d)", crmT: "var(--crmT)",
  teal: "var(--teal)", tealD: "var(--teal-d)", tealT: "var(--tealT)",
  green: "var(--green)", greenD: "var(--green-d)", greenT: "var(--greenT)",
  pos: "var(--pos)", posD: "var(--posD)",
  warn: "var(--warn)", warnD: "var(--warn-d)", warnT: "var(--warnT)",
  danger: "var(--danger)", dangerD: "var(--danger-d)", dangerT: "var(--dangerT)",
  pink: "var(--pink)", pinkD: "var(--pink-d)", pinkT: "var(--pinkT)",
  // Card / surface tokens
  cardBg: "var(--card-bg)", cardBorder: "var(--card-border)", cardHover: "var(--card-hover)",
  inputBg: "var(--input-bg)", inputBorder: "var(--input-border)",
  tooltipBg: "var(--tooltip-bg)", tooltipBorder: "var(--tooltip-border)",
  // Typography
  mono: "var(--font-mono)",
  sans: "var(--font-sans)",
  // Radii
  rSm: "var(--r-sm)", rMd: "var(--r-md)", rLg: "var(--r-lg)", rXl: "var(--r-xl)",
} as const;

// Static brand colors (don't change with theme — used for badges, charts)
export const BRAND_COLORS = {
  blue: "#005CFF", blue4: "#3380FF", mint: "#31F3C3", mint4: "#5AF5D0",
  gold: "#F0A500", oaas: "#7B2FFF", teal: "#00B8CC", green: "#00CC66",
  danger: "#FF3B3B", warn: "#F5A623", pos: "#00D084", pink: "#FF4D9D",
  crm: "#FF6A1A", indigo: "#4040CF",
} as const;

// Service accent colors map
export const SERVICE_COLORS: Record<string, string> = {
  agent: K.blue, campaign: K.mint, wallet: K.gold, oaas: K.oaas,
  cards: K.indigo, crm: K.crm, signals: K.teal, syncbrain: K.green,
  fraud: K.danger, analytics: K.oaas, billing: K.gold, aiops: K.green,
};

// Platform colors
export const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2", google: "#4285F4", tiktok: "#FF0050", linkedin: "#0A66C2",
  youtube: "#FF0000", snapchat: "#FFFC00", pinterest: "#E60023", twitter: "#1DA1F2",
  amazon: "#FF9900", dv360: "#4285F4", reddit: "#FF4500",
};

// Glow shadows (theme-aware)
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

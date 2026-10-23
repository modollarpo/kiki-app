import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // KDLS Substrate (CSS variables for theme support)
        void:    "var(--void)",
        g950:    "var(--g950)",
        g900:    "var(--g900)",
        g850:    "var(--g850)",
        g800:    "var(--g800)",
        g750:    "var(--g750)",
        g700:    "var(--g700)",
        g600:    "var(--g600)",
        // KDLS Text
        t1:      "var(--t1)",
        t2:      "var(--t2)",
        t3:      "var(--t3)",
        t4:      "var(--t4)",
        // Fixed text for always-dark surfaces
        tdark1:  "var(--t-dark-1)",
        tdark2:  "var(--t-dark-2)",
        tdark3:  "var(--t-dark-3)",
        tdark4:  "var(--t-dark-4)",
        // KDLS Brand
        kblue:   "var(--blue)",
        kblue4:  "var(--blue4)",
        kmint:   "var(--mint)",
        kmint4:  "var(--mint4)",
        kgold:   "var(--gold)",
        koaas:   "var(--oaas)",
        kindigo: "var(--indigo)",
        kcrm:    "var(--crm)",
        kteal:   "var(--teal)",
        kgreen:  "var(--green)",
        // KDLS Semantic
        kpos:    "var(--pos)",
        kwarn:   "var(--warn)",
        kdanger: "var(--danger)",
        // Card / surface tokens
        kcard:       "var(--card-bg)",
        kcardborder: "var(--card-border)",
        kcardhover:  "var(--card-hover)",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // ── Design-system type scale (rem, base 16px) ──────────
        // caption is the minimum size for anything a user must read.
        // micro is allowed ONLY for non-essential metadata (axis ticks,
        // dense-table timestamps).
        caption: ["0.75rem", { lineHeight: "1.4" }],   // 12px
        micro:   ["0.6875rem", { lineHeight: "1.35" }], // 11px — metadata only
        small:   ["0.8125rem", { lineHeight: "1.5" }],  // 13px — table cells
        body:    ["0.875rem", { lineHeight: "1.55" }],  // 14px — default body
        lead:    ["1rem", { lineHeight: "1.6" }],       // 16px
        h4:      ["1.125rem", { lineHeight: "1.4" }],   // 18px
        h3:      ["1.25rem", { lineHeight: "1.35" }],   // 20px
        h2:      ["1.5rem", { lineHeight: "1.3" }],     // 24px
        h1:      ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }], // 30px
        display: ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],  // 40px
      },
      borderRadius: {
        kdls: "2px",
      },
      boxShadow: {
        "glow-blue":   "0 0 20px rgba(0,92,255,0.35)",
        "glow-mint":   "0 0 20px rgba(49,243,195,0.30)",
        "glow-gold":   "0 0 20px rgba(240,165,0,0.30)",
        "glow-oaas":   "0 0 20px rgba(123,47,255,0.30)",
        "glow-danger": "0 0 20px rgba(255,59,59,0.35)",
      },
      animation: {
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
        "scan":      "scan 2s linear infinite",
        "beam":      "beam 0.6s ease-out",
        "ticker":    "ticker 30s linear infinite",
        "float":     "float 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-dot": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%":     { opacity: "0.4", transform: "scale(0.7)" },
        },
        scan:  { "0%": { top: "-1px" }, "100%": { top: "100%" } },
        beam:  { "0%": { left: "-100%" }, "100%": { left: "200%" } },
        ticker:{ "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
    },
  },
  plugins: [],
};

export default config;

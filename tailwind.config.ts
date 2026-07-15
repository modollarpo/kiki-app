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
        // KDLS Substrate
        void:    "#0A0A0B",
        g950:    "#0F0F0F",
        g900:    "#131316",
        g850:    "#181820",
        g800:    "#1E1E28",
        g750:    "#222232",
        g700:    "#252535",
        g600:    "#32324A",
        // KDLS Text
        t1:      "#F0F0FA",
        t2:      "#9090AA",
        t3:      "#50506A",
        t4:      "#2E2E48",
        // KDLS Brand
        kblue:   "#005CFF",
        kblue4:  "#3380FF",
        kmint:   "#31F3C3",
        kmint4:  "#5AF5D0",
        kgold:   "#F0A500",
        koaas:   "#7B2FFF",
        kindigo: "#4040CF",
        kcrm:    "#FF6A1A",
        kteal:   "#00B8CC",
        kgreen:  "#00CC66",
        // KDLS Semantic
        kpos:    "#00D084",
        kwarn:   "#F5A623",
        kdanger: "#FF3B3B",
      },
      fontFamily: {
        mono:    ["JetBrains Mono", "Courier New", "monospace"],
        sans:    ["Inter", "system-ui", "sans-serif"],
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

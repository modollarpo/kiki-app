import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KIKI Agent™ — Autonomous Marketing Intelligence",
    short_name: "KIKI Agent",
    description:
      "KIKI Agent™ unifies your ad accounts, CRM, and AI agents into one autonomous marketing command center.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0B",
    theme_color: "#005CFF",
    orientation: "portrait-primary",
    categories: ["business", "productivity", "developer-tools"],
    lang: "en",
    dir: "ltr",
    id: "/",
    scope: "/",
    display_override: ["standalone", "minimal-ui"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      { src: "/icons/icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any maskable" },
    ],
    shortcuts: [
      { name: "Dashboard", short_name: "Dashboard", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    screenshots: [
      {
        src: "/icons/splash-narrow.png",
        sizes: "1290x2796",
        type: "image/png",
        form_factor: "narrow",
        label: "KIKI Agent — Autonomous Marketing Command Center",
      },
      {
        src: "/icons/splash-wide.png",
        sizes: "2048x2732",
        type: "image/png",
        form_factor: "wide",
        label: "KIKI Agent — Full Dashboard View",
      },
    ],
  };
}

import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kiki.ai";

// Public, indexable marketing & legal routes (dashboard/auth routes are
// excluded — they are gated and set to noindex in their layout metadata).
const PUBLIC_ROUTES: { path: string; priority: number; change: "daily" | "weekly" | "monthly" }[] = [
  { path: "", priority: 1.0, change: "daily" },
  { path: "/features", priority: 0.9, change: "weekly" },
  { path: "/pricing", priority: 0.9, change: "weekly" },
  { path: "/enterprise", priority: 0.8, change: "weekly" },
  { path: "/dashboard/agency", priority: 0.8, change: "weekly" },
  { path: "/mobile", priority: 0.8, change: "weekly" },
  { path: "/app-download", priority: 0.8, change: "weekly" },
  { path: "/about", priority: 0.7, change: "monthly" },
  { path: "/security", priority: 0.7, change: "monthly" },
  { path: "/privacy", priority: 0.5, change: "monthly" },
  { path: "/terms", priority: 0.5, change: "monthly" },
  { path: "/contact", priority: 0.6, change: "monthly" },
  { path: "/blog", priority: 0.7, change: "weekly" },
  { path: "/changelog", priority: 0.5, change: "weekly" },
  { path: "/docs", priority: 0.6, change: "weekly" },
  { path: "/status", priority: 0.4, change: "daily" },
  { path: "/nda", priority: 0.4, change: "monthly" },
  { path: "/oaas-agreement", priority: 0.4, change: "monthly" },
  { path: "/digital-handshake", priority: 0.4, change: "monthly" },
  { path: "/contracts", priority: 0.4, change: "monthly" },
  { path: "/privacy/consent", priority: 0.4, change: "monthly" },
  { path: "/dashboard/developer", priority: 0.6, change: "weekly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.change,
    priority: r.priority,
  }));
}

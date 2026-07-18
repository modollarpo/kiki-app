import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ── Output ──────────────────────────────────────────────
  output: "standalone",

  // ── TypeScript ──────────────────────────────────────────
  // Type-checking runs during build. The source of truth is `npm run
  // type-check` (tsc), which uses local Next.js type shims in
  // types/next-shims.d.ts because the installed `next` package in this
  // environment ships without its bundled .d.ts declarations.
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── ESLint ──────────────────────────────────────────────
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ── Images ──────────────────────────────────────────────
  images: {
    domains: [
      "kiki.ai",
      "api.kiki.ai",
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },

  // ── Compression ──────────────────────────────────────────
  compress: true,

  // ── Trailing slash ───────────────────────────────────────
  trailingSlash: false,

  // ── PoweredByHeader ──────────────────────────────────────
  poweredByHeader: false,

  // ── Experimental ─────────────────────────────────────────
  experimental: {
    // optimizePackageImports causes RSC module resolution errors in dev
    // optimizePackageImports: ["lucide-react", "recharts"],
  },

  // ── Security & perf headers ──────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Security
          { key: "X-Frame-Options",           value: "DENY"                               },
          { key: "X-Content-Type-Options",     value: "nosniff"                            },
          { key: "X-XSS-Protection",           value: "1; mode=block"                     },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin"    },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(self)" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.kiki.ai wss://ws.kiki.ai https://fonts.googleapis.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          // HSTS (only in production)
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
          // PWA
          { key: "Service-Worker-Allowed",     value: "/"                                  },
        ],
      },
      // Long-cache for static assets
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // PWA manifest (Next.js serves the app manifest at /manifest.webmanifest)
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type",  value: "application/manifest+json"                      },
          { key: "Cache-Control", value: "public, max-age=3600"                            },
        ],
      },
      // API routes — no cache
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate"             },
        ],
      },
    ];
  },

  // ── Redirects ────────────────────────────────────────────
  async redirects() {
    return [
      // Legacy URL cleanup
      { source: "/home",     destination: "/",          permanent: true  },
      { source: "/login",    destination: "/auth/login", permanent: true  },
      { source: "/signup",   destination: "/auth/login", permanent: true  },
      { source: "/register", destination: "/auth/login", permanent: true  },
      { source: "/app",      destination: "/dashboard",  permanent: false },
      { source: "/docs/api", destination: "/docs",       permanent: false },
    ];
  },

  // ── Rewrites (API proxy in dev) ───────────────────────────
  async rewrites() {
    const isProd = process.env.NODE_ENV === "production";
    return isProd
      ? []
      : [
          {
            source: "/api/proxy/:path*",
            destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/:path*`,
          },
        ];
  },

  // ── Webpack (bundle optimization) ────────────────────────
  webpack(config: any, { isServer }: { isServer: boolean }) {
    // Ensure the "@" path alias resolves in every build environment
    // (tsconfig paths are sometimes not picked up by the container build).
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    if (isServer) {
      // Exclude native modules from webpack bundling
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "pg",
      ];
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;

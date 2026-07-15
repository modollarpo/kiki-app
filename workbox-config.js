// ============================================================
// KIKI Agent™ — Workbox PWA Service Worker Config
// Generates: public/sw.js
// ============================================================

module.exports = {
  globDirectory: "public/",
  globPatterns: [
    "**/*.{js,css,html,png,jpg,svg,ico,woff2,json}",
  ],
  swDest: "public/sw.js",
  swSrc: undefined, // generateSW mode

  runtimeCaching: [
    // ── App Shell (offline) ──────────────────────────────
    {
      urlPattern: /^https:\/\/kiki\.ai\/(auth|dashboard)/,
      handler: "NetworkFirst",
      options: {
        cacheName: "kiki-app-shell",
        expiration: { maxAgeSeconds: 86400 },       // 24h
        networkTimeoutSeconds: 5,
      },
    },

    // ── API responses (short-lived) ───────────────────────
    {
      urlPattern: /^https:\/\/api\.kiki\.ai\/v1\/(dashboard|campaigns|wallet)/,
      handler: "NetworkFirst",
      options: {
        cacheName: "kiki-api-data",
        expiration: { maxEntries: 50, maxAgeSeconds: 300 }, // 5 min
        networkTimeoutSeconds: 10,
      },
    },

    // ── Static assets (long-lived) ────────────────────────
    {
      urlPattern: /^https:\/\/kiki\.ai\/_next\/static\//,
      handler: "CacheFirst",
      options: {
        cacheName: "kiki-next-static",
        expiration: { maxAgeSeconds: 31536000 },    // 1 year (immutable)
      },
    },

    // ── Google Fonts ──────────────────────────────────────
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "kiki-fonts",
        expiration: { maxAgeSeconds: 2592000 },     // 30 days
      },
    },

    // ── Marketing pages (offline) ─────────────────────────
    {
      urlPattern: /^https:\/\/kiki\.ai\/(features|pricing|enterprise|security|about|blog|docs)/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "kiki-marketing",
        expiration: { maxAgeSeconds: 3600 },        // 1h
      },
    },

    // ── Images ────────────────────────────────────────────
    {
      urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "kiki-images",
        expiration: { maxEntries: 100, maxAgeSeconds: 604800 }, // 1 week
      },
    },
  ],

  // Offline fallback
  offlineFallback: {
    pageFallback: "/offline",
    imageFallback: "/icons/offline-placeholder.svg",
  },

  // Skip waiting + claim clients immediately
  skipWaiting: true,
  clientsClaim: true,
};

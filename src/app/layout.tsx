import type { Metadata, Viewport } from "next";
import "./globals.css";
import { homeMetadata } from "@/lib/seo";
import ToastProvider from "@/components/providers/ToastProvider";
import { HydrationGuard } from "@/components/providers/HydrationGuard";
import { ClientProviders } from "@/components/providers/ClientProviders";

export const metadata: Metadata = {
  ...homeMetadata,
  metadataBase: new URL("https://kiki.ai"),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/images/kiki.png", type: "image/png" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "icon", url: "/images/kiki.png", sizes: "500x500" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KIKI Agent™",
  },
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: "kiki-google-verification",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { color: "#005CFF", media: "(prefers-color-scheme: light)" },
    { color: "#0A0A0B", media: "(prefers-color-scheme: dark)" },
  ],
};

const JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "KIKI Agent™",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "Autonomous LTV Campaign Execution Platform. Enriches ad conversion signals with 90-day predicted customer LTV before delivery to Meta, Google, TikTok, and 12 other platforms.",
  url: "https://kiki.ai",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "490",
    highPrice: "1800",
    priceCurrency: "USD",
    offerCount: 3,
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "847",
  },
  publisher: {
    "@type": "Organization",
    name: "KIKI Agent Inc.",
    url: "https://kiki.ai",
    logo: {
      "@type": "ImageObject",
      url: "https://kiki.ai/icons/icon-192.png",
      width: 192,
      height: 192,
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSONLD }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#005CFF" />
      </head>
      <body
        suppressHydrationWarning
        style={{
          background: "#0A0A0B",
          color: "#F0F0FA",
          fontFamily: "'Inter',system-ui,sans-serif",
          margin: 0,
        }}
      >
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
        <HydrationGuard>
          <ToastProvider />
        </HydrationGuard>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

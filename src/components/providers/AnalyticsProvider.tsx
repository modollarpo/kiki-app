"use client";
import { useEffect } from "react";
import { useCookieConsent } from "@/components/CookieConsent";

declare global {
  interface Window {
    posthog?: {
      init: (key: string, config: Record<string, unknown>) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (id: string, properties?: Record<string, unknown>) => void;
      reset: () => void;
    };
  }
}

let initialized = false;

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (initialized) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
    if (!key) return;
    if (!consent?.analytics) return;

    initialized = true;

    const script = document.createElement("script");
    script.src = `${host}/static/array.js`;
    script.async = true;
    script.setAttribute("data-global", "posthog");
    script.onload = () => {
      if (window.posthog) {
        window.posthog.init(key, {
          api_host: host,
          person_profiles: "identified_only",
          capture_pageview: true,
          capture_pageleave: true,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      initialized = false;
    };
  }, [consent?.analytics]);

  return <>{children}</>;
}

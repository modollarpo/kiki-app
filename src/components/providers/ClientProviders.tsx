"use client";
import { CookieConsentProvider } from "@/components/CookieConsent";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      <AnalyticsProvider>
        {children}
      </AnalyticsProvider>
    </CookieConsentProvider>
  );
}

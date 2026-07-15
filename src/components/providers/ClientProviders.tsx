"use client";
import { CookieConsentProvider } from "@/components/CookieConsent";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      {children}
    </CookieConsentProvider>
  );
}

"use client";

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";

interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  thirdParty: boolean;
}

interface CookieConsentContextType {
  consent: CookieConsent | null;
  showBanner: boolean;
  updateConsent: (consent: Omit<CookieConsent, "necessary">) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  reopenBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return ctx;
}

const CONSENT_KEY = "kiki_cookie_consent";
const CONSENT_EXPIRY_DAYS = 365;

function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    return parsed.consent;
  } catch {
    return null;
  }
}

// /api/gdpr requires a JWT. The consent banner may render on pre-login
// marketing pages where no token exists yet — in that case the request
// stays unauthorized (and is ignored) until the user logs in.
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window === "undefined") return headers;
  try {
    const raw = localStorage.getItem("kiki-auth");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
      const token = parsed.state?.token;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  } catch { /* ignore */ }
  return headers;
}

function post(path: string, body: unknown) {
  fetch(path, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).catch(() => {});
}

function storeConsent(consent: CookieConsent) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CONSENT_EXPIRY_DAYS);
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ consent, expiresAt: expiresAt.toISOString() }));
}

function sendConsentToServer(consent: CookieConsent) {
  try {
    post("/api/gdpr", { action: "consent", consentType: "analytics", granted: consent.analytics });
    post("/api/gdpr", { action: "consent", consentType: "marketing", granted: consent.marketing });
    post("/api/gdpr", { action: "consent", consentType: "third_party", granted: consent.thirdParty });
  } catch {}
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
    } else {
      setShowBanner(true);
    }
  }, []);

  const updateConsent = useCallback((partial: Omit<CookieConsent, "necessary">) => {
    const full: CookieConsent = { necessary: true, ...partial };
    setConsent(full);
    storeConsent(full);
    setShowBanner(false);
    sendConsentToServer(full);
  }, []);

  const acceptAll = useCallback(() => {
    updateConsent({ analytics: true, marketing: true, thirdParty: true });
  }, [updateConsent]);

  const rejectAll = useCallback(() => {
    updateConsent({ analytics: false, marketing: false, thirdParty: false });
  }, [updateConsent]);

  const reopenBanner = useCallback(() => {
    setShowBanner(true);
  }, []);

  return (
    <CookieConsentContext.Provider value={{ consent, showBanner, updateConsent, acceptAll, rejectAll, reopenBanner }}>
      {children}
      <CookieConsentBannerInner showBanner={showBanner} />
    </CookieConsentContext.Provider>
  );
}

function CookieConsentBannerInner({ showBanner }: { showBanner: boolean }) {
  const { acceptAll, rejectAll, updateConsent } = useContext(CookieConsentContext)!;
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);

  if (!showBanner) return null;

  return (
    <div className="cookie-consent-overlay" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, padding: "16px",
    }}>
      <div style={{
        maxWidth: 640, margin: "0 auto", background: "#1A1A2E",
        border: "1px solid #2A2A4A", borderRadius: 12,
        boxShadow: "0 -4px 30px rgba(0,0,0,0.5)", padding: "20px 24px",
      }}>
        <h3 style={{ color: "#F0F0FF", fontSize: 15, fontWeight: 600, marginBottom: 8, marginTop: 0 }}>
          We value your privacy
        </h3>
        <p style={{ color: "#8888AA", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          We use cookies to enhance your experience, analyze site traffic, and personalize content.
          You can manage your preferences or accept all cookies.{" "}
          <a href="/privacy" style={{ color: "#005CFF", textDecoration: "underline" }}>Privacy Policy</a>
          {" "}<a href="/privacy/consent" style={{ color: "#005CFF", textDecoration: "underline" }}>Cookie Settings</a>
        </p>

        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            color: "#005CFF", fontSize: 12, marginTop: 8, background: "none",
            border: "none", cursor: "pointer", padding: 0,
          }}
        >
          {showDetails ? "Hide details" : "Customize preferences"}
        </button>

        {showDetails && (
          <div style={{ marginTop: 12, padding: 14, background: "#12121F", borderRadius: 8 }}>
            {[
              { label: "Necessary", desc: "Required for the platform to function", checked: true, locked: true },
              { label: "Analytics", desc: "Help us understand how you use the platform", checked: analytics, locked: false, onChange: () => setAnalytics(!analytics) },
              { label: "Marketing", desc: "Personalized ads and campaign recommendations", checked: marketing, locked: false, onChange: () => setMarketing(!marketing) },
              { label: "Third-Party", desc: "Data sharing with ad platforms (Meta, Google, TikTok)", checked: thirdParty, locked: false, onChange: () => setThirdParty(!thirdParty) },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div>
                  <div style={{ color: "#F0F0FF", fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                  <div style={{ color: "#666688", fontSize: 11 }}>{item.desc}</div>
                </div>
                {item.locked ? (
                  <span style={{ color: "#31F3C3", fontSize: 11, fontWeight: 500 }}>Always on</span>
                ) : (
                  <button
                    onClick={item.onChange}
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                      background: item.checked ? "#005CFF" : "#333355", position: "relative",
                      transition: "background 0.2s", padding: 0,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", background: "white",
                      position: "absolute", top: 2,
                      left: item.checked ? 20 : 2, transition: "left 0.2s",
                    }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {showDetails ? (
            <button
              onClick={() => updateConsent({ analytics, marketing, thirdParty })}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "#005CFF", color: "white", fontSize: 13, fontWeight: 600,
              }}
            >
              Save preferences
            </button>
          ) : (
            <button
              onClick={acceptAll}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "#005CFF", color: "white", fontSize: 13, fontWeight: 600,
              }}
            >
              Accept all
            </button>
          )}
          <button
            onClick={rejectAll}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "1px solid #333355",
              cursor: "pointer", background: "transparent", color: "#8888AA", fontSize: 13,
            }}
          >
            Reject all
          </button>
        </div>
      </div>
    </div>
  );
}

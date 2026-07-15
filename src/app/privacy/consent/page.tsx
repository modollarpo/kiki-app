"use client";
import { useState } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";
import { useCookieConsent } from "@/components/CookieConsent";

const COOKIE_CATEGORIES = [
  {
    id: "necessary" as const,
    title: "Strictly Necessary",
    desc: "Core cookies required for the platform to function. These cannot be disabled.",
    examples: ["Session cookies", "Authentication tokens", "Load balancer affinity", "CSRF protection", "Security headers"],
    required: true,
    color: K.mint,
  },
  {
    id: "analytics" as const,
    title: "Analytics & Performance",
    desc: "Help us understand how visitors interact with the platform. Aggregated and anonymized.",
    examples: ["Page view tracking", "Feature usage metrics", "Error logging", "Performance monitoring", "A/B test allocation"],
    required: false,
    color: K.blue,
  },
  {
    id: "marketing" as const,
    title: "Marketing & Personalization",
    desc: "Used to deliver relevant ads and measure campaign effectiveness across platforms.",
    examples: ["Ad targeting", "Retargeting pixels", "Conversion tracking", "Audience segmentation", "Lookalike modeling"],
    required: false,
    color: K.oaas,
  },
  {
    id: "thirdParty" as const,
    title: "Third-Party Integrations",
    desc: "Data shared with connected ad platforms (Meta, Google, TikTok, LinkedIn) via CAPI.",
    examples: ["Meta Conversions API", "Google Ads Enhanced Conversions", "TikTok Events API", "LinkedIn Insight Tag", "Pinterest Tag"],
    required: false,
    color: K.gold,
  },
];

const DATA_RETENTION = [
  { category: "Account data", retention: "Duration of subscription + 30 days" },
  { category: "Campaign data", retention: "24 months after campaign ends" },
  { category: "Signal/conversion data", retention: "12 months" },
  { category: "LTV predictions", retention: "24 months" },
  { category: "Analytics (anonymized)", retention: "Indefinite" },
  { category: "Audit logs", retention: "7 years (legal requirement)" },
  { category: "Payment data", retention: "Duration of subscription + 7 years" },
];

const YOUR_RIGHTS = [
  { right: "Right of Access", desc: "Request a copy of all personal data we hold about you.", icon: "📋" },
  { right: "Right to Rectification", desc: "Request correction of inaccurate personal data.", icon: "✏️" },
  { right: "Right to Erasure", desc: "Request deletion of your personal data (\"right to be forgotten\").", icon: "🗑️" },
  { right: "Right to Portability", desc: "Receive your data in a structured, machine-readable format.", icon: "📦" },
  { right: "Right to Object", desc: "Object to processing of your data for specific purposes.", icon: "🚫" },
  { right: "Right to Withdraw Consent", desc: "Withdraw previously given consent at any time.", icon: "↩️" },
];

export default function ConsentPage() {
  const { consent, updateConsent, reopenBanner } = useCookieConsent();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [exportRequested, setExportRequested] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  const handleToggle = (id: string) => {
    if (!consent || id === "necessary") return;
    const key = id as keyof typeof consent;
    updateConsent({
      analytics: key === "analytics" ? !consent.analytics : consent.analytics,
      marketing: key === "marketing" ? !consent.marketing : consent.marketing,
      thirdParty: key === "thirdParty" ? !consent.thirdParty : consent.thirdParty,
    });
  };

  return (
    <MarketingLayout>
      <div style={{ background: K.void, padding: "clamp(40px,6vw,80px) clamp(16px,4vw,48px)", maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Badge color={K.blue} style={{ marginBottom: 14 }}>PRIVACY & COMPLIANCE</Badge>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: "clamp(22px,4vw,34px)", color: K.t1, letterSpacing: "-0.025em", marginBottom: 8 }}>
            Cookie & Privacy Settings
          </h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, color: K.t3, lineHeight: 1.7, maxWidth: 600 }}>
            Manage how KIKI Agent uses cookies and processes your data. You can update your preferences at any time.
          </p>
        </div>

        {/* Current Status */}
        <div style={{ padding: 16, background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 2, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 12, color: K.t1, marginBottom: 4 }}>
              {consent ? "Your preferences are saved" : "No preferences saved yet"}
            </p>
            <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>
              {consent ? `Analytics: ${consent.analytics ? "On" : "Off"} · Marketing: ${consent.marketing ? "On" : "Off"} · Third-Party: ${consent.thirdParty ? "On" : "Off"}` : "Click below to configure your preferences"}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={reopenBanner}>Open Cookie Banner</Button>
        </div>

        {/* Cookie Categories */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 16, color: K.t1, marginBottom: 16 }}>Cookie Categories</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {COOKIE_CATEGORIES.map((cat) => (
              <div key={cat.id} style={{ padding: 20, background: K.g900, border: `1px solid ${activeCategory === cat.id ? cat.color + "60" : K.g800}`, borderRadius: 2, cursor: "pointer", transition: "border-color 0.2s" }}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: activeCategory === cat.id ? 12 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: cat.color }} />
                    <div>
                      <p style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 2 }}>{cat.title}</p>
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: K.t3 }}>{cat.desc}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {cat.required ? (
                      <Badge color={K.mint}>Required</Badge>
                    ) : (
                      <button
                        onClick={() => handleToggle(cat.id)}
                        style={{
                          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                          background: consent?.[cat.id] ? K.blue : K.g700, position: "relative",
                          transition: "background 0.2s", padding: 0,
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", background: "white",
                          position: "absolute", top: 2,
                          left: consent?.[cat.id] ? 22 : 2, transition: "left 0.2s",
                        }} />
                      </button>
                    )}
                  </div>
                </div>
                {activeCategory === cat.id && (
                  <div style={{ marginTop: 12, padding: 12, background: K.g850, borderRadius: 2 }}>
                    <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4, marginBottom: 6, letterSpacing: "0.08em" }}>COOKIES IN THIS CATEGORY</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {cat.examples.map((ex) => (
                        <Badge key={ex} color={cat.color} style={{ fontSize: 10 }}>{ex}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Data Retention */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 16, color: K.t1, marginBottom: 16 }}>Data Retention Policy</h2>
          <div style={{ border: `1px solid ${K.g800}`, borderRadius: 2, overflow: "hidden" }}>
            {DATA_RETENTION.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "200px 1fr", padding: "12px 16px", borderBottom: i < DATA_RETENTION.length - 1 ? `1px solid ${K.g900}` : "none", background: K.g900 }}>
                <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 600, color: K.t1 }}>{item.category}</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: K.t3 }}>{item.retention}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Rights */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 16, color: K.t1, marginBottom: 16 }}>Your Data Rights (GDPR/CCPA)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {YOUR_RIGHTS.map((item) => (
              <div key={item.right} style={{ padding: 16, background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 2 }}>
                <span style={{ fontSize: 20, display: "block", marginBottom: 8 }}>{item.icon}</span>
                <p style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 12, color: K.t1, marginBottom: 4 }}>{item.right}</p>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: K.t3, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: 20, background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 2 }}>
          <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 14, color: K.t1, marginBottom: 12 }}>Data Requests</h2>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: K.t3, marginBottom: 16 }}>
            Exercise your data rights. Requests are processed within 72 hours as required by GDPR Article 12.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={exportRequested}
              onClick={() => {
                setExportRequested(true);
                fetch("/api/gdpr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export" }) }).catch(() => {});
              }}
            >
              {exportRequested ? "✓ Export Requested" : "📦 Export My Data"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={deleteRequested}
              onClick={() => {
                setDeleteRequested(true);
                fetch("/api/gdpr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete" }) }).catch(() => {});
              }}
            >
              {deleteRequested ? "✓ Deletion Requested" : "🗑️ Delete My Data"}
            </Button>
          </div>
          <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4, marginTop: 12 }}>
            For questions, contact <span style={{ color: K.blue4 }}>privacy@kiki.ai</span>
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}

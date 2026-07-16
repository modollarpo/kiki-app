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
      <div className="p-[clamp(40px,6vw,80px)_clamp(16px,4vw,48px)] max-w-[900px] mx-auto" style={{ background: K.void }}>
        {/* Header */}
        <div className="mb-10">
          <Badge color={K.blue} className="mb-[14px]">PRIVACY & COMPLIANCE</Badge>
          <h1 className="font-mono font-bold text-[clamp(22px,4vw,34px)] text-t1 tracking-[-0.025em] mb-2">
            Cookie & Privacy Settings
          </h1>
          <p className="font-sans text-[15px] text-t3 leading-[1.7] max-w-[600px]">
            Manage how KIKI Agent uses cookies and processes your data. You can update your preferences at any time.
          </p>
        </div>

        {/* Current Status */}
        <div className="p-4 bg-g900 border border-g800 rounded-sm mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-mono font-bold text-[12px] text-t1 mb-1">
              {consent ? "Your preferences are saved" : "No preferences saved yet"}
            </p>
            <p className="font-mono text-[10px] text-t3">
              {consent ? `Analytics: ${consent.analytics ? "On" : "Off"} · Marketing: ${consent.marketing ? "On" : "Off"} · Third-Party: ${consent.thirdParty ? "On" : "Off"}` : "Click below to configure your preferences"}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={reopenBanner}>Open Cookie Banner</Button>
        </div>

        {/* Cookie Categories */}
        <div className="mb-10">
          <h2 className="font-mono font-bold text-[16px] text-t1 mb-4">Cookie Categories</h2>
          <div className="flex flex-col gap-3">
            {COOKIE_CATEGORIES.map((cat) => (
              <div key={cat.id} className="p-5 bg-g900 rounded-sm cursor-pointer transition-colors duration-200" style={{ border: `1px solid ${activeCategory === cat.id ? cat.color + "60" : K.g800}` }}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}>
                <div className="flex items-center justify-between" style={{ marginBottom: activeCategory === cat.id ? 12 : 0 }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: cat.color }} />
                    <div>
                      <p className="font-mono font-bold text-[13px] text-t1 mb-0.5">{cat.title}</p>
                      <p className="font-sans text-[12px] text-t3">{cat.desc}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {cat.required ? (
                      <Badge color={K.mint}>Required</Badge>
                    ) : (
                      <button
                        onClick={() => handleToggle(cat.id)}
                        className="w-[44px] h-6 rounded-xl border-none cursor-pointer relative transition-colors duration-200 p-0"
                        style={{
                          background: consent?.[cat.id] ? K.blue : K.g700,
                        }}
                      >
                        <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-[left] duration-200" style={{
                          left: consent?.[cat.id] ? 22 : 2,
                        }} />
                      </button>
                    )}
                  </div>
                </div>
                {activeCategory === cat.id && (
                  <div className="mt-3 p-3 bg-g850 rounded-sm">
                    <p className="font-mono text-[10px] text-t4 mb-1.5 tracking-[0.08em]">COOKIES IN THIS CATEGORY</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.examples.map((ex) => (
                        <Badge key={ex} color={cat.color} className="text-[10px]">{ex}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Data Retention */}
        <div className="mb-10">
          <h2 className="font-mono font-bold text-[16px] text-t1 mb-4">Data Retention Policy</h2>
          <div className="border border-g800 rounded-sm overflow-hidden">
            {DATA_RETENTION.map((item, i) => (
              <div key={i} className="grid grid-cols-[200px_1fr] py-3 px-4 bg-g900" style={{ borderBottom: i < DATA_RETENTION.length - 1 ? `1px solid ${K.g900}` : "none" }}>
                <span className="font-mono font-semibold text-[12px] text-t1">{item.category}</span>
                <span className="font-sans text-[12px] text-t3">{item.retention}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Rights */}
        <div className="mb-10">
          <h2 className="font-mono font-bold text-[16px] text-t1 mb-4">Your Data Rights (GDPR/CCPA)</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
            {YOUR_RIGHTS.map((item) => (
              <div key={item.right} className="p-4 bg-g900 border border-g800 rounded-sm">
                <span className="text-[20px] block mb-2">{item.icon}</span>
                <p className="font-mono font-bold text-[12px] text-t1 mb-1">{item.right}</p>
                <p className="font-sans text-[12px] text-t3 leading-[1.6]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 bg-g900 border border-g800 rounded-sm">
          <h2 className="font-mono font-bold text-[14px] text-t1 mb-3">Data Requests</h2>
          <p className="font-sans text-[13px] text-t3 mb-4">
            Exercise your data rights. Requests are processed within 72 hours as required by GDPR Article 12.
          </p>
          <div className="flex gap-2.5 flex-wrap">
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
          <p className="font-mono text-[10px] text-t4 mt-3">
            For questions, contact <span style={{ color: K.blue4 }}>privacy@kiki.ai</span>
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}

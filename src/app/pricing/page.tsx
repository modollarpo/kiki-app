"use client";
import { useState } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge, Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { PLANS, type PlanDisplay } from "@/lib/plans";

const FAQ = [
  { q:"Is there a free trial?", a:"Yes — all plans start with a 14-day free trial, no credit card required. You get full access to all Growth plan features." },
  { q:"What counts as a signal event?", a:"Any conversion event processed through the KIKI CAPI pipeline: purchases, leads, form fills, trial signups, and custom events." },
  { q:"Can I change plans later?", a:"Yes, upgrade or downgrade anytime. Upgrades are prorated immediately; downgrades take effect at the next billing cycle." },
  { q:"Is my data secure?", a:"KIKI is SOC2 Type II certified and GDPR/CCPA compliant. Data encrypted at rest and in transit. We never share your data with third parties." },
  { q:"How does OaaS pricing work?", a:"OaaS is performance-based: a 1.2–1.5% management fee on the ad spend we optimize, plus a 5% bonus on incremental ROAS uplift above your baseline. No uplift, no bonus." },
];

function priceLabel(plan: PlanDisplay): string {
  if (plan.contactOnly) return "Custom";
  if (plan.performanceBased) return "Performance-based";
  return `$${plan.priceMonthly.toLocaleString()}`;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const router = useRouter();

  return (
    <MarketingLayout>
      <div style={{ background: K.void, padding: "80px 48px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.18em", color: K.t4, marginBottom: 14 }}>PRICING</p>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: "clamp(28px,5vw,52px)", letterSpacing: "-0.03em", color: K.t1, marginBottom: 14 }}>Simple, transparent pricing.</h1>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 16, color: K.t3, maxWidth: 480, margin: "0 auto 28px" }}>Start free, scale as you grow. Every plan includes the full signal enrichment engine.</p>
          <div style={{ display: "inline-flex", gap: 4, background: K.g850, borderRadius: 2, padding: 4 }}>
            {(["monthly", "annual"] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{ padding: "8px 20px", fontFamily: K.mono, fontSize: 11, fontWeight: 600, borderRadius: 2, border: "none", background: billing === b ? K.g700 : "transparent", color: billing === b ? K.t1 : K.t3, cursor: "pointer" }}>
                {b.charAt(0).toUpperCase() + b.slice(1)}{b === "annual" && <span style={{ color: K.mint, marginLeft: 6, fontSize: 9 }}>SAVE 20%</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 64 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ padding: 32, background: plan.hot ? K.blueD : K.g900, border: `${plan.hot ? "2px" : "1px"} solid ${plan.hot ? K.blue : K.g800}`, borderRadius: 2, position: "relative" }}>
              {plan.hot && <Badge color={K.blue} style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)" }}>MOST POPULAR</Badge>}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${plan.color}60,transparent)` }} />
              <p style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 20, color: K.t1, marginBottom: 6 }}>{plan.name}</p>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: K.t3, marginBottom: 22 }}>{plan.desc}</p>
              {plan.contactOnly || plan.performanceBased ? (
                <p style={{ fontFamily: K.mono, fontSize: 32, fontWeight: 700, color: plan.color, marginBottom: 22 }}>{priceLabel(plan)}</p>
              ) : (
                <div style={{ marginBottom: 22 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 42, fontWeight: 700, color: plan.hot ? K.blue4 : K.t1 }}>${billing === "monthly" ? plan.priceMonthly.toLocaleString() : plan.priceAnnualPerMonth.toLocaleString()}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 14, color: K.t3 }}>/mo</span>
                  {billing === "annual" && <p style={{ fontFamily: K.mono, fontSize: 10, color: K.mint, marginTop: 3 }}>Billed ${(plan.priceAnnualPerMonth * 12).toLocaleString()}/year · Save ${((plan.priceMonthly - plan.priceAnnualPerMonth) * 12).toLocaleString()}</p>}
                </div>
              )}
              <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${K.g700},transparent)`, margin: "0 0 16px" }} />
              {plan.features.map(f => (
                <div key={f} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ color: K.mint, fontFamily: K.mono, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: K.t2, lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
              <div style={{ marginTop: 20 }}>
                {plan.contactOnly ? (
                  <Button variant="gold" full onClick={() => router.push(plan.ctaHref)}>{plan.ctaLabel}</Button>
                ) : plan.hot ? (
                  <Button full onClick={() => router.push(plan.ctaHref)}>{plan.ctaLabel}</Button>
                ) : (
                  <Button variant="secondary" full onClick={() => router.push(plan.ctaHref)}>{plan.ctaLabel}</Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", color: K.t1, marginBottom: 24 }}>Frequently asked</h2>
          {FAQ.map((faq, i) => (
            <div key={i} style={{ marginBottom: 12, padding: "16px 20px", background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 2 }}>
              <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1, marginBottom: 8 }}>{faq.q}</p>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: K.t3, lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}

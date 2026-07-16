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
      <div style={{ background: K.void }} className="p-20 px-12 max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3.5">PRICING</p>
          <h1 className="font-mono font-bold text-[clamp(28px,5vw,52px)] tracking-[-0.03em] text-t1 mb-3.5">Simple, transparent pricing.</h1>
          <p className="font-sans text-[16px] text-t3 max-w-[480px] mx-auto mb-7">Start free, scale as you grow. Every plan includes the full signal enrichment engine.</p>
          <div className="inline-flex gap-1 bg-g850 rounded-sm p-1">
            {(["monthly", "annual"] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} className="px-5 py-2 font-mono text-[11px] font-semibold rounded-sm border-none cursor-pointer" style={{ background: billing === b ? K.g700 : "transparent", color: billing === b ? K.t1 : K.t3 }}>
                {b.charAt(0).toUpperCase() + b.slice(1)}{b === "annual" && <span className="text-kmint ml-1.5 text-[9px]">SAVE 20%</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-16">
          {PLANS.map(plan => (
            <div key={plan.id} className="p-8 rounded-sm relative" style={{ background: plan.hot ? K.blueD : K.g900, border: `${plan.hot ? "2px" : "1px"} solid ${plan.hot ? K.blue : K.g800}` }}>
              {plan.hot && <Badge color={K.blue} className="absolute -top-3 left-1/2 -translate-x-1/2">MOST POPULAR</Badge>}
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg,transparent,${plan.color}60,transparent)` }} />
              <p className="font-mono font-bold text-[20px] text-t1 mb-1.5">{plan.name}</p>
              <p className="font-sans text-[13px] text-t3 mb-[22px]">{plan.desc}</p>
              {plan.contactOnly || plan.performanceBased ? (
                <p className="font-mono font-bold text-[32px] mb-[22px]" style={{ color: plan.color }}>{priceLabel(plan)}</p>
              ) : (
                <div className="mb-[22px]">
                  <span className="font-mono font-bold text-[42px]" style={{ color: plan.hot ? K.blue4 : K.t1 }}>${billing === "monthly" ? plan.priceMonthly.toLocaleString() : plan.priceAnnualPerMonth.toLocaleString()}</span>
                  <span className="font-mono text-[14px] text-t3">/mo</span>
                  {billing === "annual" && <p className="font-mono text-[10px] text-kmint mt-[3px]">Billed ${(plan.priceAnnualPerMonth * 12).toLocaleString()}/year · Save ${((plan.priceMonthly - plan.priceAnnualPerMonth) * 12).toLocaleString()}</p>}
                </div>
              )}
              <div className="h-px mb-4" style={{ background: `linear-gradient(90deg,transparent,${K.g700},transparent)` }} />
              {plan.features.map(f => (
                <div key={f} className="flex gap-2 mb-2 items-start">
                  <span className="text-kmint font-mono text-[12px] shrink-0 mt-px">✓</span>
                  <span className="font-sans text-[13px] text-t2 leading-[1.4]">{f}</span>
                </div>
              ))}
              <div className="mt-5">
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
        <div className="max-w-[640px] mx-auto">
          <h2 className="font-mono font-bold text-[24px] tracking-tight text-t1 mb-6">Frequently asked</h2>
          {FAQ.map((faq, i) => (
            <div key={i} className="mb-3 p-4 bg-g900 border border-g800 rounded-sm">
              <p className="font-mono font-bold text-[12px] text-t1 mb-2">{faq.q}</p>
              <p className="font-sans text-[13px] text-t3 leading-[1.6]">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}

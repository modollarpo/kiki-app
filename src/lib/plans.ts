// ============================================================
// KIKI Agent Platform — Plan Catalog (single source of truth)
// PLAN_PRICING is the canonical pricing used by both the
// marketing page and the billing engine (calculateOaasFees,
// getPlanPrice, etc.) so they never drift. This module must
// NOT import server-only modules (e.g. billing.ts -> tenant.ts)
// because it is consumed by client components.
// ============================================================

import { K } from "./kdls";

export interface PlanPricing {
  monthlyPrice: number;
  annualPrice: number;
  includedSignals: number;
  signalOverageRate: number;
  includedTokens: number;
  tokenOverageRate: number;
  managementFeePercent: number;
  performanceBonusPercent: number;
}

export const PLAN_PRICING: Record<string, PlanPricing> = {
  starter: {
    monthlyPrice: 690,
    annualPrice: 6624, // 20% discount ($552/mo)
    includedSignals: 50000,
    signalOverageRate: 0.0008, // $0.80 per 1K
    includedTokens: 500000,
    tokenOverageRate: 0.00005, // $0.05 per 1K tokens
    managementFeePercent: 0,
    performanceBonusPercent: 0,
  },
  growth: {
    monthlyPrice: 2000,
    annualPrice: 19200, // 20% discount ($1,600/mo)
    includedSignals: 500000,
    signalOverageRate: 0.0006,
    includedTokens: 5000000,
    tokenOverageRate: 0.00003,
    managementFeePercent: 0,
    performanceBonusPercent: 0,
  },
  enterprise: {
    monthlyPrice: 0, // Custom
    annualPrice: 0,
    includedSignals: 10000000,
    signalOverageRate: 0.0003,
    includedTokens: 100000000,
    tokenOverageRate: 0.00002,
    managementFeePercent: 0,
    performanceBonusPercent: 0,
  },
  oaas: {
    monthlyPrice: 0,
    annualPrice: 0,
    includedSignals: 1000000000,
    signalOverageRate: 0.0001,
    includedTokens: 1000000000,
    tokenOverageRate: 0.00001,
    managementFeePercent: 1.35, // 1.2–1.5% of managed ad spend
    performanceBonusPercent: 5, // 5% of ROAS uplift
  },
};

export type PlanId = "starter" | "growth" | "enterprise" | "oaas";

export interface PlanDisplay {
  id: PlanId;
  name: string;
  priceMonthly: number; // 0 => not fixed-price
  priceAnnualPerMonth: number; // 0 => not fixed-price
  desc: string;
  color: string;
  hot?: boolean;
  contactOnly?: boolean; // Enterprise — custom quote
  performanceBased?: boolean; // OaaS — fee on results
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;

export const PLANS: PlanDisplay[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: PLAN_PRICING.starter.monthlyPrice,
    priceAnnualPerMonth: Math.round(PLAN_PRICING.starter.annualPrice / 12),
    desc: "For lean media teams getting started",
    color: K.t3,
    features: [
      "3 campaigns",
      "50K signal events/mo",
      "Basic LTV prediction model",
      "Fraud & IVT protection",
      "1 virtual card",
      "Email support",
    ],
    ctaLabel: "Get Started →",
    ctaHref: "/auth/login",
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: PLAN_PRICING.growth.monthlyPrice,
    priceAnnualPerMonth: Math.round(PLAN_PRICING.growth.annualPrice / 12),
    desc: "For scaling teams running multi-channel",
    color: K.blue,
    hot: true,
    features: [
      "Unlimited campaigns",
      "500K signal events/mo",
      "Custom LTV model",
      "All 6 AI agents",
      "OaaS optimization",
      "Anomaly detection",
      "10 virtual cards",
      "Priority support",
      "SyncBrain access",
    ],
    ctaLabel: "Start Free Trial →",
    ctaHref: "/auth/login",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 0,
    priceAnnualPerMonth: 0,
    desc: "Custom infrastructure, SLAs, white-labeling",
    color: K.gold,
    contactOnly: true,
    features: [
      "Unlimited everything",
      "Custom LTV + multi-model routing",
      "White-label portal",
      "Dedicated infrastructure",
      "Custom SLA 99.99%",
      "Unlimited virtual cards",
      "Dedicated CSM",
      "SOC2 Type II reports",
      "Custom data residency",
    ],
    ctaLabel: "Talk to Sales →",
    ctaHref: "/contact",
  },
  {
    id: "oaas",
    name: "OaaS",
    priceMonthly: 0,
    priceAnnualPerMonth: 0,
    desc:
      "Autonomous optimization — paid on performance: 1.35% of managed ad spend + 5% of ROAS uplift",
    color: K.oaas,
    performanceBased: true,
    features: [
      "All 6 AI agents run your campaigns 24/7",
      "Dedicated CSM + contractual ROAS uplift targets",
      "Management fee 1.35% of ad spend",
      "Performance bonus 5% of revenue uplift",
      "Monthly P&L + quarterly business review",
      "White-glove onboarding",
    ],
    ctaLabel: "Build OaaS Plan →",
    ctaHref: "/oaas-agreement",
  },
];

export function getPlanDisplay(id: PlanId): PlanDisplay | undefined {
  return PLANS.find((p) => p.id === id);
}

export const formatPlanPrice = (p: PlanDisplay): string => {
  if (p.performanceBased) return "Performance-based";
  if (p.contactOnly) return "Custom";
  return `${fmt(p.priceMonthly)}/mo`;
};

"use client";
import { useState, useRef, useEffect } from "react";
import { K } from "@/lib/kdls";

interface TooltipTerm {
  short: string;
  full: string;
  guide?: string;
}

const TERMS: Record<string, TooltipTerm> = {
  ltv: { short: "Customer lifetime value — predicted 90-day spend", full: "Lifetime Value (LTV) is KIKI's core prediction: what a customer will spend over 90 days. Most platforms see a $149 order. KIKI sends $640 — the predicted true value. This trains ad platform algorithms to find high-value buyers, not cheap clickers.", guide: "ltv-enrichment" },
  cac: { short: "Customer acquisition cost — total spend ÷ conversions", full: "Customer Acquisition Cost (CAC) is the total ad spend divided by the number of customers acquired. KIKI tracks CAC per campaign, per platform, and per audience segment. The bidding agent uses CAC to make autonomous bid decisions every 15 minutes." },
  ltv_cac_ratio: { short: "The ratio of predicted LTV to actual CAC — the core metric", full: "LTV/CAC Ratio is the single most important number in KIKI. If your predicted LTV is $640 and your CAC is $80, your ratio is 8.0× — meaning every $1 spent on ads returns $8 in predicted customer value. KIKI's bidding agent optimises for this ratio, not raw ROAS.", guide: "first-bid-cycle" },
  roas: { short: "Return on ad spend — revenue ÷ ad spend", full: "Return on Ad Spend (ROAS) measures how much revenue you get for every dollar spent on ads. A 4× ROAS means $4 revenue for every $1 spent. But ROAS is backwards-looking — it tells you what happened. KIKI's LTV enrichment makes it forward-looking by sending predicted future value instead of just the order value." },
  stop_loss: { short: "Automatic pause when CAC exceeds 2.5× target", full: "Stop-Loss is an autonomous safety mechanism. If a campaign's actual CAC exceeds 2.5× the target CAC, KIKI automatically pauses it. This prevents runaway spend on underperforming campaigns. You can configure the threshold per campaign. The bidding agent applies this every 15 minutes.", guide: "first-bid-cycle" },
  signal: { short: "A conversion event enriched with LTV prediction", full: "A Signal is any conversion event (purchase, signup, lead) that KIKI intercepts, enriches with an LTV prediction, and routes to ad platforms. Every signal carries the predicted 90-day value, the LTV segment, and a bid multiplier. This is what trains platform algorithms to find better customers over time." },
  metacognition: { short: "Self-aware AI that evaluates its own decision quality", full: "Metacognition is KIKI's self-reflection engine. Every 5 minutes, it reviews all recent bid decisions, checks whether they were correct, and adjusts its strategy. Signals scoring below 0.35 quality are killed automatically. This creates a compounding improvement loop — the system gets smarter the longer it runs.", guide: "first-bid-cycle" },
  capi: { short: "Conversions API — server-side signal delivery to platforms", full: "Conversions API (CAPI) is the server-side pipeline that sends enriched conversion events directly to ad platforms (Meta CAPI, TikTok Events API, Google Enhanced Conversions). Unlike browser pixels, CAPI events can't be blocked by ad blockers or iOS privacy changes. KIKI's CAPI sends the LTV-enriched value, not just the raw order value.", guide: "ltv-enrichment" },
  bid_cycle: { short: "Autonomous bid adjustment — runs every 15 minutes", full: "A Bid Cycle is when KIKI's bidding agent pulls the latest 7-day metrics for every active campaign, evaluates performance against target CAC, and applies bid adjustments. Five possible actions: aggressive increase (+25%), moderate increase (+12%), moderate decrease (-8%), aggressive decrease (-50%), or pause (stop-loss). Each decision is logged and explainable.", guide: "first-bid-cycle" },
  day_parting: { short: "Hour-of-day bid multipliers based on conversion patterns", full: "Day-parting adjusts bids based on when conversions actually happen. KIKI learns which hours of the day and days of the week produce the best LTV/CAC ratios for each campaign, then applies multiplier weights. For example, if Saturday 10am-2pm converts at 1.4× the average, bids during that window get a 40% boost." },
  kill_threshold: { short: "Quality score below 0.35 triggers automatic creative pause", full: "Kill Threshold is the metacognition engine's minimum quality bar. Every active ad creative is scored on an 8-dimension rubric (LTV/CAC, CTR, frequency, fatigue, audience overlap, etc.). Any creative scoring below 0.35 is automatically paused. This prevents wasted spend on creatives that attract cheap, low-LTV customers." },
  zero_shot: { short: "Launch a campaign by describing it in plain language", full: "Zero-Shot Campaign Creation lets you describe a campaign in natural language ('Run a Meta campaign targeting women 25-45 in the US for our $89 skincare bundle, target CAC $45') and KIKI builds the full campaign structure — targeting, bidding, creative suggestions, budget allocation — without any manual setup. The AI reasons through the optimal configuration." },
  syncbrain: { short: "AI model router — picks the right model for each task", full: "SyncBrain is KIKI's intelligent model router. It routes each task to the optimal model among the four KIKI supports — GPT-4o, GPT-4o-mini, Groq Llama 3.1, and gpt-oss-20b — based on complexity, latency requirements, and cost. Simple classification goes to Groq (sub-200ms). Moderate tasks go to GPT-4o-mini. Complex strategic reasoning goes to GPT-4o." },
  oaas: { short: "Optimization-as-a-Service — autonomous campaign management", full: "OaaS (Optimization-as-a-Service) is KIKI's fully-managed tier where the platform runs everything autonomously. You set goals (target CAC, target LTV, monthly budget), and KIKI handles campaign creation, bidding, creative testing, budget allocation, and stop-loss protection. The OaaS workflow builder lets you create custom automation rules." },
  token_budget: { short: "AI token usage limit per billing cycle", full: "Token Budget tracks your AI model usage across all KIKI features. Every bid reasoning explanation, every zero-shot campaign, every metacognition cycle consumes AI tokens. KIKI shows your token usage, cost per feature, and remaining budget. Different models have different costs — Groq Llama is essentially free, GPT-4o is more expensive." },
  virtual_card: { short: "Per-campaign Stripe card with MCC restrictions", full: "Virtual Cards are issued via Stripe Issuing — one per campaign. Each card has MCC (Merchant Category Code) restrictions so it can only be used for ad platform charges. Cards have daily spend limits and auto-freeze if the campaign's CAC exceeds the stop-loss threshold. This prevents runaway spend at the payment layer." },
  wallet: { short: "Multi-currency fund pool for all ad spend", full: "The Wallet is your multi-currency fund pool. Add funds via Stripe, and KIKI issues virtual cards per campaign. The wallet supports automatic currency conversion with a 50bps FX spread (one of KIKI's revenue streams). The balance shows your runway — how many days of current spend you can sustain." },
  fx_spread: { short: "50bps currency conversion margin — KIKI revenue stream", full: "FX Spread is the 0.50% margin KIKI applies on currency conversions within the wallet. When you fund in USD but run campaigns in EUR or GBP, KIKI converts at a slight markup. This is transparent — you see the rate before confirming — and is one of four revenue streams alongside SaaS subscriptions, usage-based metering, and OaaS revenue share." },
  enrichment: { short: "The 10-step pipeline that transforms raw events into LTV signals", full: "Enrichment is KIKI's core value-add. When a conversion event arrives, it goes through a 10-step pipeline: deduplication, fraud check, customer history lookup, ML prediction (or heuristic fallback), segment classification, bid multiplier calculation, consent validation, creative scoring, audience matching, and finally platform delivery. Each step adds intelligence to the signal." },
  holdout: { short: "Ghost bidding group — users who never see your ads", full: "Holdout (Ghost Bidding) is KIKI's incrementality measurement technique. A percentage of your audience (typically 10%) is randomly assigned to a control group that never sees your ads. By comparing purchase rates between the exposed group and the holdout, you measure true incrementality — the actual lift your ads create, not just the attributed conversions.", guide: "ltv-enrichment" },
  incrementality: { short: "True ad lift — what happened because of your ads, not just near them", full: "Incrementality measures the actual causal impact of your advertising. Meta might claim credit for a conversion that would have happened anyway. KIKI's incrementality arbiter uses ghost bidding holdouts to measure what truly changed. The gap between 'Meta-claimed ROAS' and 'true incremental ROAS' is often 30-80% — that gap is waste KIKI identifies." },
  creative_fatigue: { short: "CTR decline >30% over 7 days triggers creative refresh", full: "Creative Fatigue is detected when a creative's click-through rate drops more than 30% over a 7-day window. This means the audience has seen it too many times and engagement is declining. KIKI's waste detection engine flags these automatically and recommends creative rotation. Continuing to run fatigued creatives wastes budget on diminishing returns." },
  audience_overlap: { short: "Same user targeted by multiple campaigns or platforms", full: "Audience Overlap occurs when the same user is targeted by multiple campaigns or across multiple platforms. This inflates frequency (the same person sees your ad repeatedly), increases CAC (you're competing against yourself), and reduces incrementality. KIKI detects overlap and recommends exclusions or consolidation." },
  waste_detection: { short: "7 parallel engines finding wasted ad spend", full: "Waste Detection runs seven engines in parallel: frequency overexposure, creative fatigue, cross-platform audience overlap, budget underperformance, daypart waste, placement waste, and keyword cannibalisation. When waste is detected, KIKI calculates the dollar amount and recommends or auto-executes corrective actions." },
  arbitrage: { short: "Cross-platform budget shift toward best LTV-per-dollar", full: "Platform Arbitrage compares LTV-per-dollar efficiency across all connected platforms every 6 hours. If TikTok delivers $4.20 LTV per ad dollar for your Loyalists segment and Meta delivers $2.80, KIKI shifts up to 30% of Meta's budget to TikTok. Guardrails: never drops below $100/day platform floor, never gives one platform >70% of total budget." },
  lead_scoring: { short: "AI-scored conversion probability for B2B pipelines", full: "Lead Scoring uses AI to rank B2B leads by conversion probability. KIKI analyses firmographic data, engagement patterns, and historical conversion rates to assign each lead a score from 0-100. High-scoring leads trigger automated nurture sequences. Low-scoring leads get deprioritized. This integrates with your CRM (HubSpot, Salesforce, Pipedrive)." },
  lifecycle: { short: "Customer journey stages — awareness through retention", full: "Lifecycle tracking maps each customer through stages: Awareness → Consideration → First Purchase → Repeat Purchase → Loyal → At-Risk → Churned. KIKI uses this to adjust bidding strategy — new customers get different treatment than repeat buyers. The audience portability engine pushes lifecycle segments to all platforms simultaneously." },
  pipeline: { short: "The end-to-end flow from signal ingestion to platform delivery", full: "Pipeline is the complete data flow: conversion event arrives → KIKI enriches it with LTV prediction → routes to the appropriate platform CAPI endpoints → logs to the immutable signal ledger → updates customer profiles → feeds the bidding agent's next cycle. Every step is logged, auditable, and reversible." },
  mfa: { short: "Multi-factor authentication — required for production accounts", full: "Multi-Factor Authentication (MFA) is required for all production KIKI accounts. After signup, enable MFA via authenticator app (Google Authenticator, Authy, etc.). This protects your ad account credentials, wallet funds, and campaign configurations. KIKI stores no MFA secrets — verification happens via TOTP protocol." },
  tenant: { short: "Your KIKI account — everything is scoped to a tenant", full: "A Tenant is your isolated workspace within KIKI. All data, campaigns, integrations, wallet funds, and AI models are scoped to your tenant. Multiple team members can access the same tenant with role-based permissions (Admin, Editor, Viewer). Each tenant gets its own LTV model trained on its specific customer data." },
};

export function KikiTooltip({ term, children }: { term: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const data = TERMS[term];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!data) return <>{children || term}</>;

  return (
    <span
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!expanded) setOpen(false); }}
      onClick={() => setExpanded(!expanded)}
      style={{
        borderBottom: `1px dotted ${K.t4}`,
        cursor: "help",
        position: "relative",
        display: "inline",
      }}
    >
      {children || term}
      {open && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: expanded ? 360 : 280,
            background: K.g850,
            border: `1px solid ${K.g700}`,
            borderRadius: 4,
            padding: expanded ? "12px 14px" : "8px 12px",
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            pointerEvents: expanded ? "auto" : "none",
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => { setOpen(false); setExpanded(false); }}
        >
          <div style={{ fontFamily: K.mono, fontSize: 11, color: K.t1, lineHeight: 1.5, marginBottom: expanded ? 8 : 0 }}>
            {data.short}
          </div>
          {expanded && (
            <>
              <div style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, lineHeight: 1.6, marginBottom: 8 }}>
                {data.full}
              </div>
              {data.guide && (
                <a
                  href={`/dashboard/guides/${data.guide}`}
                  style={{ fontFamily: K.mono, fontSize: 10, color: K.blue, textDecoration: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Read the full guide →
                </a>
              )}
            </>
          )}
          {!expanded && (
            <div style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginTop: 4, textAlign: "right" }}>
              click for more
            </div>
          )}
        </span>
      )}
    </span>
  );
}

export function TooltipLabel({ term }: { term: string }) {
  const data = TERMS[term];
  if (!data) return null;
  return (
    <KikiTooltip term={term}>
      <span style={{ color: K.t2 }}>{term.replace(/_/g, " ")}</span>
    </KikiTooltip>
  );
}

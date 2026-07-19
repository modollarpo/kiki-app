"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge, Button } from "@/components/ui";

const FEATURES = [
  { id:"enrichment", label:"LTV Enrichment",icon:"◎",color:K.mint,  tagline:"Turn $149 orders into $640 signals", desc:"Every conversion intercepted. ML predicts 90-day LTV. Platforms learn to find your real buyers — not just high first-order spenders.", stat:"4.29× avg uplift", detail:"Gradient boosting trained on your historical order and LTV data. R² typically 0.87–0.94. Prediction in under 50ms. Sent to all platforms automatically." },
  { id:"agents",     label:"AI Agents",    icon:"⚡",color:K.blue,  tagline:"Autonomous bidding. Zero manual work.", desc:"Six specialized agents run 24/7: Bidding, Creative, Smart Pacing, Signals, OaaS Optimizer, and SyncBrain Router. All within your guardrails.", stat:"0 hrs/wk bid management", detail:"Agents communicate through Kafka event streams. Every decision logged, explainable, reversible. Full override control retained." },
  { id:"syncbrain",  label:"SyncBrain™",  icon:"⬡",color:K.green, tagline:"Seven models. One routing brain.",      desc:"SyncBrain selects the optimal AI model for every task based on type, budget, confidence, and latency. Cost-aware, quality-first.", stat:"12ms routing decision", detail:"When monthly AI spend exceeds 80%, SyncBrain auto-routes to cheapest models. Confidence scores and model comparison in the canvas." },
  { id:"fraud",      label:"Fraud & IVT", icon:"⬗",color:K.danger,tagline:"Bot traffic poisons your model. We stop it.", desc:"Real-time IVT detection: IP reputation, browser fingerprinting, behavioral velocity, and KIKI's proprietary bot graph.", stat:"99.2% IVT detection", detail:"0.03% false positive rate. Quarantine mode for edge cases. All blocked events logged with reason code and fraud score." },
  { id:"analytics",  label:"Analytics",   icon:"◈",color:K.oaas,  tagline:"Cross-platform attribution. One view.",  desc:"Unified attribution across 14 platforms. Data-driven, last-click, linear, time-decay, position-based — all powered by your LTV signals.", stat:"5 attribution models", detail:"MMM included for offline spend. Scenario planner models budget reallocation impact before committing." },
  { id:"wallet",     label:"Virtual Cards",icon:"💳",color:K.gold, tagline:"Campaign-level spend control.",          desc:"Issue virtual cards per campaign or vendor. Set limits, merchant restrictions, velocity limits, auto stop-loss. All tracked to the campaign.", stat:"Unlimited cards", detail:"Powered by Stripe Issuing. PCI DSS compliant. USD, EUR, GBP. Real-time authorization logging." },
];

export default function FeaturesPage() {
  const router = useRouter();
  const [active, setActive] = useState("enrichment");
  const feat = FEATURES.find(f => f.id === active) || FEATURES[0]!;
  return (
    <MarketingLayout>
      <div className="py-[clamp(40px,6vw,80px)_clamp(16px,4vw,48px)] max-w-[1100px] mx-auto" style={{ background:K.void }}>
        <div className="text-center mb-14">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3.5">PLATFORM FEATURES</p>
          <h1 className="font-mono font-bold text-[clamp(28px,5vw,52px)] tracking-[-0.03em] text-t1 mb-3.5">Everything your media team needs.</h1>
          <p className="font-sans text-[16px] text-t3 max-w-[520px] mx-auto">One platform for signal enrichment, autonomous optimization, fraud protection, and financial control.</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="w-full lg:w-[260px] lg:shrink-0">
            {FEATURES.map(f => (
              <div key={f.id} onClick={() => setActive(f.id)}
                className="px-4 py-3.5 mb-1.5 rounded-sm cursor-pointer transition-all duration-150"
                style={{ background:active===f.id?`${f.color}10`:K.g900, border:`1px solid ${active===f.id?f.color+"40":K.g800}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]" style={{ color:f.color }}>{f.icon}</span>
                    <span className="font-mono text-[12px] font-bold" style={{ color:active===f.id?K.t1:K.t2 }}>{f.label}</span>
                  </div>
                  {active===f.id && <span className="font-mono text-[12px]" style={{ color:f.color }}>›</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 p-8 bg-g900 rounded-sm relative overflow-hidden" style={{ border:`1px solid ${feat.color}30` }}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,transparent,${feat.color},transparent)` }} />
            <Badge color={feat.color}>{feat.label.toUpperCase()}</Badge>
            <h2 className="font-mono font-bold text-[clamp(18px,3vw,28px)] tracking-tight text-t1 my-4">{feat.tagline}</h2>
            <p className="font-sans text-[15px] text-t3 leading-[1.7] max-w-[520px] mb-5">{feat.desc}</p>
            <div className="px-[18px] py-3.5 rounded-sm inline-block mb-5" style={{ background:`${feat.color}08`, border:`1px solid ${feat.color}25` }}>
              <span className="font-mono text-[20px] font-bold" style={{ color:feat.color }}>{feat.stat}</span>
            </div>
            <p className="font-mono text-[11px] text-t3 leading-[1.7]">{feat.detail}</p>
            <Button size="md" className="mt-5" onClick={() => router.push("/auth/login")}>Learn more →</Button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

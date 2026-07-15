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
      <div style={{ background:K.void, padding:"80px 48px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4, marginBottom:14 }}>PLATFORM FEATURES</p>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(28px,5vw,52px)", letterSpacing:"-0.03em", color:K.t1, marginBottom:14 }}>Everything your media team needs.</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:16, color:K.t3, maxWidth:520, margin:"0 auto" }}>One platform for signal enrichment, autonomous optimization, fraud protection, and financial control.</p>
        </div>
        <div style={{ display:"flex", gap:32 }}>
          <div style={{ width:260, flexShrink:0 }}>
            {FEATURES.map(f => (
              <div key={f.id} onClick={() => setActive(f.id)}
                style={{ padding:"14px 16px", marginBottom:6, background:active===f.id?`${f.color}10`:K.g900, border:`1px solid ${active===f.id?f.color+"40":K.g800}`, borderRadius:2, cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:16, color:f.color }}>{f.icon}</span>
                    <span style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:active===f.id?K.t1:K.t2 }}>{f.label}</span>
                  </div>
                  {active===f.id && <span style={{ fontFamily:K.mono, fontSize:12, color:f.color }}>›</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ flex:1, padding:32, background:K.g900, border:`1px solid ${feat.color}30`, borderRadius:2, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${feat.color},transparent)` }} />
            <Badge color={feat.color}>{feat.label.toUpperCase()}</Badge>
            <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(18px,3vw,28px)", letterSpacing:"-0.02em", color:K.t1, margin:"16px 0 12px" }}>{feat.tagline}</h2>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, lineHeight:1.7, maxWidth:520, marginBottom:20 }}>{feat.desc}</p>
            <div style={{ padding:"14px 18px", background:`${feat.color}08`, border:`1px solid ${feat.color}25`, borderRadius:2, display:"inline-block", marginBottom:20 }}>
              <span style={{ fontFamily:K.mono, fontSize:20, fontWeight:700, color:feat.color }}>{feat.stat}</span>
            </div>
            <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3, lineHeight:1.7 }}>{feat.detail}</p>
            <Button size="md" style={{ marginTop:20 }} onClick={() => router.push("/auth/login")}>Learn more →</Button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

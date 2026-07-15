"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";
import { generatePDF } from "@/lib/pdf";

const TIERS = [
  { name:"Growth OaaS",     price:1800,  upliftTarget:"+15-25%", budgetRange:"$10K–$100K/mo",  agents:["Bidding","Pacing","Signals"],              color:K.blue  },
  { name:"Enterprise OaaS", price:4900,  upliftTarget:"+25-45%", budgetRange:"$100K–$1M/mo",   agents:["Bidding","Pacing","Signals","Creative","OaaS Optimizer"], color:K.oaas  },
  { name:"Scale OaaS",      price:null,  upliftTarget:"+40%+",   budgetRange:"$1M+/mo",        agents:["All 6 agents + custom models"],            color:K.gold  },
];

const SCOPE = [
  { area:"Campaign Architecture",   deliverable:"Monthly campaign structure review, audience architecture, budget allocation modelling" },
  { area:"Autonomous Optimization", deliverable:"24/7 bidding, pacing, and signal agent operation within agreed guardrails" },
  { area:"Creative Direction",      deliverable:"AI-generated variant testing, weekly creative performance reports" },
  { area:"Signal Management",       deliverable:"CAPI setup, LTV model training, fraud monitoring, consent management" },
  { area:"Reporting & QBR",         deliverable:"Weekly performance digest, monthly P&L report, quarterly business review" },
  { area:"Escalation Protocol",     deliverable:"ROAS drop >20%: 30-min response. P0 incidents: 15-min response. CSM always on." },
];

export default function OaaSAgreementPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("Enterprise OaaS");
  const [step, setStep] = useState<"scope"|"sign"|"done">("scope");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const tier = TIERS.find(t => t.name === selected)!;

  return (
    <MarketingLayout>
      <div style={{ background:K.void, padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)", maxWidth:960, margin:"0 auto" }}>
        <div style={{ marginBottom:36 }}>
          <Badge color={K.oaas} style={{ marginBottom:14 }}>OAAS MASTER SERVICES AGREEMENT</Badge>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(22px,4vw,34px)", color:K.t1, letterSpacing:"-0.025em", marginBottom:8 }}>Optimization as a Service</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, lineHeight:1.7, maxWidth:600 }}>
            KIKI's AI agents run your campaigns autonomously — with a dedicated CSM and contractual ROAS uplift targets. This is the agreement that governs that engagement.
          </p>
        </div>

        {/* Tier selector */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12, marginBottom:32 }}>
          {TIERS.map(t => (
            <div key={t.name} onClick={() => setSelected(t.name)}
              style={{ padding:20, background:selected===t.name?`${t.color}10`:K.g900, border:`${selected===t.name?2:1}px solid ${selected===t.name?t.color:K.g800}`, borderRadius:2, cursor:"pointer", transition:"all 0.15s" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${t.color}60,transparent)` }}/>
              <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:14, color:K.t1, marginBottom:4 }}>{t.name}</p>
              <p style={{ fontFamily:K.mono, fontSize:t.price?22:18, fontWeight:700, color:t.color, marginBottom:6 }}>{t.price?`$${t.price.toLocaleString()}/mo`:"Custom"}</p>
              <p style={{ fontFamily:K.mono, fontSize:10, color:K.mint, marginBottom:6 }}>Target: {t.upliftTarget} ROAS uplift</p>
              <p style={{ fontFamily:K.mono, fontSize:9, color:K.t3 }}>{t.budgetRange}</p>
            </div>
          ))}
        </div>

        {/* Step indicator */}
        <div style={{ display:"flex", gap:0, marginBottom:28 }}>
          {(["scope","sign","done"] as const).map((s,i) => (
            <div key={s} style={{ display:"flex", alignItems:"center" }}>
              <div style={{ padding:"8px 20px", fontFamily:K.mono, fontSize:10, fontWeight:700, letterSpacing:"0.08em", background:step===s?K.blueD:"transparent", border:`1px solid ${step===s?K.blue:K.g700}`, color:step===s?K.blue4:K.t3, borderRadius:i===0?"2px 0 0 2px":i===2?"0 2px 2px 0":"0", borderLeft:i>0?"none":undefined, cursor:"pointer" }} onClick={() => step!=="done"&&setStep(s)}>
                {i+1}. {s.charAt(0).toUpperCase()+s.slice(1)}
              </div>
            </div>
          ))}
        </div>

        {step === "scope" && (
          <div>
            <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:16, color:K.t1, marginBottom:20 }}>Scope of Services — {selected}</h2>
            <div style={{ border:`1px solid ${K.g800}`, borderRadius:2, overflow:"hidden", marginBottom:24 }}>
              <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", padding:"8px 16px", background:K.g950, borderBottom:`1px solid ${K.g800}` }}>
                {["SERVICE AREA","DELIVERABLE"].map(h => <span key={h} style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.1em", color:K.t4 }}>{h}</span>)}
              </div>
              {SCOPE.map((r,i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"200px 1fr", padding:"13px 16px", borderBottom:i<SCOPE.length-1?`1px solid ${K.g900}`:"none", background:K.g900, alignItems:"start", gap:16 }}>
                  <span style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:tier.color }}>{r.area}</span>
                  <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t2, lineHeight:1.6 }}>{r.deliverable}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:16, background:K.oaasT, border:`1px solid ${K.oaas}25`, borderRadius:2, marginBottom:20 }}>
              <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:12, color:K.oaas, marginBottom:6 }}>⬡ Performance Guarantee</p>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t2, lineHeight:1.6 }}>KIKI guarantees a minimum {tier.upliftTarget} ROAS improvement within 90 days of full onboarding, or we provide a credit equal to 2 months of service fees. Applies to accounts with ≥90 days of historical data.</p>
            </div>
            <Button size="lg" onClick={() => setStep("sign")}>Continue to Sign →</Button>
          </div>
        )}

        {step === "sign" && (
          <div>
            <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:16, color:K.t1, marginBottom:20 }}>Sign OaaS Agreement</h2>
            <div style={{ padding:16, background:K.goldT, border:`1px solid ${K.gold}25`, borderRadius:2, marginBottom:20 }}>
              <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:12, color:K.gold, marginBottom:4 }}>You are signing: {selected}</p>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t2 }}>Monthly fee: {tier.price?`$${tier.price.toLocaleString()}`:"Custom"} · Term: 12 months · Auto-renews with 60-day notice period</p>
            </div>
            <div style={{ marginBottom:14 }}>
              <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.08em", color:K.t3, marginBottom:6 }}>AUTHORISED SIGNATORY NAME</p>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full legal name" style={{ width:"100%", maxWidth:400, background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"11px 14px", fontFamily:"Inter,sans-serif", fontSize:14, color:K.t1, outline:"none" }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.08em", color:K.t3, marginBottom:6 }}>TITLE</p>
              <input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. VP Marketing" style={{ width:"100%", maxWidth:400, background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"11px 14px", fontFamily:"Inter,sans-serif", fontSize:14, color:K.t1, outline:"none" }}/>
            </div>
            {name && <div style={{ padding:"12px 16px", background:K.g850, borderRadius:2, marginBottom:20, fontFamily:"Georgia,serif", fontSize:20, color:K.t2, borderLeft:`3px solid ${K.oaas}` }}>{name}</div>}
            <div style={{ display:"flex", gap:10 }}>
              <Button variant="ghost" size="md" onClick={() => setStep("scope")}>← Back</Button>
              <Button variant="violet" size="lg" disabled={!name.trim()||!role.trim()} onClick={() => setStep("done")}>✓ Execute Agreement</Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign:"center", padding:"40px 0" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🤝</div>
            <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:24, color:K.mint, marginBottom:12 }}>Agreement Executed!</h2>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, lineHeight:1.7, maxWidth:480, margin:"0 auto 24px" }}>
              Your OaaS agreement has been signed and recorded. Your dedicated CSM will reach out within 4 hours to begin onboarding. Welcome to KIKI OaaS.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <Button size="lg" onClick={() => {
                generatePDF({
                  filename: "kiki-oaas-agreement.pdf",
                  title: "OaaS Master Services Agreement",
                  content: [
                    "This OaaS Master Services Agreement ('Agreement') is entered into by and between KIKI Agent Inc. ('Provider') and the undersigned ('Client').",
                    "Service Tier: " + selected,
                    "Monthly Fee: " + (tier.price ? "$" + tier.price.toLocaleString() : "Custom pricing as agreed in writing"),
                    "Term: 12 months from execution date. Auto-renews for successive 12-month periods unless either party provides 60 days written notice of non-renewal.",
                    "Performance Guarantee: Provider guarantees a minimum " + tier.upliftTarget + " ROAS improvement within 90 days of full onboarding. Failure to meet guarantee entitles Client to a credit equal to 2 months of service fees.",
                    "Scope of Services: " + tier.agents.join(", ") + " agents operating 24/7 within agreed guardrails. Dedicated Customer Success Manager assigned to the account.",
                    "Data Processing: Provider processes campaign data solely for the purpose of providing Services. All data handling governed by the applicable DPA and Privacy Policy.",
                    "Governing Law: This Agreement shall be governed by the laws of California, United States.",
                    "Authorized Signatory: " + name + ", " + role,
                    "Date: " + new Date().toISOString().split("T")[0],
                  ],
                  metadata: { Tier: selected, Signed: name, Date: new Date().toISOString().split("T")[0] },
                  watermark: "EXECUTED",
                });
              }}>📄 Download Agreement PDF</Button>
              <Button variant="secondary" size="lg" onClick={() => router.push("/dashboard")}>Go to Dashboard →</Button>
            </div>
          </div>
        )}
      </div>
    </MarketingLayout>
  );
}

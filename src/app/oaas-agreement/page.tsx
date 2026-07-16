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
      <div className="p-[clamp(40px,6vw,80px)_clamp(16px,4vw,48px)] max-w-[960px] mx-auto" style={{ background:K.void }}>
        <div className="mb-9">
          <Badge color={K.oaas} className="mb-[14px]">OAAS MASTER SERVICES AGREEMENT</Badge>
          <h1 className="font-mono font-bold text-[clamp(22px,4vw,34px)] text-t1 tracking-[-0.025em] mb-2">Optimization as a Service</h1>
          <p className="font-sans text-[15px] text-t3 leading-[1.7] max-w-[600px]">
            KIKI's AI agents run your campaigns autonomously — with a dedicated CSM and contractual ROAS uplift targets. This is the agreement that governs that engagement.
          </p>
        </div>

        {/* Tier selector */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 mb-8">
          {TIERS.map(t => (
            <div key={t.name} onClick={() => setSelected(t.name)}
              style={{ padding:20, background:selected===t.name?`${t.color}10`:K.g900, border:`${selected===t.name?2:1}px solid ${selected===t.name?t.color:K.g800}`, borderRadius:2, cursor:"pointer", transition:"all 0.15s" }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,transparent,${t.color}60,transparent)` }}/>
              <p className="font-mono font-bold text-[14px] text-t1 mb-1">{t.name}</p>
              <p className="font-mono font-bold mb-1.5" style={{ fontSize:t.price?22:18, color:t.color }}>{t.price?`$${t.price.toLocaleString()}/mo`:"Custom"}</p>
              <p className="font-mono text-[10px] text-kmint mb-1.5">Target: {t.upliftTarget} ROAS uplift</p>
              <p className="font-mono text-[9px] text-t3">{t.budgetRange}</p>
            </div>
          ))}
        </div>

        {/* Step indicator */}
        <div className="flex gap-0 mb-7">
          {(["scope","sign","done"] as const).map((s,i) => (
            <div key={s} className="flex items-center">
              <div className="py-2 px-5 font-mono font-bold text-[10px] tracking-[0.08em] cursor-pointer" style={{ background:step===s?K.blueD:"transparent", border:`1px solid ${step===s?K.blue:K.g700}`, color:step===s?K.blue4:K.t3, borderRadius:i===0?"2px 0 0 2px":i===2?"0 2px 2px 0":"0", borderLeft:i>0?"none":undefined }} onClick={() => step!=="done"&&setStep(s)}>
                {i+1}. {s.charAt(0).toUpperCase()+s.slice(1)}
              </div>
            </div>
          ))}
        </div>

        {step === "scope" && (
          <div>
            <h2 className="font-mono font-bold text-[16px] text-t1 mb-5">Scope of Services — {selected}</h2>
            <div className="border border-g800 rounded-sm overflow-hidden mb-6">
              <div className="grid grid-cols-[200px_1fr] py-2 px-4 bg-g950 border-b border-g800">
                {["SERVICE AREA","DELIVERABLE"].map(h => <span key={h} className="font-mono text-[9px] tracking-widest text-t4">{h}</span>)}
              </div>
              {SCOPE.map((r,i) => (
                <div key={i} className="grid grid-cols-[200px_1fr] py-[13px] px-4 bg-g900 items-start gap-4" style={{ borderBottom:i<SCOPE.length-1?`1px solid ${K.g900}`:"none" }}>
                  <span className="font-mono font-bold text-[11px]" style={{ color:tier.color }}>{r.area}</span>
                  <span className="font-sans text-[13px] text-t2 leading-[1.6]">{r.deliverable}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-sm mb-5" style={{ background:K.oaasT, border:`1px solid ${K.oaas}25` }}>
              <p className="font-mono font-bold text-[12px] mb-1.5" style={{ color:K.oaas }}>⬡ Performance Guarantee</p>
              <p className="font-sans text-[13px] text-t2 leading-[1.6]">KIKI guarantees a minimum {tier.upliftTarget} ROAS improvement within 90 days of full onboarding, or we provide a credit equal to 2 months of service fees. Applies to accounts with ≥90 days of historical data.</p>
            </div>
            <Button size="lg" onClick={() => setStep("sign")}>Continue to Sign →</Button>
          </div>
        )}

        {step === "sign" && (
          <div>
            <h2 className="font-mono font-bold text-[16px] text-t1 mb-5">Sign OaaS Agreement</h2>
            <div className="p-4 rounded-sm mb-5" style={{ background:K.goldT, border:`1px solid ${K.gold}25` }}>
              <p className="font-mono font-bold text-[12px] text-kgold mb-1">You are signing: {selected}</p>
              <p className="font-sans text-[13px] text-t2">Monthly fee: {tier.price?`$${tier.price.toLocaleString()}`:"Custom"} · Term: 12 months · Auto-renews with 60-day notice period</p>
            </div>
            <div className="mb-3.5">
              <p className="font-mono text-[10px] tracking-[0.08em] text-t3 mb-1.5">AUTHORISED SIGNATORY NAME</p>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full legal name" style={{ width:"100%", maxWidth:400, background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"11px 14px", fontFamily:"Inter,sans-serif", fontSize:14, color:K.t1, outline:"none" }}/>
            </div>
            <div className="mb-5">
              <p className="font-mono text-[10px] tracking-[0.08em] text-t3 mb-1.5">TITLE</p>
              <input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. VP Marketing" style={{ width:"100%", maxWidth:400, background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"11px 14px", fontFamily:"Inter,sans-serif", fontSize:14, color:K.t1, outline:"none" }}/>
            </div>
            {name && <div className="px-4 py-3 bg-g850 rounded-sm mb-5 font-[Georgia,serif] text-[20px] text-t2" style={{ borderLeft:`3px solid ${K.oaas}` }}>{name}</div>}
            <div className="flex gap-2.5">
              <Button variant="ghost" size="md" onClick={() => setStep("scope")}>← Back</Button>
              <Button variant="violet" size="lg" disabled={!name.trim()||!role.trim()} onClick={() => setStep("done")}>✓ Execute Agreement</Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-10">
            <div className="text-[48px] mb-4">🤝</div>
            <h2 className="font-mono font-bold text-[24px] text-kmint mb-3">Agreement Executed!</h2>
            <p className="font-sans text-[15px] text-t3 leading-[1.7] max-w-[480px] mx-auto mb-6">
              Your OaaS agreement has been signed and recorded. Your dedicated CSM will reach out within 4 hours to begin onboarding. Welcome to KIKI OaaS.
            </p>
            <div className="flex gap-2.5 justify-center flex-wrap">
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

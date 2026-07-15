"use client";
import { useState } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";
import { generatePDF } from "@/lib/pdf";
import { getContract, DOC_SLUGS } from "@/lib/contracts";

const DOCS = [
  {
    category: "Legal Agreements",
    color: K.blue,
    items: [
      { name:"Terms of Service v2.4",              desc:"Full platform terms governing use of KIKI Agent",        pages:18, updated:"Mar 20, 2026", href:"/terms"             },
      { name:"Privacy Policy 2026.1",              desc:"Data collection, retention, and GDPR/CCPA rights",       pages:12, updated:"Mar 20, 2026", href:"/privacy"           },
      { name:"Data Processing Addendum v3.1",      desc:"GDPR Article 28 DPA — required for EU processing",      pages:24, updated:"Feb 1, 2026",  href:"/digital-handshake" },
      { name:"Mutual NDA v1.2",                    desc:"Non-disclosure for business evaluations",                pages:6,  updated:"Jan 15, 2026", href:"/nda"               },
    ],
  },
  {
    category: "Commercial Agreements",
    color: K.gold,
    items: [
      { name:"OaaS Master Services Agreement v1.0",desc:"Optimization as a Service engagement terms",            pages:32, updated:"Mar 1, 2026",  href:"/oaas-agreement"    },
      { name:"Reseller / Partner Agreement v2.1",  desc:"Revenue share, white-label, and co-marketing terms",    pages:28, updated:"Feb 15, 2026", href:"/digital-handshake" },
      { name:"Enterprise Order Form Template",     desc:"Custom enterprise subscription order form",              pages:4,  updated:"Mar 1, 2026",  href:"/contact"           },
      { name:"Agency Frame Agreement v1.3",        desc:"Multi-client management and white-label portal terms",  pages:20, updated:"Jan 20, 2026", href:"/digital-handshake" },
    ],
  },
  {
    category: "Compliance & Security",
    color: K.mint,
    items: [
      { name:"SOC 2 Type II Report",               desc:"Annual audit by Big 4 firm — NDA required",             pages:84, updated:"Dec 2025",     href:"/contact"           },
      { name:"Sub-Processor List",                 desc:"Complete list of all data sub-processors",              pages:3,  updated:"Mar 20, 2026", href:"/docs"              },
      { name:"Penetration Test Summary 2026",      desc:"Q1 2026 third-party pen test executive summary",        pages:8,  updated:"Feb 28, 2026", href:"/security"          },
      { name:"GDPR Article 30 RoPA Template",      desc:"Records of Processing Activities template",             pages:10, updated:"Jan 10, 2026", href:"/privacy"           },
    ],
  },
  {
    category: "Technical Documentation",
    color: K.teal,
    items: [
      { name:"API Reference v2.4",                 desc:"Full REST API OpenAPI 3.1 specification (YAML/JSON)",   pages:0,  updated:"Mar 20, 2026", href:"/docs"              },
      { name:"SDK Integration Guide",              desc:"JS, Python, Go, PHP SDK installation and usage",        pages:48, updated:"Mar 15, 2026", href:"/docs"              },
      { name:"CAPI Setup Walkthrough",             desc:"Step-by-step CAPI integration for all 14 platforms",   pages:36, updated:"Mar 10, 2026", href:"/docs"              },
      { name:"Security Architecture Whitepaper",  desc:"Zero-trust, mTLS, encryption, and audit architecture",  pages:22, updated:"Feb 1, 2026",  href:"/security"          },
    ],
  },
];

const SUB_PROCESSORS = [
  { name:"Microsoft Azure",   purpose:"Cloud infrastructure, compute, storage",                      region:"EU (Frankfurt), US (Virginia), APAC (Singapore)", cert:"ISO 27001, SOC2" },
  { name:"Stripe",            purpose:"Payment processing, virtual card issuance",                   region:"US, EU",                                          cert:"PCI DSS L1"      },
  { name:"OpenAI",            purpose:"AI model inference (GPT-4o) — no data retained per DPA",      region:"US",                                              cert:"SOC2 Type II"    },
  { name:"Anthropic",         purpose:"AI model inference (Claude) — no data retained per DPA",      region:"US",                                              cert:"SOC2 Type II"    },
  { name:"Google (Vertex AI)",purpose:"AI model inference (Gemini) — no data retained per DPA",      region:"US, EU",                                          cert:"ISO 27001, SOC2" },
  { name:"Meta (Llama)",      purpose:"On-premise LLaMA model inference — data stays in our infra",  region:"Azure VMs",                                       cert:"N/A (on-prem)"   },
  { name:"SendGrid",          purpose:"Transactional email delivery",                                 region:"US, EU",                                          cert:"SOC2 Type II"    },
  { name:"DataDog",           purpose:"Infrastructure monitoring — no customer data",                 region:"EU",                                              cert:"SOC2 Type II"    },
  { name:"PostHog",           purpose:"Privacy-preserving product analytics",                         region:"EU (self-hosted)",                                 cert:"SOC2 Type II"    },
];

export default function ContractsPage() {
  const [tab, setTab] = useState<"docs"|"processors">("docs");
  const [requested, setRequested] = useState<string[]>([]);

  const request = (name: string) => setRequested(r => [...r, name]);

  const downloadDoc = async (doc: { name: string; desc: string; updated: string }) => {
    const slug = DOC_SLUGS[doc.name];
    const contract = slug ? getContract(slug) : undefined;
    const filename = (slug ?? doc.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()) + ".pdf";
    if (contract) {
      await generatePDF({
        filename,
        title: contract.title,
        content: contract.content,
        metadata: { Version: contract.version, Effective: contract.effective, "Last Updated": doc.updated },
        watermark: "KIKI",
      });
    } else {
      await generatePDF({
        filename,
        title: doc.name,
        content: [doc.desc, "", "Provided by KIKI Agent Inc. for compliance and reference purposes."],
        metadata: { "Last Updated": doc.updated },
        watermark: "KIKI",
      });
    }
  };

  return (
    <MarketingLayout>
      <div style={{ background:K.void, padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)", maxWidth:1040, margin:"0 auto" }}>
        <div style={{ marginBottom:36 }}>
          <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4, marginBottom:12 }}>COMPLIANCE HUB</p>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(22px,4vw,36px)", color:K.t1, letterSpacing:"-0.025em", marginBottom:8 }}>Contracts & Downloads</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, lineHeight:1.7, maxWidth:560 }}>All legal agreements, compliance documentation, and technical resources available for download. Some documents require NDA or are available upon request.</p>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:28, background:K.g850, borderRadius:2, padding:4, width:"fit-content" }}>
          {(["docs","processors"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"7px 18px", fontFamily:K.mono, fontSize:10, fontWeight:600, letterSpacing:"0.08em", borderRadius:2, border:"none", textTransform:"uppercase", background:tab===t?K.g700:"transparent", color:tab===t?K.t1:K.t3, cursor:"pointer" }}>
              {t === "docs" ? "Documents" : "Sub-Processors"}
            </button>
          ))}
        </div>

        {tab === "docs" && (
          <div>
            {DOCS.map(cat => (
              <div key={cat.category} style={{ marginBottom:32 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:cat.color }}/>
                  <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:11, color:cat.color, letterSpacing:"0.1em" }}>{cat.category.toUpperCase()}</p>
                </div>
                <div style={{ border:`1px solid ${K.g800}`, borderRadius:2, overflow:"hidden" }}>
                  {cat.items.map((doc, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 20px", borderBottom:i<cat.items.length-1?`1px solid ${K.g900}`:"none", background:K.g900, flexWrap:"wrap" }}
                      onMouseEnter={e => (e.currentTarget.style.background=K.g850)} onMouseLeave={e => (e.currentTarget.style.background=K.g900)}>
                      {/* Icon */}
                      <div style={{ width:36, height:36, background:`${cat.color}10`, borderRadius:2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:cat.color, flexShrink:0 }}>📄</div>
                      {/* Info */}
                      <div style={{ flex:1, minWidth:200 }}>
                        <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:12, color:K.t1, marginBottom:3 }}>{doc.name}</p>
                        <p style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:K.t3 }}>{doc.desc}</p>
                      </div>
                      {/* Meta */}
                      <div style={{ display:"flex", alignItems:"center", gap:14, flexShrink:0, flexWrap:"wrap" }}>
                        {doc.pages > 0 && <span style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{doc.pages}p</span>}
                        <span style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{doc.updated}</span>
                        {requested.includes(doc.name) ? (
                          <Badge color={K.mint}>REQUESTED ✓</Badge>
                        ) : (
                          doc.name.includes("SOC 2") || doc.name.includes("Pen Test") ? (
                            <Button size="xs" variant="secondary" onClick={() => request(doc.name)}>Request →</Button>
                          ) : (
                            <Button size="xs" variant="secondary" onClick={() => downloadDoc(doc)}>Download ↓</Button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "processors" && (
          <div>
            <div style={{ padding:14, background:K.blueT, border:`1px solid ${K.blue}25`, borderRadius:2, marginBottom:24 }}>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t2, lineHeight:1.7 }}>
                This is the complete list of sub-processors engaged by KIKI Agent Inc. to process personal data on behalf of customers. Last updated: March 20, 2026. Changes notified via email with 30 days notice.
              </p>
            </div>
            <div style={{ border:`1px solid ${K.g800}`, borderRadius:2, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"160px 1fr 1fr 120px", padding:"8px 20px", background:K.g950, borderBottom:`1px solid ${K.g800}` }}>
                {["SUB-PROCESSOR","PURPOSE","DATA REGIONS","CERTIFICATIONS"].map(h => (
                  <span key={h} style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.1em", color:K.t4 }}>{h}</span>
                ))}
              </div>
              {SUB_PROCESSORS.map((sp, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"160px 1fr 1fr 120px", padding:"13px 20px", borderBottom:i<SUB_PROCESSORS.length-1?`1px solid ${K.g900}`:"none", background:i%2===0?K.g900:K.g950, alignItems:"start", gap:12 }}>
                  <span style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:K.t1 }}>{sp.name}</span>
                  <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:K.t3, lineHeight:1.5 }}>{sp.purpose}</span>
                  <span style={{ fontFamily:K.mono, fontSize:11, color:K.t2 }}>{sp.region}</span>
                  <Badge color={K.mint}>{sp.cert}</Badge>
                </div>
              ))}
            </div>
            <div style={{ marginTop:20, padding:16, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2 }}>
              <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>To object to a new sub-processor or request the full DPA, email <span style={{color:K.blue4}}>privacy@kiki.ai</span></p>
            </div>
          </div>
        )}
      </div>
    </MarketingLayout>
  );
}

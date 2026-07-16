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
      <div className="bg-void mx-auto max-w-[1040px] px-[clamp(16px,4vw,48px)] py-[clamp(40px,6vw,80px)]">
        <div className="mb-9">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3">COMPLIANCE HUB</p>
          <h1 className="font-mono font-bold text-[clamp(22px,4vw,36px)] text-t1 tracking-[-0.025em] mb-2">Contracts & Downloads</h1>
          <p className="font-sans text-[15px] text-t3 leading-[1.7] max-w-[560px]">All legal agreements, compliance documentation, and technical resources available for download. Some documents require NDA or are available upon request.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-7 bg-g850 rounded-kdls p-1 w-fit">
          {(["docs","processors"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-[18px] py-[7px] font-mono text-[10px] font-semibold tracking-[0.08em] rounded-kdls border-none uppercase cursor-pointer"
              style={{ background: tab === t ? K.g700 : "transparent", color: tab === t ? K.t1 : K.t3 }}>
              {t === "docs" ? "Documents" : "Sub-Processors"}
            </button>
          ))}
        </div>

        {tab === "docs" && (
          <div>
            {DOCS.map(cat => (
              <div key={cat.category} className="mb-8">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <div className="w-2 h-2 rounded-kdls" style={{ background: cat.color }}/>
                  <p className="font-mono font-bold text-[11px] tracking-widest" style={{ color: cat.color }}>{cat.category.toUpperCase()}</p>
                </div>
                <div className="border border-g800 rounded-kdls overflow-hidden">
                  {cat.items.map((doc, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-[14px] bg-g900 flex-wrap"
                      style={{ borderBottom: i < cat.items.length - 1 ? `1px solid ${K.g900}` : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background=K.g850)} onMouseLeave={e => (e.currentTarget.style.background=K.g900)}>
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-kdls flex items-center justify-center text-base flex-shrink-0" style={{ background: `${cat.color}10`, color: cat.color }}>📄</div>
                      {/* Info */}
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-mono font-bold text-[12px] text-t1 mb-[3px]">{doc.name}</p>
                        <p className="font-sans text-[12px] text-t3">{doc.desc}</p>
                      </div>
                      {/* Meta */}
                      <div className="flex items-center gap-3.5 flex-shrink-0 flex-wrap">
                        {doc.pages > 0 && <span className="font-mono text-[10px] text-t4">{doc.pages}p</span>}
                        <span className="font-mono text-[10px] text-t4">{doc.updated}</span>
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
            <div className="p-[14px] rounded-kdls mb-6" style={{ background: K.blueT, border: `1px solid ${K.blue}25` }}>
              <p className="font-sans text-[13px] text-t2 leading-[1.7]">
                This is the complete list of sub-processors engaged by KIKI Agent Inc. to process personal data on behalf of customers. Last updated: March 20, 2026. Changes notified via email with 30 days notice.
              </p>
            </div>
            <div className="border border-g800 rounded-kdls overflow-hidden">
              <div className="grid grid-cols-[160px_1fr_1fr_120px] px-5 py-2 bg-g950" style={{ borderBottom: `1px solid ${K.g800}` }}>
                {["SUB-PROCESSOR","PURPOSE","DATA REGIONS","CERTIFICATIONS"].map(h => (
                  <span key={h} className="font-mono text-[9px] tracking-widest text-t4">{h}</span>
                ))}
              </div>
              {SUB_PROCESSORS.map((sp, i) => (
                <div key={i} className="grid grid-cols-[160px_1fr_1fr_120px] px-5 py-[13px] items-start gap-3"
                  style={{ borderBottom: i < SUB_PROCESSORS.length - 1 ? `1px solid ${K.g900}` : "none", background: i % 2 === 0 ? K.g900 : K.g950 }}>
                  <span className="font-mono text-[12px] font-bold text-t1">{sp.name}</span>
                  <span className="font-sans text-[12px] text-t3 leading-[1.5]">{sp.purpose}</span>
                  <span className="font-mono text-[11px] text-t2">{sp.region}</span>
                  <Badge color={K.mint}>{sp.cert}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-5 p-4 bg-g900 rounded-kdls" style={{ border: `1px solid ${K.g800}` }}>
              <p className="font-mono text-[11px] text-t3">To object to a new sub-processor or request the full DPA, email <span className="text-kblue4">privacy@kiki.ai</span></p>
            </div>
          </div>
        )}
      </div>
    </MarketingLayout>
  );
}

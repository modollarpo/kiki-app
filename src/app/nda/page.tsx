"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";
import { generatePDF } from "@/lib/pdf";
import { getContract } from "@/lib/contracts";

export default function NDAPage() {
  const router = useRouter();
  const [signed, setSigned] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const NDA_TEXT = [
    { n:"1. Purpose", t:"This Mutual Non-Disclosure Agreement ('Agreement') governs the exchange of confidential information between KIKI Agent Inc. ('KIKI') and the receiving party ('Recipient') for the purpose of evaluating a potential business relationship, including but not limited to integration partnerships, OaaS engagements, enterprise subscriptions, and reseller arrangements." },
    { n:"2. Definition of Confidential Information", t:"'Confidential Information' means any technical, business, financial, or operational information disclosed by either party that is designated as confidential or should reasonably be understood to be confidential. This includes: AI model architectures, pricing strategies, customer data, business roadmaps, and unpublished financial data." },
    { n:"3. Obligations", t:"Each party agrees to: (a) hold Confidential Information in strict confidence using at least the same degree of care as it uses to protect its own confidential information (but not less than reasonable care); (b) not disclose Confidential Information to any third party without prior written consent; (c) use Confidential Information solely for the Purpose." },
    { n:"4. Exclusions", t:"Obligations do not apply to information that: (a) is or becomes publicly known through no fault of the Recipient; (b) was rightfully known to the Recipient prior to disclosure; (c) is independently developed by the Recipient without use of Confidential Information; (d) is required to be disclosed by law or court order (with prior written notice where permitted)." },
    { n:"5. Term", t:"This Agreement is effective upon signature and continues for 3 years. Obligations with respect to Confidential Information disclosed during the term survive for an additional 3 years following termination. KIKI's source code and AI model weights are protected indefinitely." },
    { n:"6. Remedies", t:"The parties acknowledge that breach of this Agreement may cause irreparable harm for which monetary damages would be inadequate. Either party may seek injunctive relief without the requirement to post a bond. This does not limit other remedies available at law or equity." },
    { n:"7. Governing Law", t:"This Agreement shall be governed by the laws of California, United States, without regard to conflict of law provisions. Disputes shall be resolved in the courts of San Francisco County, California." },
  ];

  return (
    <MarketingLayout>
      <div style={{ background:K.void, padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)", maxWidth:840, margin:"0 auto" }}>
        {signed ? (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div style={{ fontSize:56, marginBottom:20 }}>🤝</div>
            <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(20px,3.5vw,32px)", color:K.mint, marginBottom:12 }}>NDA Executed</h1>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, maxWidth:440, margin:"0 auto 28px", lineHeight:1.7 }}>Thank you, {name}. The Mutual NDA between {company} and KIKI Agent Inc. has been executed. A signed copy will be emailed within 2 hours.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <Button size="lg" onClick={async () => {
                const contract = getContract("mutual-nda");
                const content = contract
                  ? [
                      ...contract.content,
                      "",
                      "EXECUTED BY:",
                      name,
                      role + ", " + company,
                      "Date: " + new Date().toISOString().split("T")[0],
                      "",
                      "KIKI Agent Inc.",
                      "By: ____________________    Date: ____________",
                    ]
                  : ["Mutual NDA executed by " + name + " (" + role + ", " + company + ")"];
                await generatePDF({
                  filename: "kiki-nda-signed.pdf",
                  title: "Mutual Non-Disclosure Agreement",
                  content,
                  metadata: { Version: contract?.version ?? "v1.2", "Executed By": name, Company: company },
                  watermark: "EXECUTED",
                });
              }}>📄 Download Signed NDA</Button>
              <Button variant="secondary" size="lg" onClick={() => router.push("/contact")}>Contact us →</Button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:36 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                <span style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4 }}>LEGAL</span>
                <Badge color={K.teal}>MUTUAL</Badge>
                <Badge color={K.blue}>ELECTRONIC SIGNATURE</Badge>
              </div>
              <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(22px,4vw,34px)", color:K.t1, letterSpacing:"-0.025em", marginBottom:8 }}>Mutual Non-Disclosure Agreement</h1>
              <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>Version 1.2 · Effective upon signature · 3-year term</p>
            </div>
            <div className="prose" style={{ marginBottom:32 }}>
              {NDA_TEXT.map((s,i) => (
                <div key={i} style={{ marginBottom:22, paddingBottom:22, borderBottom:i<NDA_TEXT.length-1?`1px solid ${K.g800}`:"none" }}>
                  <h3 style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:8 }}>{s.n}</h3>
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t2, lineHeight:1.75 }}>{s.t}</p>
                </div>
              ))}
            </div>
            <div style={{ padding:20, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2 }}>
              <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:16 }}>Executing Party (Recipient)</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.08em", color:K.t3, marginBottom:6 }}>FULL LEGAL NAME</p>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="Sarah Chen" style={{ width:"100%", background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"10px 14px", fontFamily:"Inter,sans-serif", fontSize:13, color:K.t1, outline:"none" }}/>
                </div>
                <div>
                  <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.08em", color:K.t3, marginBottom:6 }}>TITLE / ROLE</p>
                  <input value={role} onChange={e=>setRole(e.target.value)} placeholder="CMO" style={{ width:"100%", background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"10px 14px", fontFamily:"Inter,sans-serif", fontSize:13, color:K.t1, outline:"none" }}/>
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.08em", color:K.t3, marginBottom:6 }}>COMPANY / ORGANIZATION</p>
                <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Acme Corp" style={{ width:"100%", background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"10px 14px", fontFamily:"Inter,sans-serif", fontSize:13, color:K.t1, outline:"none" }}/>
              </div>
              {name && <div style={{ padding:"12px 16px", background:K.g850, borderRadius:2, marginBottom:16, fontFamily:"Georgia,serif", fontSize:20, color:K.t2, borderLeft:`3px solid ${K.teal}` }}>{name}</div>}
              <Button size="lg" disabled={!name.trim()||!company.trim()||!role.trim()} onClick={() => setSigned(true)}>
                ✓ Execute Mutual NDA
              </Button>
            </div>
          </>
        )}
      </div>
    </MarketingLayout>
  );
}

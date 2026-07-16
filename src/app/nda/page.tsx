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
      <div className="max-w-[840px] mx-auto" style={{ background:K.void, padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)" }}>
        {signed ? (
          <div className="text-center py-[60px]">
            <div className="text-[56px] mb-5">🤝</div>
            <h1 className="font-mono font-bold text-[clamp(20px,3.5vw,32px)] text-kmint mb-3">NDA Executed</h1>
            <p className="font-sans text-[15px] text-t3 max-w-[440px] mx-auto mb-7 leading-[1.7]">Thank you, {name}. The Mutual NDA between {company} and KIKI Agent Inc. has been executed. A signed copy will be emailed within 2 hours.</p>
            <div className="flex gap-2.5 justify-center flex-wrap">
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
            <div className="mb-9">
              <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                <span className="font-mono text-[9px] tracking-[0.18em] text-t4">LEGAL</span>
                <Badge color={K.teal}>MUTUAL</Badge>
                <Badge color={K.blue}>ELECTRONIC SIGNATURE</Badge>
              </div>
              <h1 className="font-mono font-bold text-[clamp(22px,4vw,34px)] text-t1 tracking-[-0.025em] mb-2">Mutual Non-Disclosure Agreement</h1>
              <p className="font-mono text-[11px] text-t3">Version 1.2 · Effective upon signature · 3-year term</p>
            </div>
            <div className="prose mb-8">
              {NDA_TEXT.map((s,i) => (
                <div key={i} className="mb-[22px] pb-[22px]" style={{ borderBottom:i<NDA_TEXT.length-1?`1px solid ${K.g800}`:"none" }}>
                  <h3 className="font-mono font-bold text-[13px] text-t1 mb-2">{s.n}</h3>
                  <p className="font-sans text-[13px] text-t2 leading-relaxed">{s.t}</p>
                </div>
              ))}
            </div>
            <div className="p-5 bg-g900 rounded-sm" style={{ border:`1px solid ${K.g800}` }}>
              <p className="font-mono font-bold text-[13px] text-t1 mb-4">Executing Party (Recipient)</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.08em] text-t3 mb-1.5">FULL LEGAL NAME</p>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="Sarah Chen" className="w-full bg-g800 rounded-sm px-3.5 py-2.5 font-sans text-[13px] text-t1 outline-none" style={{ border:`1px solid ${K.g700}` }}/>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.08em] text-t3 mb-1.5">TITLE / ROLE</p>
                  <input value={role} onChange={e=>setRole(e.target.value)} placeholder="CMO" className="w-full bg-g800 rounded-sm px-3.5 py-2.5 font-sans text-[13px] text-t1 outline-none" style={{ border:`1px solid ${K.g700}` }}/>
                </div>
              </div>
              <div className="mb-4">
                <p className="font-mono text-[10px] tracking-[0.08em] text-t3 mb-1.5">COMPANY / ORGANIZATION</p>
                <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Acme Corp" className="w-full bg-g800 rounded-sm px-3.5 py-2.5 font-sans text-[13px] text-t1 outline-none" style={{ border:`1px solid ${K.g700}` }}/>
              </div>
              {name && <div className="px-4 py-3 bg-g850 rounded-sm mb-4 font-[Georgia,serif] text-[20px] text-t2" style={{ borderLeft:`3px solid ${K.teal}` }}>{name}</div>}
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

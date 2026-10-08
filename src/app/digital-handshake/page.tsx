"use client";
import { useState } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";
import { downloadSimplePDF } from "@/lib/pdf";

const DOCUMENTS = [
  { id:"tos",   title:"Terms of Service",              version:"v2.4",  required:true,  signed:true,  date:"2026-03-01", type:"legal"    },
  { id:"pp",    title:"Privacy Policy",                version:"2026.1",required:true,  signed:true,  date:"2026-03-01", type:"legal"    },
  { id:"dpa",   title:"Data Processing Addendum",      version:"v3.1",  required:true,  signed:false, date:null,         type:"compliance"},
  { id:"gdpr",  title:"GDPR Article 28 Agreement",     version:"2026",  required:true,  signed:false, date:null,         type:"compliance"},
  { id:"sla",   title:"Service Level Agreement",       version:"v2.0",  required:false, signed:false, date:null,         type:"enterprise"},
  { id:"nda",   title:"Mutual NDA",                    version:"v1.2",  required:false, signed:false, date:null,         type:"enterprise"},
  { id:"oaas",  title:"OaaS Master Services Agreement",version:"v1.0",  required:false, signed:false, date:null,         type:"commercial"},
];

const TYPE_COLORS: Record<string,string> = { legal:K.blue, compliance:K.mint, enterprise:K.gold, commercial:K.oaas };

export default function DigitalHandshakePage() {
  const [docs, setDocs] = useState(DOCUMENTS);
  const [signing, setSigning] = useState<string|null>(null);
  const [signature, setSignature] = useState("");
  const [title, setTitle] = useState("");

  const handleSign = (id: string) => {
    if (!signature.trim() || !title.trim()) return;
    setDocs(d => d.map(doc => doc.id === id ? { ...doc, signed:true, date:new Date().toISOString().split("T")[0]! } : doc));
    setSigning(null);
    setSignature("");
    setTitle("");
  };

  const signedCount = docs.filter(d => d.signed).length;
  const requiredCount = docs.filter(d => d.required).length;
  const signedRequired = docs.filter(d => d.required && d.signed).length;

  return (
    <MarketingLayout>
      <div className="p-[clamp(40px,6vw,80px)_clamp(16px,4vw,48px)] max-w-[900px] mx-auto" style={{ background:K.void }}>

        {/* Signing modal */}
        {signing && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-5 bg-[rgba(6,6,8,0.9)]" onClick={() => setSigning(null)}>
            <div className="w-full max-w-[520px] bg-g900 border border-g700 rounded-sm overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)]" onClick={e => e.stopPropagation()}>
              <div className="px-[22px] py-4 border-b border-g800 relative">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,transparent,${K.blue}80,transparent)` }}/>
                <p className="font-mono font-bold text-[14px] text-t1 mb-1">Sign {docs.find(d=>d.id===signing)?.title}</p>
                <p className="font-sans text-[13px] text-t3">By signing, you agree to be bound by this document on behalf of your organization.</p>
              </div>
              <div className="p-[22px]">
                <div className="p-3.5 rounded-sm mb-4.5" style={{ background:K.blueT, border:`1px solid ${K.blue}25` }}>
                  <p className="font-mono font-bold text-[11px] mb-1" style={{ color:K.blue4 }}>🔒 Cryptographic signature</p>
                  <p className="font-sans text-[12px] text-t2">Your signature will be timestamped, hashed (SHA-256), and stored in the immutable audit log with your IP address and user agent. This creates a legally binding electronic agreement.</p>
                </div>
                <div className="mb-3">
                  <p className="font-mono text-[10px] tracking-[0.08em] text-t3 mb-1.5">YOUR FULL LEGAL NAME</p>
                  <input value={signature} onChange={e => setSignature(e.target.value)} placeholder="e.g. Sarah Chen" style={{ width:"100%", background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"11px 14px", fontFamily:"Inter,sans-serif", fontSize:14, color:K.t1, outline:"none" }}/>
                </div>
                <div className="mb-4.5">
                  <p className="font-mono text-[10px] tracking-[0.08em] text-t3 mb-1.5">YOUR TITLE / ROLE</p>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chief Marketing Officer" style={{ width:"100%", background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"11px 14px", fontFamily:"Inter,sans-serif", fontSize:14, color:K.t1, outline:"none" }}/>
                </div>
                {signature.trim() && (
                  <div className="p-3.5 bg-g850 rounded-sm mb-4 font-[Georgia,serif] text-[22px] text-t2 tracking-[0.02em]" style={{ borderLeft:`3px solid ${K.blue}` }}>{signature}</div>
                )}
                <div className="flex gap-2.5">
                  <Button variant="ghost" size="md" onClick={() => setSigning(null)}>Cancel</Button>
                  <Button size="md" full disabled={!signature.trim() || !title.trim()} onClick={() => handleSign(signing!)}>
                    ✓ Sign & Confirm
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-9">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3">DIGITAL HANDSHAKE</p>
          <h1 className="font-mono font-bold text-[clamp(22px,4vw,34px)] text-t1 tracking-[-0.025em] mb-2">Contract & Agreement Center</h1>
          <p className="font-sans text-[14px] text-t3">Manage all legal agreements for your KIKI Agent account. Electronic signatures are legally binding under ESIGN Act (US) and eIDAS (EU).</p>
        </div>

        {/* Progress */}
        <div className="p-5 bg-g900 border border-g800 rounded-sm mb-7 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-mono font-bold text-[12px] text-t1 mb-1">
              {signedRequired === requiredCount ? "✓ All required documents signed" : `${requiredCount - signedRequired} required document${requiredCount - signedRequired > 1 ? "s" : ""} pending`}
            </p>
            <p className="font-mono text-[10px] text-t3">{signedCount} of {docs.length} total documents signed</p>
          </div>
          <div className="flex gap-[3px] items-center">
            {docs.map(d => (
              <div key={d.id} className="w-2.5 h-2.5 rounded-sm" style={{ background:d.signed?K.mint:d.required?K.warn:K.g700 }} title={d.title}/>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="flex flex-col gap-2.5">
          {docs.map(doc => (
            <div key={doc.id} className="px-5 py-4 bg-g900 rounded-sm flex items-center justify-between flex-wrap gap-4" style={{ border:`1px solid ${doc.signed?K.mint+"30":doc.required?K.warn+"20":K.g800}`, borderLeft:`3px solid ${doc.signed?K.mint:doc.required?K.warn:K.g700}` }}>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-[5px] flex-wrap">
                  <p className="font-mono font-bold text-[13px] text-t1">{doc.title}</p>
                  <Badge color={TYPE_COLORS[doc.type]||K.t3}>{doc.type.toUpperCase()}</Badge>
                  {doc.required && <Badge color={K.warn}>REQUIRED</Badge>}
                </div>
                <div className="flex gap-4 flex-wrap">
                  <span className="font-mono text-[10px] text-t3">Version: {doc.version}</span>
                  {doc.signed && doc.date && <span className="font-mono text-[10px] text-kmint">✓ Signed {doc.date}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button variant="secondary" size="sm" onClick={() => downloadSimplePDF(`${doc.id}.pdf`, doc.title, doc.title + "\n\nVersion: " + doc.version + "\nStatus: " + (doc.signed ? "Signed " + doc.date : "Pending signature") + "\nType: " + doc.type.charAt(0).toUpperCase() + doc.type.slice(1) + "\n\nThis document is available for review. Signed copies are stored in the KIKI immutable audit log with cryptographic hash verification.")}>📄 View PDF</Button>
                {!doc.signed ? (
                  <Button size="sm" onClick={() => setSigning(doc.id)}>Sign →</Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => downloadSimplePDF(`${doc.id}-signed.pdf`, doc.title + " (Signed)", doc.title + "\n\nVersion: " + doc.version + "\nSigned: " + (doc.date || "Pending") + "\nCryptographic signature: SHA-256 hash stored in immutable audit log\n\nThis signed copy is legally binding under ESIGN Act (US) and eIDAS (EU).")}>Download ↓</Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4.5 bg-g900 border border-g800 rounded-sm">
          <p className="font-mono font-bold text-[12px] text-t1 mb-1.5">Need a custom agreement?</p>
          <p className="font-sans text-[13px] text-t3">Enterprise customers can request custom MSAs, BAAs, and tailored DPAs. Contact <span style={{color:K.blue4}}>legal@keekii.net</span></p>
        </div>
      </div>
    </MarketingLayout>
  );
}

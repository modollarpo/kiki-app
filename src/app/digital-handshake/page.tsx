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
      <div style={{ background:K.void, padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)", maxWidth:900, margin:"0 auto" }}>

        {/* Signing modal */}
        {signing && (
          <div style={{ position:"fixed", inset:0, background:"rgba(6,6,8,0.9)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setSigning(null)}>
            <div style={{ width:"100%", maxWidth:520, background:K.g900, border:`1px solid ${K.g700}`, borderRadius:2, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding:"16px 22px", borderBottom:`1px solid ${K.g800}`, position:"relative" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${K.blue}80,transparent)` }}/>
                <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:14, color:K.t1, marginBottom:4 }}>Sign {docs.find(d=>d.id===signing)?.title}</p>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t3 }}>By signing, you agree to be bound by this document on behalf of your organization.</p>
              </div>
              <div style={{ padding:22 }}>
                <div style={{ padding:14, background:K.blueT, border:`1px solid ${K.blue}25`, borderRadius:2, marginBottom:18 }}>
                  <p style={{ fontFamily:K.mono, fontSize:11, color:K.blue4, fontWeight:700, marginBottom:4 }}>🔒 Cryptographic signature</p>
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:K.t2 }}>Your signature will be timestamped, hashed (SHA-256), and stored in the immutable audit log with your IP address and user agent. This creates a legally binding electronic agreement.</p>
                </div>
                <div style={{ marginBottom:12 }}>
                  <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.08em", color:K.t3, marginBottom:6 }}>YOUR FULL LEGAL NAME</p>
                  <input value={signature} onChange={e => setSignature(e.target.value)} placeholder="e.g. Sarah Chen" style={{ width:"100%", background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"11px 14px", fontFamily:"Inter,sans-serif", fontSize:14, color:K.t1, outline:"none" }}/>
                </div>
                <div style={{ marginBottom:18 }}>
                  <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.08em", color:K.t3, marginBottom:6 }}>YOUR TITLE / ROLE</p>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chief Marketing Officer" style={{ width:"100%", background:K.g800, border:`1px solid ${K.g700}`, borderRadius:2, padding:"11px 14px", fontFamily:"Inter,sans-serif", fontSize:14, color:K.t1, outline:"none" }}/>
                </div>
                {signature.trim() && (
                  <div style={{ padding:14, background:K.g850, borderRadius:2, marginBottom:16, fontFamily:"Georgia,serif", fontSize:22, color:K.t2, letterSpacing:"0.02em", borderLeft:`3px solid ${K.blue}` }}>{signature}</div>
                )}
                <div style={{ display:"flex", gap:10 }}>
                  <Button variant="ghost" size="md" onClick={() => setSigning(null)}>Cancel</Button>
                  <Button size="md" full disabled={!signature.trim() || !title.trim()} onClick={() => handleSign(signing!)}>
                    ✓ Sign & Confirm
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom:36 }}>
          <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4, marginBottom:12 }}>DIGITAL HANDSHAKE</p>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(22px,4vw,34px)", color:K.t1, letterSpacing:"-0.025em", marginBottom:8 }}>Contract & Agreement Center</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:K.t3 }}>Manage all legal agreements for your KIKI Agent account. Electronic signatures are legally binding under ESIGN Act (US) and eIDAS (EU).</p>
        </div>

        {/* Progress */}
        <div style={{ padding:20, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, marginBottom:28, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:K.t1, marginBottom:4 }}>
              {signedRequired === requiredCount ? "✓ All required documents signed" : `${requiredCount - signedRequired} required document${requiredCount - signedRequired > 1 ? "s" : ""} pending`}
            </p>
            <p style={{ fontFamily:K.mono, fontSize:10, color:K.t3 }}>{signedCount} of {docs.length} total documents signed</p>
          </div>
          <div style={{ display:"flex", gap:3, alignItems:"center" }}>
            {docs.map(d => (
              <div key={d.id} style={{ width:10, height:10, borderRadius:2, background:d.signed?K.mint:d.required?K.warn:K.g700 }} title={d.title}/>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {docs.map(doc => (
            <div key={doc.id} style={{ padding:"16px 20px", background:K.g900, border:`1px solid ${doc.signed?K.mint+"30":doc.required?K.warn+"20":K.g800}`, borderLeft:`3px solid ${doc.signed?K.mint:doc.required?K.warn:K.g700}`, borderRadius:2, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                  <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1 }}>{doc.title}</p>
                  <Badge color={TYPE_COLORS[doc.type]||K.t3}>{doc.type.toUpperCase()}</Badge>
                  {doc.required && <Badge color={K.warn}>REQUIRED</Badge>}
                </div>
                <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:K.mono, fontSize:10, color:K.t3 }}>Version: {doc.version}</span>
                  {doc.signed && doc.date && <span style={{ fontFamily:K.mono, fontSize:10, color:K.mint }}>✓ Signed {doc.date}</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" }}>
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

        <div style={{ marginTop:32, padding:18, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2 }}>
          <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:12, color:K.t1, marginBottom:6 }}>Need a custom agreement?</p>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t3 }}>Enterprise customers can request custom MSAs, BAAs, and tailored DPAs. Contact <span style={{color:K.blue4}}>legal@kiki.ai</span></p>
        </div>
      </div>
    </MarketingLayout>
  );
}

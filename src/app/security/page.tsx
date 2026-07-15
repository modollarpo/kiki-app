"use client";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge, Button, Card } from "@/components/ui";
import { downloadSimplePDF } from "@/lib/pdf";

const CONTROLS = [
  {icon:"🔐",title:"SOC 2 Type II",desc:"Independently audited annually. Full report available under NDA.",color:K.mint},
  {icon:"🔒",title:"End-to-end Encryption",desc:"TLS 1.3 in transit. AES-256 at rest. Secrets in Azure Key Vault.",color:K.blue},
  {icon:"⚡",title:"Zero-Trust Architecture",desc:"mTLS between microservices. RBAC everywhere. Least-privilege service accounts.",color:K.oaas},
  {icon:"🌍",title:"GDPR & CCPA Compliant",desc:"Data residency in EU, US, APAC. Right-to-deletion within 72 hours.",color:K.teal},
  {icon:"🔍",title:"Penetration Testing",desc:"Quarterly pen tests by third-party firm. Active bug bounty program.",color:K.warn},
  {icon:"📋",title:"Immutable Audit Logs",desc:"Every action logged with cryptographic hash chain. Tamper-evident.",color:K.gold},
];

export default function SecurityPage() {
  return (
    <MarketingLayout>
      <div style={{ background:K.void, padding:"80px 48px", maxWidth:960, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:60 }}>
          <div style={{ width:60, height:60, background:K.mintD, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>🛡</div>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(28px,5vw,48px)", letterSpacing:"-0.03em", color:K.t1, marginBottom:16 }}>Security at KIKI</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:16, color:K.t3, maxWidth:500, margin:"0 auto" }}>Enterprise-grade security built into every layer of the platform.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:48 }}>
          {CONTROLS.map(c=>(
            <div key={c.title} style={{ padding:24, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2 }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${c.color}60,transparent)` }} />
              <span style={{ fontSize:28, display:"block", marginBottom:12 }}>{c.icon}</span>
              <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:14, color:K.t1, marginBottom:8 }}>{c.title}</p>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t3, lineHeight:1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
        <Card accent={K.mint} glow={K.mint}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
            <div>
              <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:18, color:K.t1, marginBottom:6 }}>Security whitepaper</p>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:K.t3, maxWidth:480 }}>Detailed technical documentation of our security architecture, controls, and compliance posture.</p>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Button variant="secondary" size="md" onClick={() => downloadSimplePDF("kiki-security-whitepaper.pdf", "Security Whitepaper", [
  "KIKI Agent Inc. — Security Architecture Whitepaper",
  "Version 1.0 · Effective March 2026 · Classification: Confidential",
  "1. SOC 2 Type II: Independently audited annually by a Big 4 accounting firm. Full report available under NDA upon request.",
  "2. End-to-End Encryption: TLS 1.3 for data in transit. AES-256-GCM for data at rest. All secrets managed via Azure Key Vault with HSM backing.",
  "3. Zero-Trust Architecture: mTLS between all microservices. Role-based access control (RBAC) enforced at every layer. Least-privilege service accounts with automatic credential rotation.",
  "4. GDPR & CCPA Compliant: Data residency options in EU (Frankfurt), US (Virginia), and APAC (Singapore). Right-to-deletion honored within 72 hours. Data Processing Addendum available for all customers.",
  "5. Penetration Testing: Quarterly external pen tests conducted by an independent third-party security firm. Active bug bounty program via HackerOne.",
  "6. Immutable Audit Logs: Every system action is logged with a cryptographic hash chain. Tamper-evident design ensures log integrity. Logs retained for 7 years.",
  "7. Incident Response: Documented incident response plan with <15 minute P0 response time. 24/7 on-call security team. Post-incident reviews published within 48 hours.",
].join("\n\n"))}>Download PDF</Button>
              <Button variant="mint" size="md" onClick={() => window.open("mailto:security@kiki.ai?subject=SOC2%20Report%20Request", "_blank")}>Request SOC2 Report</Button>
            </div>
          </div>
        </Card>
      </div>
    </MarketingLayout>
  );
}

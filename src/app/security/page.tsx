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
      <div className="py-[clamp(40px,6vw,80px)_clamp(16px,4vw,48px)] max-w-[960px] mx-auto" style={{ background:K.void }}>
        <div className="text-center mb-15">
          <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-4 text-[28px]" style={{ background:K.mintD }}>🛡</div>
          <h1 className="font-mono font-bold text-[clamp(28px,5vw,48px)] tracking-[-0.03em] text-t1 mb-4">Security at KIKI</h1>
          <p className="font-sans text-[16px] text-t3 max-w-[500px] mx-auto">Enterprise-grade security built into every layer of the platform.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {CONTROLS.map(c=>(
            <div key={c.title} className="p-6 bg-g900 border border-g800 rounded-sm">
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${c.color}60,transparent)` }} />
              <span className="text-[28px] block mb-3">{c.icon}</span>
              <p className="font-mono font-bold text-[14px] text-t1 mb-2">{c.title}</p>
              <p className="font-sans text-[13px] text-t3 leading-[1.6]">{c.desc}</p>
            </div>
          ))}
        </div>
        <Card accent={K.mint} glow={K.mint}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-mono font-bold text-[18px] text-t1 mb-1.5">Security whitepaper</p>
              <p className="font-sans text-[14px] text-t3 max-w-[480px]">Detailed technical documentation of our security architecture, controls, and compliance posture.</p>
            </div>
            <div className="flex gap-2.5">
              <Button variant="secondary" size="md" onClick={() => downloadSimplePDF("kiki-security-whitepaper.pdf", "Security Whitepaper", [
  "KIKI Agent (STOREGRILL INC LTD) — Security Architecture Whitepaper",
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

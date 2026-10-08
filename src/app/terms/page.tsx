"use client";
import { MarketingLayout } from "@/components/layout/MarketingLayout";

const S = [
  { h:"1. Acceptance", b:"By accessing or using KIKI Agent, you agree to these Terms. If agreeing on behalf of an organization, you represent you have authority to bind that organization. These Terms incorporate our Privacy Policy, Data Processing Addendum, and any applicable Order Forms." },
  { h:"2. Permitted Use", b:"KIKI Agent is licensed for legitimate advertising optimization on platforms where you hold authorized access. Prohibited uses include: processing data of individuals under 16, deceptive advertising, circumventing platform terms, reverse-engineering our AI models, or reselling access without a partner agreement." },
  { h:"3. Service Level Agreement", b:"KIKI Agent targets 99.97% uptime (excluding scheduled maintenance). Enrichment P99 latency SLA: ≤ 100ms. Credits: 99.5–99.97% → 10%; 99.0–99.5% → 25%; below 99.0% → 50% of monthly fee. Enterprise plans have separate negotiated SLAs." },
  { h:"4. Data Processing", b:"You are the data controller. KIKI Agent is your data processor. Your use is governed by our DPA (available at keekii.net/contracts or on request). You are responsible for lawful consent for processing activities. We process data only on your documented instructions and will not share it with sub-processors beyond those listed in our privacy policy." },
  { h:"5. Intellectual Property", b:"KIKI Agent retains ownership of the platform, AI/ML models, SyncBrain routing engine, and all associated IP. You retain ownership of your campaign data and first-party data. Aggregated, anonymized benchmark data may be used by KIKI Agent for platform improvement." },
  { h:"6. Fees & Payment", b:"Subscription fees are charged monthly or annually in advance. Signal volume and seat overages are billed in arrears within 5 business days. Late payment (>30 days) results in service suspension after notice. Annual plans are non-refundable except as required by applicable law." },
  { h:"7. Limitation of Liability", b:"TO THE MAXIMUM EXTENT PERMITTED BY LAW, KIKI AGENT'S TOTAL LIABILITY SHALL NOT EXCEED FEES PAID IN THE 3 MONTHS PRECEDING THE CLAIM. KIKI AGENT IS NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS OR DATA LOSS." },
  { h:"8. Termination", b:"Either party may terminate with 30 days written notice. KIKI Agent may terminate immediately for material breach, non-payment exceeding 60 days, illegal use, or conduct threatening platform security. Upon termination, you have 30 days to export data before secure deletion." },
  { h:"9. Governing Law", b:"KIKI Agent is a product of STOREGRILL INC LTD (Company No. 14581073, registered in England & Wales, Coventry, CV3 2FP, England). These Terms are governed by the laws of England & Wales. Disputes resolved in the courts of England & Wales. EU/UK customers may have additional rights under local consumer law." },
];

export default function TermsPage() {
  return (
    <MarketingLayout>
      <div className="bg-void max-w-[840px] mx-auto" style={{ padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)" }}>
        <div className="mb-9">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3">LEGAL</p>
          <h1 className="font-mono font-bold text-t1 tracking-tight mb-2" style={{ fontSize:"clamp(22px,4vw,34px)" }}>Terms of Service</h1>
          <p className="font-mono text-[11px] text-t3">Last updated: March 20, 2026 · Version 2.4</p>
        </div>
        <div className="prose">
          {S.map((s,i) => (
            <div key={i} className={`mb-7 pb-7 ${i<S.length-1?"border-b border-g800":""}`}>
              <h2 className="font-mono font-bold text-base text-t1 mb-2.5">{s.h}</h2>
              <p className="font-sans text-[13px] text-t2 leading-[1.75]">{s.b}</p>
            </div>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}

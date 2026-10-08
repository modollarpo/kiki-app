"use client";
import { useRouter } from "next/navigation";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";

const SECTIONS = [
  { icon:"⚡", title:"Quick Start",    desc:"Connect your first ad account and start enriching conversions in 15 minutes.",                               href:"/docs",    time:"15 min",  badge:"START HERE",  bc:K.mint  },
  { icon:"◎",  title:"CAPI Integration", desc:"Server-side Conversions API setup for Meta, Google, TikTok, and LinkedIn with LTV enrichment.",            href:"/docs",          time:"30 min",  badge:"REQUIRED",    bc:K.blue  },
  { icon:"⬡",  title:"LTV Model API",  desc:"Query enrichment predictions directly, configure model parameters, and retrieve historical accuracy data.",  href:"/docs",       time:"20 min",  badge:"",            bc:K.gold  },
  { icon:"⬗",  title:"Fraud API",      desc:"Real-time IVT scoring endpoint, bulk event validation, and fraud event webhook configuration.",              href:"/docs",         time:"15 min",  badge:"",            bc:K.danger},
  { icon:"▤",  title:"Webhooks",       desc:"Receive real-time events for signal enrichment, agent decisions, anomaly alerts, and billing events.",        href:"/docs",      time:"20 min",  badge:"",            bc:K.teal  },
  { icon:"💳", title:"Wallet API",     desc:"Issue virtual cards, check balances, initiate transfers, and retrieve ledger entries programmatically.",     href:"/docs",        time:"25 min",  badge:"",            bc:K.gold  },
  { icon:"🔒", title:"Auth & Security", desc:"API key management, OAuth 2.0 flows, HMAC webhook signature verification, and IP allowlisting.",           href:"/docs",          time:"15 min",  badge:"",            bc:K.oaas  },
  { icon:"📱", title:"SDK Reference",  desc:"JavaScript, Python, Go, and PHP SDKs. Type definitions, examples, and changelog.",                           href:"/docs",           time:"varies",  badge:"",            bc:K.blue  },
];

const CODE_EXAMPLE = `// Install
npm install @kiki-agent/sdk

// Initialize
import { KikiAgent } from "@kiki-agent/sdk";

const kiki = new KikiAgent({
  apiKey: process.env.KIKI_API_KEY,
  tenantId: process.env.KIKI_TENANT_ID,
});

// Enrich a conversion event
const enriched = await kiki.capi.enrich({
  platform: "meta",
  event: {
    event_name: "Purchase",
    event_time: Date.now() / 1000,
    user_data: { em: sha256(email), ph: sha256(phone) },
    custom_data: { currency: "USD", value: 149.00 },
  },
});

// enriched.custom_data.predicted_ltv_90d → 639.20
// enriched.custom_data.ltv_confidence    → 0.94
console.log(enriched);`;

export default function DocsPage() {
  const router = useRouter();
  return (
    <MarketingLayout>
      <div className="max-w-[1060px] mx-auto" style={{ background:K.void, padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)" }}>
        <div className="text-center mb-14">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3.5">DEVELOPER DOCUMENTATION</p>
          <h1 className="font-mono font-bold text-[clamp(24px,4vw,40px)] text-t1 tracking-[-0.03em] mb-3">KIKI Agent API Reference</h1>
          <p className="font-sans text-[16px] text-t3 max-w-[520px] mx-auto mb-7">Everything you need to integrate, extend, and automate the KIKI Agent platform.</p>
          <div className="flex gap-2.5 justify-center flex-wrap">
            <Button size="lg" onClick={() => router.push("/auth/login")}>Get API Key →</Button>
            <Button variant="secondary" size="lg" onClick={() => window.open("https://github.com/modollarpo/kiki-app", "_blank")}>View on GitHub</Button>
          </div>
        </div>

        <div className="rounded-sm mb-10 overflow-hidden" style={{ background:K.g900, border:`1px solid ${K.g800}` }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ background:K.g950, borderBottom:`1px solid ${K.g800}` }}>
            <div className="flex gap-[5px]">
              {["#FF3B3B","#F5A623","#31F3C3"].map((c,i) => <div key={i} className="w-2.5 h-2.5 rounded-full opacity-70" style={{ background:c }}/>)}
            </div>
            <span className="font-mono text-[10px] text-t4">Terminal</span>
          </div>
          <pre className="px-6 py-5 font-mono text-[12px] text-t2 leading-[1.9] overflow-auto">
            <code>{CODE_EXAMPLE}</code>
          </pre>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {SECTIONS.map(s => (
            <div key={s.title} onClick={() => router.push(s.href)}
              className="p-[22px] bg-g900 rounded-sm cursor-pointer transition-all duration-200 relative overflow-hidden"
              style={{ border:`1px solid ${K.g800}` }}
              onMouseEnter={e => { (e.currentTarget.style.background=K.g850); (e.currentTarget.style.transform="translateY(-2px)"); }}
              onMouseLeave={e => { (e.currentTarget.style.background=K.g900); (e.currentTarget.style.transform="none"); }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${s.bc}60,transparent)` }}/>
              <div className="flex items-start justify-between mb-3">
                <span className="text-[22px]" style={{ color:s.bc }}>{s.icon}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {s.badge && <Badge color={s.bc}>{s.badge}</Badge>}
                  <span className="font-mono text-[9px] text-t4">{s.time}</span>
                </div>
              </div>
              <p className="font-mono font-bold text-[13px] text-t1 mb-1.5">{s.title}</p>
              <p className="font-sans text-[12px] text-t3 leading-[1.6]">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 bg-g900 rounded-sm flex items-center justify-between flex-wrap gap-4" style={{ border:`1px solid ${K.g800}` }}>
          <div>
            <p className="font-mono font-bold text-[13px] text-t1 mb-1">Need help integrating?</p>
            <p className="font-sans text-[13px] text-t3">Email <span style={{color:K.blue4}}>developers@keekii.net</span></p>
          </div>
          <div className="flex gap-2.5">
            <Button size="sm" onClick={() => router.push("/contact")}>Book Integration Call</Button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

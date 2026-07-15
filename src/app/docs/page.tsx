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
      <div style={{ background:K.void, padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)", maxWidth:1060, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4, marginBottom:14 }}>DEVELOPER DOCUMENTATION</p>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(24px,4vw,40px)", color:K.t1, letterSpacing:"-0.03em", marginBottom:12 }}>KIKI Agent API Reference</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:16, color:K.t3, maxWidth:520, margin:"0 auto 28px" }}>Everything you need to integrate, extend, and automate the KIKI Agent platform.</p>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            <Button size="lg" onClick={() => router.push("/auth/login")}>Get API Key →</Button>
            <Button variant="secondary" size="lg" onClick={() => window.open("https://github.com/kiki-agent/sdk", "_blank")}>View on GitHub</Button>
          </div>
        </div>

        <div style={{ padding:0, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, marginBottom:40, overflow:"hidden" }}>
          <div style={{ padding:"10px 18px", background:K.g950, borderBottom:`1px solid ${K.g800}`, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex", gap:5 }}>
              {["#FF3B3B","#F5A623","#31F3C3"].map((c,i) => <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c, opacity:0.7 }}/>)}
            </div>
            <span style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>Terminal</span>
          </div>
          <pre style={{ padding:"20px 24px", fontFamily:K.mono, fontSize:12, color:K.t2, lineHeight:1.9, overflow:"auto" }}>
            <code>{CODE_EXAMPLE}</code>
          </pre>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12 }}>
          {SECTIONS.map(s => (
            <div key={s.title} onClick={() => router.push(s.href)}
              style={{ padding:22, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, cursor:"pointer", transition:"all 0.2s", position:"relative", overflow:"hidden" }}
              onMouseEnter={e => { (e.currentTarget.style.background=K.g850); (e.currentTarget.style.transform="translateY(-2px)"); }}
              onMouseLeave={e => { (e.currentTarget.style.background=K.g900); (e.currentTarget.style.transform="none"); }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${s.bc}60,transparent)` }}/>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ fontSize:22, color:s.bc }}>{s.icon}</span>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {s.badge && <Badge color={s.bc}>{s.badge}</Badge>}
                  <span style={{ fontFamily:K.mono, fontSize:9, color:K.t4 }}>{s.time}</span>
                </div>
              </div>
              <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:6 }}>{s.title}</p>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:K.t3, lineHeight:1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop:40, padding:20, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:4 }}>Need help integrating?</p>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t3 }}>Join our developer Discord or email <span style={{color:K.blue4}}>developers@kiki.ai</span></p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Button variant="secondary" size="sm" onClick={() => window.open("https://discord.gg/kiki-agent", "_blank")}>Join Discord</Button>
            <Button size="sm" onClick={() => router.push("/contact")}>Book Integration Call</Button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

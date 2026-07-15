"use client";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge, Button, Card } from "@/components/ui";
import { useRouter } from "next/navigation";

const CAPABILITIES = [
  {icon:"🔒",title:"Dedicated Infrastructure",desc:"Your own AKS cluster, PostgreSQL, and Redis. No shared compute. Infrastructure-level isolation.",color:K.blue},
  {icon:"🎨",title:"White-Label Portal",desc:"Full white-labeling: your logo, domain, colors. Clients see your brand, not ours.",color:K.oaas},
  {icon:"📋",title:"Custom SLA",desc:"Negotiated uptime guarantees, incident response SLAs, and dedicated on-call support.",color:K.gold},
  {icon:"🌍",title:"Data Residency",desc:"Choose where your data lives: EU (Frankfurt), US (Virginia), or APAC (Singapore).",color:K.teal},
  {icon:"👤",title:"Dedicated CSM",desc:"A dedicated Customer Success Manager who knows your business — not a ticket queue.",color:K.mint},
  {icon:"🔌",title:"Custom Integrations",desc:"KIKI engineering builds custom integrations for your data stack, CRM, and ad platforms.",color:K.crm},
];

export default function EnterprisePage() {
  const router = useRouter();
  return (
    <MarketingLayout>
      <div style={{ background:K.void, padding:"80px 48px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, marginBottom:72, alignItems:"center" }}>
          <div>
            <Badge color={K.gold} style={{ marginBottom:16 }}>ENTERPRISE</Badge>
            <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(28px,5vw,52px)", letterSpacing:"-0.04em", color:K.t1, lineHeight:1.05, marginBottom:20 }}>Built for teams managing millions.</h1>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:16, color:K.t3, lineHeight:1.7, maxWidth:480, marginBottom:32 }}>Dedicated infrastructure, custom SLAs, white-label portals, and a team of humans behind the AI.</p>
            <div style={{ display:"flex", gap:12 }}>
              <Button variant="gold" size="lg" onClick={() => router.push("/contact")}>Talk to Sales →</Button>
              <Button variant="secondary" size="lg" onClick={() => router.push("/contact")}>Request Demo</Button>
            </div>
          </div>
          <Card accent={K.gold} glow={K.gold}>
            <p style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:K.gold, marginBottom:16 }}>ENTERPRISE SLA</p>
            {[["Platform Uptime","99.99%"],["Support Response","< 1 hour"],["CSM Response","< 15 min"],["Data Residency","EU · US · APAC"],["Dedicated AKS Cluster","Included"],["Contract Terms","Custom"]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${K.g800}` }}>
                <span style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>{l}</span>
                <span style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:K.gold }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
        <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:28, letterSpacing:"-0.02em", color:K.t1, marginBottom:32 }}>Enterprise-only capabilities</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:64 }}>
          {CAPABILITIES.map(c=>(
            <div key={c.title} style={{ padding:24, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, cursor:"default", transition:"all 0.2s" }}
              onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);(e.currentTarget.style.transform="translateY(-2px)");}} onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);(e.currentTarget.style.transform="none");}}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${c.color}60,transparent)` }} />
              <span style={{ fontSize:28, display:"block", marginBottom:12 }}>{c.icon}</span>
              <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:14, color:K.t1, marginBottom:8 }}>{c.title}</p>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t3, lineHeight:1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", padding:"48px", background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2 }}>
          <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:28, letterSpacing:"-0.02em", color:K.t1, marginBottom:12 }}>Ready to scale?</h2>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, marginBottom:24 }}>Talk to our enterprise team. Custom proposal within 48 hours.</p>
          <Button variant="gold" size="xl" onClick={() => router.push("/contact")}>Contact Enterprise Sales →</Button>
        </div>
      </div>
    </MarketingLayout>
  );
}

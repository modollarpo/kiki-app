"use client";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Card } from "@/components/ui";

const TEAM = [
  {name:"Alex Chen",  role:"CEO & Co-Founder",    init:"AC",color:K.blue},
  {name:"Maria Santos",role:"CTO & Co-Founder",   init:"MS",color:K.oaas},
  {name:"James Park", role:"Head of AI",           init:"JP",color:K.green},
  {name:"Priya Kumar",role:"Head of Product",      init:"PK",color:K.teal},
  {name:"Lars Eriksson",role:"Head of Engineering",init:"LE",color:K.blue4},
  {name:"Aisha Okafor",role:"Head of Customers",  init:"AO",color:K.crm},
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      <div style={{ background:K.void, padding:"80px 48px", maxWidth:960, margin:"0 auto" }}>
        <div style={{ marginBottom:56 }}>
          <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4, marginBottom:14 }}>ABOUT</p>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(28px,5vw,52px)", letterSpacing:"-0.04em", color:K.t1, marginBottom:20, lineHeight:1.05 }}>We built the platform<br/>we needed.</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:17, color:K.t3, lineHeight:1.7, maxWidth:600, marginBottom:40 }}>After 10 years running performance campaigns across Meta, Google, and TikTok, we got tired of optimizing for first-order value instead of real customer LTV. So we built KIKI.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:48 }}>
            {[["2024","Founded"],["$2.4B","Ad spend managed"],["47","Enterprise customers"]].map(([v,l])=>(
              <div key={l} style={{ padding:24, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, textAlign:"center" }}>
                <p style={{ fontFamily:K.mono, fontSize:36, fontWeight:700, color:K.blue }}>{v}</p>
                <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3, marginTop:6 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height:1, background:`linear-gradient(90deg,transparent,${K.g700},transparent)`, margin:"0 0 48px" }} />
        <div>
          <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:28, letterSpacing:"-0.02em", color:K.t1, marginBottom:32 }}>The team</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {TEAM.map(p=>(
              <div key={p.name} style={{ padding:20, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, cursor:"default", transition:"all 0.2s" }}
                onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);}} onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);}}>
                <div style={{ width:48, height:48, borderRadius:"50%", background:`${p.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:K.mono, fontWeight:700, fontSize:18, color:p.color, marginBottom:12 }}>{p.init}</div>
                <p style={{ fontFamily:K.mono, fontSize:13, fontWeight:700, color:K.t1 }}>{p.name}</p>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:K.t3, marginTop:3 }}>{p.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

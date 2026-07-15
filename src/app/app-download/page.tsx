"use client";
import { useState } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";

const FEATURES = [
  { icon:"⚡", title:"Live Agent Controls",    desc:"Pause, resume, and monitor all 6 AI agents with real-time metric updates." },
  { icon:"◎",  title:"Signal Stream",          desc:"Watch conversion signals flow, enrich, and dispatch in real-time." },
  { icon:"💳", title:"Wallet Management",      desc:"Top up, issue virtual cards, and monitor spend from anywhere." },
  { icon:"🔔", title:"Critical Alerts",        desc:"Instant push notifications for ROAS drops, budget alerts, and fraud events." },
  { icon:"⬡",  title:"SyncBrain Voice",        desc:"Ask SyncBrain anything. Get instant AI insights via voice or text." },
  { icon:"📊", title:"Performance Dashboard",  desc:"Full ROAS, CAC, LTV, and spend analytics optimized for mobile." },
];

export default function AppDownloadPage() {
  const [platform, setPlatform] = useState<"ios"|"android"|"pwa">("ios");

  return (
    <MarketingLayout>
      <div style={{ background:K.void, minHeight:"80vh" }}>
        <div style={{ padding:"clamp(48px,8vw,100px) clamp(16px,4vw,48px)", maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", gap:40, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:280 }}>
            <Badge color={K.blue} style={{ marginBottom:20 }}>MOBILE APP</Badge>
            <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(28px,5vw,52px)", color:K.t1, letterSpacing:"-0.04em", lineHeight:1.05, marginBottom:16 }}>
              KIKI Agent<br/>in your pocket.
            </h1>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:16, color:K.t3, lineHeight:1.7, maxWidth:460, marginBottom:36 }}>
              Full campaign management, live signal stream, AI agent controls, and SyncBrain voice interface — iOS, Android, and installable PWA.
            </p>

            <div style={{ display:"flex", gap:6, marginBottom:24, flexWrap:"wrap" }}>
              {(["ios","android","pwa"] as const).map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  style={{ padding:"10px 20px", fontFamily:K.mono, fontSize:11, fontWeight:700, letterSpacing:"0.06em", background:platform===p?K.blueD:"transparent", border:`1px solid ${platform===p?K.blue:K.g700}`, borderRadius:2, color:platform===p?K.blue4:K.t3, cursor:"pointer", transition:"all 0.15s" }}>
                  {p==="ios"?"iOS":""}
                  {p==="android"?"Android":""}
                  {p==="pwa"?"Install PWA":""}
                </button>
              ))}
            </div>

            {platform === "ios" && (
              <div>
                <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
                  <Button size="lg" onClick={() => window.open("https://apps.apple.com/app/id6478912345", "_blank")}>📱 Download on App Store</Button>
                </div>
                <p style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>iOS 16+ · iPhone & iPad · 28MB · Free</p>
              </div>
            )}
            {platform === "android" && (
              <div>
                <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
                  <Button size="lg" onClick={() => window.open("https://play.google.com/store/apps/details?id=com.kiki.agent", "_blank")}>▶ Get on Google Play</Button>
                </div>
                <p style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>Android 11+ · 22MB · Free</p>
              </div>
            )}
            {platform === "pwa" && (
              <div>
                <div style={{ padding:16, background:K.blueT, border:`1px solid ${K.blue}25`, borderRadius:2, marginBottom:16 }}>
                  <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:K.blue4, marginBottom:6 }}>Install as Progressive Web App</p>
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t2 }}>Visit <span style={{color:K.blue4}}>app.kiki.ai</span> in your browser, then tap &quot;Add to Home Screen&quot; to install. Works offline with background sync.</p>
                </div>
                <Button size="lg" onClick={() => window.open("https://app.kiki.ai", "_blank")}>Open Web App →</Button>
              </div>
            )}
          </div>

          <div style={{ flexShrink:0, display:"flex", justifyContent:"center" }}>
            <div style={{ width:280, height:560, background:K.g900, borderRadius:40, border:`2px solid ${K.g700}`, overflow:"hidden", boxShadow:`0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${K.g600}`, position:"relative" }}>
              <div style={{ height:40, background:K.void, display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:"0 20px 8px" }}>
                <span style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:K.t1 }}>9:41</span>
                <span style={{ fontFamily:K.mono, fontSize:9, color:K.t2 }}>100%</span>
              </div>
              <div style={{ background:K.void, borderBottom:`1px solid ${K.g800}`, padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <img src="/images/kiki.png" alt="KIKI" width={24} height={24} style={{ borderRadius:6 }} />
                  <span style={{ fontFamily:K.mono, fontWeight:700, fontSize:12, color:K.t1 }}>KIKI</span>
                </div>
                <span style={{ fontFamily:K.mono, fontSize:10, color:K.mint }}>● LIVE</span>
              </div>
              <div style={{ padding:"14px 14px 0" }}>
                <div style={{ background:`linear-gradient(135deg,${K.g850},${K.g800})`, borderRadius:12, padding:14, marginBottom:12 }}>
                  <p style={{ fontFamily:K.mono, fontSize:8, color:K.t4, marginBottom:4 }}>PLATFORM ROAS</p>
                  <p style={{ fontFamily:K.mono, fontSize:24, fontWeight:700, color:K.mint, marginBottom:2 }}>4.23×</p>
                  <p style={{ fontFamily:K.mono, fontSize:9, color:K.t3 }}>↑10.8% vs last month</p>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                  {[{l:"CAC",v:"$21.40",c:K.blue},{l:"LTV",v:"$312",c:K.oaas}].map(m=>(
                    <div key={m.l} style={{ background:K.g850, borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                      <p style={{ fontFamily:K.mono, fontSize:14, fontWeight:700, color:m.c }}>{m.v}</p>
                      <p style={{ fontFamily:K.mono, fontSize:8, color:K.t4, marginTop:2 }}>{m.l}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background:K.g850, borderRadius:10, padding:"10px 12px" }}>
                  <p style={{ fontFamily:K.mono, fontSize:9, color:K.t4, marginBottom:6 }}>AI AGENTS</p>
                  {[{n:"Bidding Agent",c:K.blue},{n:"Smart Pacing",c:K.mint}].map(a=>(
                    <div key={a.n} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontFamily:K.mono, fontSize:10, color:K.t2 }}>{a.n}</span>
                      <span className="animate-kdls-pulse" style={{ width:6, height:6, borderRadius:"50%", background:a.c, display:"inline-block" }}/>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:60, background:K.void, borderTop:`1px solid ${K.g800}`, display:"flex", alignItems:"center", justifyContent:"space-around", padding:"0 8px" }}>
                {[{i:"⬛",l:"Home"},{i:"⬡",l:"Camps"},{i:"◎",l:"Wallet"},{i:"⚡",l:"Agents"}].map(t=>(
                  <div key={t.l} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                    <span style={{ fontSize:14, color:t.l==="Home"?K.blue:K.t4 }}>{t.i}</span>
                    <span style={{ fontFamily:K.mono, fontSize:7, color:t.l==="Home"?K.blue:K.t4 }}>{t.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:"0 clamp(16px,4vw,48px) 80px", maxWidth:1100, margin:"0 auto" }}>
          <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4, marginBottom:24, textAlign:"center" }}>EVERYTHING IN THE DESKTOP APP, OPTIMIZED FOR MOBILE</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:12 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ padding:20, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2 }}>
                <span style={{ fontSize:24, display:"block", marginBottom:10 }}>{f.icon}</span>
                <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:K.t1, marginBottom:6 }}>{f.title}</p>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t3, lineHeight:1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

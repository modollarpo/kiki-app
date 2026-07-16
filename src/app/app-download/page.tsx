"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";
import Image from "next/image";

const FEATURES = [
  { icon:"⚡", title:"Live Agent Controls",    desc:"Pause, resume, and monitor all 6 AI agents with real-time metric updates." },
  { icon:"◎",  title:"Signal Stream",          desc:"Watch conversion signals flow, enrich, and dispatch in real-time." },
  { icon:"💳", title:"Wallet Management",      desc:"Top up, issue virtual cards, and monitor spend from anywhere." },
  { icon:"🔔", title:"Critical Alerts",        desc:"Instant push notifications for ROAS drops, budget alerts, and fraud events." },
  { icon:"⬡",  title:"SyncBrain Voice",        desc:"Ask SyncBrain anything. Get instant AI insights via voice or text." },
  { icon:"📊", title:"Performance Dashboard",  desc:"Full ROAS, CAC, LTV, and spend analytics optimized for mobile." },
];

export default function AppDownloadPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<"ios"|"android"|"pwa">("ios");

  return (
    <MarketingLayout>
      <div className="min-h-[80vh]" style={{ background:K.void }}>
        <div className="p-[clamp(48px,8vw,100px)_clamp(16px,4vw,48px)] max-w-[1100px] mx-auto flex items-center justify-between gap-10 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <Badge color={K.blue} className="mb-5">MOBILE APP</Badge>
            <h1 className="font-mono font-bold text-[clamp(28px,5vw,52px)] text-t1 tracking-[-0.04em] leading-[1.05] mb-4">
              KIKI Agent<br/>in your pocket.
            </h1>
            <p className="font-sans text-[16px] text-t3 leading-[1.7] max-w-[460px] mb-9">
              Full campaign management, live signal stream, AI agent controls, and SyncBrain voice interface — iOS, Android, and installable PWA.
            </p>

            <div className="flex gap-1.5 mb-6 flex-wrap">
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
                <div className="flex gap-3 mb-4 flex-wrap">
                  <Button size="lg" onClick={() => window.open("https://apps.apple.com/app/id6478912345", "_blank")}>📱 Download on App Store</Button>
                </div>
                <p className="font-mono text-[10px] text-t4">iOS 16+ · iPhone & iPad · 28MB · Free</p>
              </div>
            )}
            {platform === "android" && (
              <div>
                <div className="flex gap-3 mb-4 flex-wrap">
                  <Button size="lg" onClick={() => window.open("https://play.google.com/store/apps/details?id=com.kiki.agent", "_blank")}>▶ Get on Google Play</Button>
                </div>
                <p className="font-mono text-[10px] text-t4">Android 11+ · 22MB · Free</p>
              </div>
            )}
            {platform === "pwa" && (
              <div>
                <div className="p-4 rounded-sm mb-4" style={{ background:K.blueT, border:`1px solid ${K.blue}25` }}>
                  <p className="font-mono font-bold text-[12px] mb-1.5" style={{ color:K.blue4 }}>Install as Progressive Web App</p>
                  <p className="font-sans text-[13px] text-t2">Visit <span style={{color:K.blue4}}>app.kiki.ai</span> in your browser, then tap &quot;Add to Home Screen&quot; to install. Works offline with background sync.</p>
                </div>
                <Button size="lg" onClick={() => window.open("https://app.kiki.ai", "_blank")}>Open Web App →</Button>
              </div>
            )}
          </div>

          <div className="shrink-0 flex justify-center">
            <div className="w-[280px] h-[560px] bg-g900 rounded-[40px] border-2 border-g700 overflow-hidden relative" style={{ boxShadow:`0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${K.g600}` }}>
              <div className="h-10 flex items-end justify-between p-[0_20px_8px]" style={{ background:K.void }}>
                <span className="font-mono font-bold text-[11px] text-t1">9:41</span>
                <span className="font-mono text-[9px] text-t2">100%</span>
              </div>
              <div className="py-2.5 px-4 flex items-center justify-between border-b border-g800" style={{ background:K.void }}>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
                  <Image src="/images/kiki.png" alt="KIKI" width={20} height={20} className="rounded-md" style={{ margin:2 }} />
                  <span className="font-mono font-bold text-[12px] text-t1">KIKI</span>
                </div>
                <span className="font-mono text-[10px] text-kmint">● LIVE</span>
              </div>
              <div className="p-[14px_14px_0]">
                <div className="rounded-xl p-3.5 mb-3" style={{ background:`linear-gradient(135deg,${K.g850},${K.g800})` }}>
                  <p className="font-mono text-[8px] text-t4 mb-1">LTV ENRICHMENT</p>
                  <p className="font-mono font-bold text-[24px] text-kmint mb-0.5">4.3×</p>
                  <p className="font-mono text-[9px] text-t3">Avg LTV vs raw order value</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[{l:"CAC",v:"$21.40",c:K.blue},{l:"LTV",v:"$312",c:K.oaas}].map(m=>(
                    <div key={m.l} className="bg-g850 rounded-[10px] py-2.5 px-3 text-center">
                      <p className="font-mono font-bold text-[14px] mb-1" style={{ color:m.c }}>{m.v}</p>
                      <p className="font-mono text-[8px] text-t4 mt-0.5">{m.l}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-g850 rounded-[10px] py-2.5 px-3">
                  <p className="font-mono text-[9px] text-t4 mb-1.5">AI AGENTS</p>
                  {[{n:"Bidding Agent",c:K.blue},{n:"Smart Pacing",c:K.mint}].map(a=>(
                    <div key={a.n} className="flex items-center justify-between mb-[5px]">
                      <span className="font-mono text-[10px] text-t2">{a.n}</span>
                      <span className="animate-kdls-pulse w-1.5 h-1.5 rounded-full inline-block" style={{ background:a.c }}/>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[60px] flex items-center justify-around px-2" style={{ background:K.void, borderTop:`1px solid ${K.g800}` }}>
                {[{i:"⬛",l:"Home"},{i:"⬡",l:"Camps"},{i:"◎",l:"Wallet"},{i:"⚡",l:"Agents"}].map(t=>(
                  <div key={t.l} className="flex flex-col items-center gap-0.5">
                    <span style={{ fontSize:14, color:t.l==="Home"?K.blue:K.t4 }}>{t.i}</span>
                    <span className="font-mono text-[7px]" style={{ color:t.l==="Home"?K.blue:K.t4 }}>{t.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-[0_clamp(16px,4vw,48px)_80px] max-w-[1100px] mx-auto">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-6 text-center">EVERYTHING IN THE DESKTOP APP, OPTIMIZED FOR MOBILE</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="p-5 bg-g900 border border-g800 rounded-sm">
                <span className="text-[24px] block mb-2.5">{f.icon}</span>
                <p className="font-mono font-bold text-[12px] text-t1 mb-1.5">{f.title}</p>
                <p className="font-sans text-[13px] text-t3 leading-[1.6]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

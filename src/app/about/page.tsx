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
      <div className="py-[clamp(40px,6vw,80px)_clamp(16px,4vw,48px)] max-w-[960px] mx-auto" style={{ background:K.void }}>
        <div className="mb-14">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3.5">ABOUT</p>
          <h1 className="font-mono font-bold text-[clamp(28px,5vw,52px)] tracking-[-0.04em] text-t1 mb-5 leading-[1.05]">We built the platform<br/>we needed.</h1>
          <p className="font-sans text-[17px] text-t3 leading-[1.7] max-w-[600px] mb-10">After 10 years running performance campaigns across Meta, Google, and TikTok, we got tired of optimizing for first-order value instead of real customer LTV. So we built KIKI.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[["2024","Founded"],["8","Platform integrations"],["5","Autonomous AI agents"]].map(([v,l])=>(
              <div key={l} className="p-6 bg-g900 border border-g800 rounded-sm text-center">
                <p className="font-mono text-[36px] font-bold text-kblue">{v}</p>
                <p className="font-mono text-[11px] text-t3 mt-1.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="h-px mb-12" style={{ background:`linear-gradient(90deg,transparent,${K.g700},transparent)` }} />
        <div>
          <h2 className="font-mono font-bold text-[28px] tracking-tight text-t1 mb-8">The team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEAM.map(p=>(
              <div key={p.name} className="p-5 bg-g900 border border-g800 rounded-sm cursor-default transition-all duration-200"
                onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);}} onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);}}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-[18px] mb-3" style={{ background:`${p.color}18`, color:p.color }}>{p.init}</div>
                <p className="font-mono font-bold text-[13px] text-t1">{p.name}</p>
                <p className="font-sans text-[12px] text-t3 mt-[3px]">{p.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";

const TICKER = [
  { label:"LTV-ENRICHED BIDDING",       value:"ACTIVE",      color:K.mint  },
  { label:"28-FEATURE SIGNAL PROCESSING", value:"ONLINE",   color:K.mint  },
  { label:"CROSS-PLATFORM ARBITRAGE",   value:"ENABLED",     color:K.mint  },
  { label:"REAL-TIME CAPI DELIVERY",    value:"CONNECTED",   color:K.teal  },
  { label:"FRAUD DETECTION ENGINE",     value:"RUNNING",     color:K.teal  },
  { label:"AI-POWERED OPTIMIZATION",    value:"ENGAGED",     color:K.gold  },
  { label:"ADAPTIVE BID MANAGEMENT",    value:"ACTIVE",      color:K.blue  },
  { label:"SUB-SECOND RESPONSES",       value:"TARGET",      color:K.blue  },
  { label:"99.9% UPTIME SLA",           value:"GUARANTEED",  color:K.mint  },
  { label:"SMART DATA ENRICHMENT",      value:"ONLINE",      color:K.teal  },
];

const TERMINAL = [
  { ts:"09:41:07.001", svc:"capi-gateway",   lvl:"INFO",   color:K.blue,  txt:"POST /v1/events  tenant=acme-corp  platform=meta  ip=157.240.x.x" },
  { ts:"09:41:07.019", svc:"fraud-detect",   lvl:"PASS",   color:K.mint,  txt:"score=0.04  verdict=CLEAN  signals=[ip,fingerprint,velocity]" },
  { ts:"09:41:07.022", svc:"consent-svc",    lvl:"INFO",   color:K.t3,    txt:"advertising=true  jurisdiction=GDPR  lawful_basis=consent" },
  { ts:"09:41:07.038", svc:"ltv-model-v5",   lvl:"PRED",   color:K.gold,  txt:"order=$149.00  →  ltv_90d=$639.20  r2=0.91  confidence=0.94" },
  { ts:"09:41:07.041", svc:"enrichment-svc", lvl:"ENRICH", color:K.mint,  special:true },
  { ts:"09:41:07.382", svc:"capi-router",    lvl:"SEND",   color:K.mint,  txt:"meta=✓(341ms)  google=✓(289ms)  tiktok=✓(412ms)  linkedin=✓(298ms)" },
  { ts:"09:41:07.390", svc:"attribution",    lvl:"ATTR",   color:K.oaas,  txt:"campaign=Q4-Fitness  revenue=$639.20  signal_id=sig_a3x9" },
  { ts:"09:41:07.391", svc:"syncbrain",      lvl:"ROUTE",  color:K.green, txt:"bid_adjust: model=gpt-4o  confidence=0.94  latency=12ms" },
];

const PLATFORMS = [
  "Meta","Google","TikTok","LinkedIn","YouTube","Snapchat","Pinterest","Amazon DSP","Reddit","DV360","X Ads","TradeDesk","Criteo","AppNexus",
];
const PLATFORM_COLORS: Record<string,string> = {
  Meta:"#1877F2",Google:"#4285F4",TikTok:"#FF0050",LinkedIn:"#0A66C2",YouTube:"#FF0000",
  Snapchat:"#FFFC00",Pinterest:"#E60023","Amazon DSP":"#FF9900",Reddit:"#FF4500",
  DV360:"#4285F4","X Ads":"#1DA1F2",TradeDesk:"#007AFF",Criteo:"#F96A0A",AppNexus:"#00B2FF",
};

const FEATURES = [
  { n:"01",tag:"ENRICHMENT ENGINE",icon:"◎",accent:K.mint,
    title:"Your $149 order\nbecomes a $640 signal.",
    body:"Every conversion intercepted server-side. ML predicts 90-day LTV in 38ms. All 14 platforms receive the enriched value — not the raw order.",
    proof:[{v:"4.29×",l:"avg LTV uplift"},{v:"38ms",l:"median latency"},{v:"R²=0.91",l:"model accuracy"}], href:"/features/ltv-enrichment" },
  { n:"02",tag:"SYNCBRAIN™",icon:"⬡",accent:K.green,
    title:"Seven AI models.\nOne routing brain.",
    body:"GPT-4o for decisions. Claude for reasoning. Gemini Flash for speed. LLaMA for cost. SyncBrain selects in 12ms, budget-aware, quality-first.",
    proof:[{v:"7",l:"AI models"},{v:"12ms",l:"routing latency"},{v:"45%",l:"cost reduction"}], href:"/features/syncbrain" },
  { n:"03",tag:"AUTONOMOUS AGENTS",icon:"⚡",accent:K.blue,
    title:"Bidding decisions.\nAll day. Every day.",
    body:"Six specialized agents — Bidding, Creative, Smart Pacing, Signals, OaaS, SyncBrain — execute within your guardrails and log every action.",
    proof:[{v:"6",l:"AI agents"},{v:"847",l:"decisions/day"},{v:"0h",l:"manual bidding"}], href:"/features/ai-agents" },
  { n:"04",tag:"FRAUD & IVT",icon:"⬗",accent:K.danger,
    title:"Bot traffic poisons\nyour LTV model.",
    body:"IVT contaminates your training data — your model learns to find bots. KIKI blocks fraud before enrichment using IP, fingerprint, and velocity.",
    proof:[{v:"99.2%",l:"detection rate"},{v:"0.03%",l:"false positives"},{v:"18ms",l:"score latency"}], href:"/features/fraud-ivt" },
];

const HOW = [
  {s:"01",t:"Connect",  c:K.teal,  b:"15-minute CAPI or pixel integration with any stack."},
  {s:"02",t:"Intercept",c:K.blue,  b:"Every conversion caught server-side before platform delivery."},
  {s:"03",t:"Enrich",   c:K.gold,  b:"ML model predicts 90-day LTV in 38ms. Fraud checked. Consent validated."},
  {s:"04",t:"Deliver",  c:K.mint,  b:"Enriched signal sent to all 14 platforms simultaneously."},
  {s:"05",t:"Optimize", c:K.oaas,  b:"AI agents adjust bids, budgets, and creatives — autonomously."},
];

const PROOF = [
  {co:"LTV ENRICHMENT",  stat:"4.3×",  sub:"Avg LTV vs raw order value when enriched",      accent:K.mint },
  {co:"CROSS-PLATFORM",   stat:"8",     sub:"Ad platforms with native OAuth + CAPI",        accent:K.blue },
  {co:"SIGNAL FEATURES",  stat:"28",    sub:"Feature vector per conversion event",          accent:K.gold },
  {co:"AI AGENTS",        stat:"5",     sub:"Autonomous agents optimizing 24/7",            accent:K.oaas },
];

const TESTIMONIALS = [
  { q:"KIKI sends predicted LTV to Meta instead of raw conversion value. That alone changed what the algorithm optimizes for — and our acquisition quality improved measurably.", who:"Platform Capability", at:"LTV Enrichment" },
  { q:"Instead of teaching platforms to find our worst customers, KIKI enriches every signal with predicted lifetime value before delivery. The math is transparent and the agents are auditable.", who:"Architecture", at:"Signal Pipeline" },
];

const COMPARE = [
  {f:"LTV signal enrichment before platform delivery",  k:true,  m:false, b:false},
  {f:"Autonomous 24/7 bid management",                  k:true,  m:false, b:false},
  {f:"Real-time fraud & IVT blocking",                  k:true,  m:false, b:"partial"},
  {f:"Multi-model AI routing (SyncBrain)",              k:true,  m:false, b:false},
  {f:"Data-driven attribution modeling",                k:true,  m:true,  b:"partial"},
  {f:"Marketing Mix Modelling (MMM)",                   k:true,  m:false, b:false},
  {f:"Virtual card per-campaign spend control",         k:true,  m:false, b:false},
  {f:"Immutable SOC2-compliant audit log",              k:true,  m:false, b:false},
];

const PLANS = [
  {name:"Starter",  price:690,  color:K.t3,   desc:"Individuals & lean teams",  cta:"Start Free",    hot:false},
  {name:"Growth",   price:2000, color:K.blue,  desc:"Scaling media teams",        cta:"Start Free",    hot:true },
  {name:"Enterprise",price:null,color:K.gold,  desc:"Custom infrastructure",      cta:"Talk to Sales", hot:false},
];

export default function HomePage() {
  const router = useRouter();
  const [termIdx, setTermIdx]     = useState(0);
  const [activeQ, setActiveQ]     = useState(0);
  const [annual, setAnnual]       = useState(true);
  const [visible, setVisible]     = useState(false);

  useEffect(() => { setTimeout(()=>setVisible(true),60); }, []);
  useEffect(() => {
    const iv = setInterval(()=>setTermIdx(i=>i<TERMINAL.length?i+1:i), 430);
    return ()=>clearInterval(iv);
  }, []);
  useEffect(() => {
    const iv = setInterval(()=>setActiveQ(i=>(i+1)%TESTIMONIALS.length), 6000);
    return ()=>clearInterval(iv);
  }, []);

  const Check = ({v}:{v:boolean|string}) => (
    <div className="text-center">
      {v===true ?       <span className="text-kmint text-[15px]">✓</span>
      :v==="partial" ? <span className="font-mono text-[9px] text-kwarn">PARTIAL</span>
      :                <span className="text-t4 text-[14px]">—</span>}
    </div>
  );

  return (
    <MarketingLayout>

      {/* ── LIVE TICKER ──────────────────────────────── */}
      <div className="h-8 bg-[#030308] border-b border-g800 flex items-center overflow-hidden">
        <div className="flex items-center gap-1.5 px-[18px] border-r border-g800 h-full shrink-0">
          <span className="animate-kdls-pulse" style={{width:6,height:6,borderRadius:"50%",background:K.mint,display:"inline-block"}}/>
          <span className="font-mono text-[8px] tracking-[0.2em] text-kmint font-bold">LIVE</span>
        </div>
        <div className="ticker-track flex h-full items-center">
          {[...TICKER,...TICKER].map((item,i)=>(
            <div key={i} className="flex items-center gap-2.5 px-[28px] border-r border-g800 h-full shrink-0">
              <span className="font-mono text-[9px] tracking-widest text-t4">{item.label}</span>
              <span style={{fontFamily:K.mono,fontSize:11,fontWeight:700,color:item.color}}>{item.value}</span>
            </div>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-[5px] px-[18px] border-l border-g800 h-full shrink-0 ml-auto">
          <span style={{width:6,height:6,borderRadius:"50%",background:K.mint,display:"inline-block"}}/>
          <span className="font-mono text-[8px] tracking-[0.1em] text-t4">ALL SYSTEMS NOMINAL</span>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative flex flex-col items-center overflow-hidden px-4 sm:px-6 md:px-12" style={{background:K.void, paddingTop:"clamp(48px,10vw,100px)", paddingBottom:"clamp(48px,8vw,100px)"}}>
        {/* Grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)`,backgroundSize:"56px 56px",WebkitMaskImage:"radial-gradient(ellipse 90% 70% at 50% 0%,black 0%,transparent 80%)",maskImage:"radial-gradient(ellipse 90% 70% at 50% 0%,black 0%,transparent 80%)",pointerEvents:"none"}}/>
        {/* Glows */}
        <div style={{position:"absolute",width:900,height:600,top:-100,left:"50%",transform:"translateX(-50%)",background:"radial-gradient(ellipse,rgba(0,92,255,0.11) 0%,transparent 65%)",filter:"blur(80px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",width:400,height:400,top:200,right:-100,background:"radial-gradient(circle,rgba(49,243,195,0.05) 0%,transparent 70%)",filter:"blur(60px)",pointerEvents:"none"}}/>

        {/* Content */}
        <div className="relative z-[1] text-center max-w-[1000px]" style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(22px)",transition:"all 0.85s cubic-bezier(0.16,1,0.3,1)"}}>
          {/* Eyebrow */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-kdls px-3 sm:px-4 py-[7px] mb-8 md:mb-10 max-w-full" style={{background:"rgba(0,92,255,0.07)",border:`1px solid rgba(0,92,255,0.18)`}}>
            <span className="animate-kdls-pulse shrink-0" style={{width:6,height:6,borderRadius:"50%",background:K.mint,display:"inline-block"}}/>
            <span className="text-center" style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.12em",color:K.blue4,fontWeight:600}}>AUTONOMOUS LTV CAMPAIGN EXECUTION · ENTERPRISE-GRADE · SOC2 TYPE II</span>
          </div>

          {/* Headline */}
          <h1 className="font-mono font-bold text-[clamp(28px,7vw,82px)] leading-none tracking-[-0.045em] mb-[30px] break-words">
            <span className="block text-[#7070a0] mb-[3px]">Your ad platforms are</span>
            <span className="block text-[#ccccdd] mb-[3px]">learning from</span>
            <span className="block" style={{background:`linear-gradient(110deg,${K.blue} 0%,#5599FF 40%,${K.mint} 100%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              the wrong signal.
            </span>
          </h1>

          {/* Sub */}
          <p className="max-w-[580px] mx-auto mb-[36px] md:mb-[46px] font-[300] leading-[1.8] tracking-[-0.01em] text-[#666688]" style={{fontFamily:"Inter,system-ui,sans-serif",fontSize:"clamp(14px,2.5vw,18px)"}}>
            KIKI intercepts every conversion, predicts 90-day customer LTV with ML, and feeds enriched signals to Meta, Google, TikTok, and 11 other platforms —{" "}
            <span style={{color:"#8888aa"}}>before they see the raw order value.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3 mb-[14px]">
            <Button size="xl" onClick={()=>router.push("/auth/login")}>START FREE TRIAL →</Button>
            <Button variant="secondary" size="xl" onClick={()=>router.push("/demo")}>WATCH 3-MIN DEMO ▸</Button>
          </div>
          <p className="font-mono text-[9px] tracking-[0.12em] text-t4">
            NO CREDIT CARD &nbsp;·&nbsp; 14-DAY TRIAL &nbsp;·&nbsp; SOC2 TYPE II &nbsp;·&nbsp; GDPR &amp; CCPA
          </p>
        </div>

        {/* ── TERMINAL ─────────────────────────────────── */}
        <div className="relative z-[1] mt-[40px] md:mt-[72px] w-full max-w-[900px] rounded-kdls overflow-hidden bg-[#04040D]" style={{border:`1px solid ${K.g700}`,boxShadow:"0 40px 100px rgba(0,0,0,0.75),0 0 0 1px rgba(255,255,255,0.04)"}}>
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-[18px] py-3 bg-[#070710] border-b border-g800">
            <div className="flex gap-1.5">
              {[K.danger,K.warn,K.pos].map((c,i)=><div key={i} style={{width:11,height:11,borderRadius:"50%",background:c,opacity:0.75}}/>)}
            </div>
            <span className="flex-1 text-center font-mono text-[10px] text-t4 truncate">kiki-capi-gateway<span className="hidden sm:inline"> &nbsp;·&nbsp; production &nbsp;·&nbsp; tenant: acme-corp</span></span>
            <div className="flex items-center gap-[5px]">
              <span className="animate-kdls-pulse" style={{width:6,height:6,borderRadius:"50%",background:K.mint,display:"inline-block"}}/>
              <span className="font-mono text-[9px] text-kmint">1.2M events/day</span>
            </div>
          </div>
          {/* Column headers */}
          <div className="grid grid-cols-[60px_90px_50px_1fr] md:grid-cols-[100px_130px_66px_1fr] px-3 md:px-5 pt-[5px] pb-1 bg-[#060610]" style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
            {["TIMESTAMP","SERVICE","LEVEL","OUTPUT"].map(h=>(
              <span key={h} className="font-mono text-[7px] md:text-[8px] tracking-[0.14em] text-t4">{h}</span>
            ))}
          </div>
          {/* Log lines */}
          <div className="px-3 md:px-5 pt-[14px] pb-5 min-h-[190px] overflow-x-auto">
            {TERMINAL.slice(0,termIdx).map((line,i)=>(
              <div key={i} className="grid grid-cols-[60px_90px_50px_1fr] md:grid-cols-[100px_130px_66px_1fr] items-baseline" style={{lineHeight:1.95}}>
                <span className="font-mono text-[8px] md:text-[10px] text-[#2a2a44]">{line.ts}</span>
                <span className="font-mono text-[8px] md:text-[10px] text-t3 truncate">{line.svc}</span>
                <span style={{fontFamily:K.mono,fontSize:10,fontWeight:700,color:line.color}}>{line.lvl}</span>
                {line.special?(
                  <span className="font-mono text-[11px]">
                    <span style={{color:K.t3}}>order=</span><span style={{color:"#8888aa"}}>149.00</span>
                    <span style={{color:K.t4}}> → </span>
                    <span style={{color:K.mint,fontWeight:700}}>ltv_signal=639.20</span>
                    <span style={{color:K.t4}}>{"  "}</span>
                    <span style={{color:K.mint}}>uplift=</span><span style={{color:K.mint,fontWeight:700}}>4.29×</span>
                    <span style={{color:K.t4}}>{"  "}</span>
                    <span style={{color:K.gold}}>confidence=0.94</span>
                  </span>
                ):(
                  <span style={{fontFamily:K.mono,fontSize:11,color:i===3?K.gold:K.t3}}>{line.txt}</span>
                )}
              </div>
            ))}
            {termIdx>=TERMINAL.length&&<span style={{color:K.blue4,fontWeight:700}} className="animate-kdls-pulse">▋</span>}
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-[1] w-full max-w-[900px] flex flex-wrap overflow-hidden" style={{background:"#050510",border:`1px solid ${K.g800}`,borderTop:`1px solid ${K.g700}`}}>
          {[["8","PLATFORMS"],["28","SIGNAL FEATURES"],["5","AI AGENTS"],["4","LTV TIERS"],["<100ms","ENRICHMENT P99"]].map(([v,l],i,arr)=>(
            <div key={l} className="stats-bar-item flex-1 min-w-[calc(33%-1px)] sm:min-w-[140px] py-4 px-[18px] text-center" style={{borderRight:i<arr.length-1?`1px solid ${K.g800}`:"none",borderBottom:`1px solid ${K.g800}`}}>
              <div className="font-mono font-bold text-[clamp(16px,3vw,20px)] text-t1 tracking-[-0.02em]">{v}</div>
              <div className="font-mono text-[8px] tracking-[0.14em] text-t4 mt-[5px]">{l}</div>
            </div>
          ))}
        </div>

        {/* Platform logos */}
        <div className="relative z-[1] mt-[clamp(20px,4vw,44px)] w-full max-w-[900px] text-center px-2">
          <p className="font-mono text-[8px] tracking-[0.18em] text-t4 mb-4.5 break-words">ENRICHES SIGNALS ACROSS 14 AD PLATFORMS</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {PLATFORMS.map(p=>{
              const c=PLATFORM_COLORS[p]||K.t3;
              return(
                <div key={p} className="flex items-center gap-[7px] py-[6px] px-3 rounded-kdls cursor-default transition-all duration-200" style={{background:`${c}08`,border:`1px solid ${c}18`}}
                  onMouseEnter={e=>{(e.currentTarget.style.background=`${c}14`);(e.currentTarget.style.borderColor=`${c}40`);}}
                  onMouseLeave={e=>{(e.currentTarget.style.background=`${c}08`);(e.currentTarget.style.borderColor=`${c}18`);}}>
                  <span className="font-mono text-[9px] font-bold" style={{color:c}}>{p[0]}</span>
                  <span className="font-mono text-[9px] text-[#555577]">{p}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section className="marketing-section px-4 sm:px-6 md:px-12 bg-[#04040D]" style={{borderTop:`1px solid ${K.g800}`, paddingTop:"clamp(60px,8vw,100px)", paddingBottom:"clamp(60px,8vw,100px)"}}>
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[9px] tracking-[0.2em] text-t4 mb-3.5 break-words">HOW IT WORKS</p>
            <h2 className="font-mono font-bold text-[clamp(24px,4vw,44px)] text-t1 tracking-[-0.035em] break-words">
              From conversion to enriched signal in 341ms.
            </h2>
          </div>
          <div className="flex flex-col md:flex-row relative gap-8 md:gap-0">
            <div className="hidden md:block absolute top-6 left-[8%] right-[8%] h-px" style={{background:`linear-gradient(90deg,transparent,${K.g700},${K.g700},${K.g700},transparent)`}}/>
            {HOW.map((step)=>(
              <div key={step.s} className="flex-1 text-center px-[10px]">
                <div className="w-12 h-12 rounded-kdls flex items-center justify-center mx-auto mb-4 relative z-[1] font-mono font-bold text-[13px]" style={{background:`${step.c}10`,border:`1px solid ${step.c}25`,color:step.c}}>{step.s}</div>
                <p className="font-mono font-bold text-[12px] mb-2 tracking-[0.04em]" style={{color:step.c}}>{step.t}</p>
                <p className="font-sans text-[12px] text-t4 leading-[1.65]">{step.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ──────────────────────────────── */}
      <section className="marketing-section px-4 sm:px-6 md:px-12" style={{borderTop:`1px solid ${K.g800}`,background:K.void, paddingTop:"clamp(60px,8vw,100px)", paddingBottom:"clamp(60px,8vw,100px)"}}>
        <div className="max-w-[1060px] mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[9px] tracking-[0.2em] text-t4 mb-3.5">THE PLATFORM</p>
            <h2 className="font-mono font-bold text-[clamp(24px,4vw,44px)] text-t1 tracking-[-0.035em]">Every tool your media team needs.</h2>
            <p className="font-sans text-[13px] text-t3 mt-3">
              <a href="/features" className="no-underline" style={{ color: K.blue4 }}>View all 25 features →</a>
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-g800" style={{border:`1px solid ${K.g800}`}}>
            {FEATURES.map((f,i)=>(
              <div key={i} className="p-10 relative overflow-hidden cursor-default transition-colors duration-200" style={{background:K.g900}}
                onMouseEnter={e=>(e.currentTarget.style.background=K.g850)} onMouseLeave={e=>(e.currentTarget.style.background=K.g900)}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{background:`linear-gradient(90deg,transparent,${f.accent}80,transparent)`}}/>
                <div className="absolute -right-5 -top-5 w-[120px] h-[120px] rounded-full" style={{background:`radial-gradient(circle,${f.accent}06 0%,transparent 70%)`}}/>
                <div className="flex items-center gap-[10px] mb-5">
                  <div className="w-9 h-9 rounded-kdls flex items-center justify-center text-base shrink-0" style={{background:`${f.accent}12`,color:f.accent}}>{f.icon}</div>
                  <p className="font-mono text-[8px] tracking-[0.16em] opacity-70" style={{color:f.accent}}>{f.n} · {f.tag}</p>
                </div>
                <h3 className="font-mono font-bold text-[clamp(14px,2vw,19px)] text-t1 mb-3.5 leading-[1.2] tracking-[-0.02em] whitespace-pre-line">{f.title}</h3>
                <p className="font-sans text-[13px] text-t3 leading-[1.75] mb-6">{f.body}</p>
                <div className="flex gap-px bg-g800 rounded-kdls overflow-hidden mb-4">
                  {f.proof.map(p=>(
                    <div key={p.l} className="flex-1 py-[10px] px-3 bg-g850 text-center">
                      <p className="font-mono text-sm font-bold" style={{color:f.accent}}>{p.v}</p>
                      <p className="font-mono text-[8px] text-t4 mt-[3px] tracking-[0.06em]">{p.l}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => router.push(f.href)}
                  className="font-mono text-[11px] font-semibold tracking-[0.02em] px-4 py-2.5 rounded-sm transition-colors duration-150 cursor-pointer no-underline inline-block"
                  style={{ background:`${f.accent}15`, color:f.accent, border:`1px solid ${f.accent}30` }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${f.accent}25` }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${f.accent}15` }}
                >
                  Learn more &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ───────────────────────────────── */}
      <section className="marketing-section px-4 sm:px-6 md:px-12 bg-[#04040D]" style={{borderTop:`1px solid ${K.g800}`, paddingTop:"clamp(60px,8vw,100px)", paddingBottom:"clamp(60px,8vw,100px)"}}>
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[9px] tracking-[0.2em] text-t4 mb-3.5">RESULTS</p>
            <h2 className="font-mono font-bold text-[clamp(24px,4vw,40px)] text-t1 tracking-[-0.03em]">Measured in revenue. Not vanity metrics.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-g800 mb-6">
            {PROOF.map((p,i)=>(
              <div key={i} className="p-8 text-center cursor-default transition-all duration-[250ms] relative overflow-hidden" style={{background:K.g900}}
                onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);(e.currentTarget.style.transform="translateY(-3px)");}}
                onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);(e.currentTarget.style.transform="none");}}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{background:`linear-gradient(90deg,transparent,${p.accent}80,transparent)`}}/>
                <p className="font-mono text-[8px] tracking-[0.14em] text-t4 mb-3.5">{p.co}</p>
                <p className="font-mono text-[38px] font-bold tracking-[-0.03em] leading-none mb-[10px]" style={{color:p.accent}}>{p.stat}</p>
                <p className="font-sans text-[12px] text-t4 leading-[1.5]">{p.sub}</p>
              </div>
            ))}
          </div>
          {/* Testimonial rotator */}
          <div className="p-[44px] bg-g900 rounded-kdls relative overflow-hidden" style={{border:`1px solid ${K.g800}`}}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{background:`linear-gradient(90deg,transparent,${K.blue}50,transparent)`}}/>
            <div className="max-w-[660px] mx-auto text-center">
              <div className="text-[28px] text-t4 mb-4.5 font-['Georgia,serif'] leading-none">"</div>
              {TESTIMONIALS.map((t,i)=>(
                <div key={i} style={{display:i===activeQ?"block":"none"}}>
                  <p className="font-sans text-[15px] text-t2 leading-[1.82] italic mb-6">"{t.q}"</p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-[11px]" style={{background:K.blueD,color:K.blue4}}>{t.at.split(" ").map(w=>w[0]).join("")}</div>
                    <div className="text-left">
                      <p className="font-mono text-[11px] font-bold text-t1">{t.who}</p>
                      <p className="font-mono text-[10px] text-t4">{t.at}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-1.5 justify-center mt-5">
                {TESTIMONIALS.map((_,i)=>(
                  <button key={i} onClick={()=>setActiveQ(i)} style={{width:i===activeQ?20:6,height:6,borderRadius:3,background:i===activeQ?K.blue:K.g700,border:"none",cursor:"pointer",transition:"all 0.3s"}}/>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VS COMPARISON ──────────────────────────────── */}
      <section className="marketing-section px-4 sm:px-6 md:px-12" style={{borderTop:`1px solid ${K.g800}`,background:K.void, paddingTop:"clamp(48px,6vw,80px)", paddingBottom:"clamp(48px,6vw,80px)"}}>
        <div className="max-w-[860px] mx-auto">
          <div className="text-center mb-10">
            <p className="font-mono text-[9px] tracking-[0.2em] text-t4 mb-3.5">WHY KIKI</p>
            <h2 className="font-mono font-bold text-[clamp(22px,3.5vw,38px)] text-t1 tracking-[-0.03em]">What you get vs. the alternatives.</h2>
          </div>
          <div className="rounded-kdls overflow-hidden" style={{border:`1px solid ${K.g800}`}}>
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-[1fr_90px_110px_90px] bg-g950">
              <div className="py-[13px] px-5"><span className="font-mono text-[9px] tracking-widest text-t4">CAPABILITY</span></div>
              {[{l:"KIKI",c:K.blue},{l:"MANUAL",c:K.t4},{l:"BASIC TOOLS",c:K.t4}].map(h=>(
                <div key={h.l} className="py-[13px] px-3 text-center" style={{borderLeft:`1px solid ${K.g800}`}}>
                  <span className="font-mono text-[9px] tracking-widest" style={{color:h.c}}>{h.l}</span>
                </div>
              ))}
            </div>
            {COMPARE.map((row,i)=>(
              <div key={i} className="grid grid-cols-[1fr_90px_110px_90px]" style={{background:i%2===0?K.g900:K.g950,borderTop:`1px solid ${K.g800}`}}>
                <div className="py-[13px] px-5 flex items-center gap-[10px]">
                  <span className="text-kmint text-[11px] shrink-0">✓</span>
                  <span className="font-sans text-[12px] text-t2">{row.f}</span>
                </div>
                {[row.k,row.m,row.b].map((v,j)=>(
                  <div key={j} className="py-[13px] px-3" style={{borderLeft:`1px solid ${K.g800}`}}>
                    <Check v={v}/>
                  </div>
                ))}
              </div>
            ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ────────────────────────────── */}
      <section className="marketing-section px-4 sm:px-6 md:px-12 bg-[#04040D]" style={{borderTop:`1px solid ${K.g800}`, paddingTop:"clamp(48px,6vw,80px)", paddingBottom:"clamp(48px,6vw,80px)"}}>
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <p className="font-mono text-[9px] tracking-[0.2em] text-t4 mb-3.5">PRICING</p>
            <h2 className="font-mono font-bold text-[clamp(22px,3.5vw,38px)] text-t1 tracking-[-0.03em] mb-6">Simple, transparent pricing.</h2>
            <div className="inline-flex gap-1 bg-g850 rounded-kdls p-1">
              {["Annual (save 20%)","Monthly"].map((l,i)=>(
                <button key={l} onClick={()=>setAnnual(i===0)} style={{padding:"7px 16px",fontFamily:K.mono,fontSize:10,fontWeight:600,borderRadius:2,border:"none",background:annual===(i===0)?K.g700:"transparent",color:annual===(i===0)?K.t1:K.t3,cursor:"pointer",transition:"all 0.15s"}}>{l}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {PLANS.map(p=>(
              <div key={p.name}
                style={{padding:28,background:p.hot?K.blueD:K.g900,border:`${p.hot?2:1}px solid ${p.hot?K.blue:K.g800}`,borderRadius:2,position:"relative",transition:"all 0.2s"}}
                onMouseEnter={e=>{if(!p.hot)(e.currentTarget.style.background=K.g850);}}
                onMouseLeave={e=>{if(!p.hot)(e.currentTarget.style.background=K.g900);}}>
                {p.hot&&<div className="absolute -top-[11px] left-1/2 -translate-x-1/2"><Badge color={K.blue}>MOST POPULAR</Badge></div>}
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{background:`linear-gradient(90deg,transparent,${p.color}50,transparent)`}}/>
                <p className="font-mono font-bold text-lg text-t1 mb-1">{p.name}</p>
                <p className="font-sans text-[12px] text-t3 mb-5">{p.desc}</p>
                {p.price!==null?(
                  <div className="mb-[22px]">
                    <span className="font-mono text-[36px] font-bold tracking-[-0.02em]" style={{color:p.hot?K.blue4:K.t1}}>${annual?Math.round(p.price*0.8).toLocaleString():p.price.toLocaleString()}</span>
                    <span className="font-mono text-[13px] text-t3">/mo</span>
                    {annual&&<p className="font-mono text-[9px] text-kmint mt-[3px]">BILLED ANNUALLY · SAVE ${(p.price*0.2*12).toLocaleString()}/YR</p>}
                  </div>
                ):(
                  <p className="font-mono text-[28px] font-bold text-kgold mb-[22px]">Custom</p>
                )}
                <Button variant={p.hot?"primary":p.price===null?"gold":"secondary"} size="md" full onClick={()=>router.push(p.price===null?"/contact":"/auth/login")}>
                  {p.cta} →
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center font-mono text-[10px] text-t4">
            All plans include signal enrichment, fraud protection, and 14-day free trial.{" "}
            <a href="/pricing" className="no-underline" style={{color:K.blue4}}>See full comparison →</a>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────── */}
      <section className="marketing-hero px-4 sm:px-6 md:px-12 text-center relative overflow-hidden" style={{borderTop:`1px solid ${K.g800}`,background:K.void, paddingTop:"clamp(64px,10vw,120px)", paddingBottom:"clamp(64px,10vw,120px)"}}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] blur-[80px] pointer-events-none" style={{background:"radial-gradient(ellipse,rgba(0,92,255,0.10) 0%,transparent 65%)"}}/>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] blur-[60px] pointer-events-none" style={{background:"radial-gradient(ellipse,rgba(49,243,195,0.06) 0%,transparent 70%)"}}/>
        <div className="relative z-[1] max-w-[640px] mx-auto">
          <p className="font-mono text-[9px] tracking-[0.2em] text-t4 mb-5 break-words">GET STARTED IN UNDER 10 MINUTES</p>
          <h2 className="font-mono font-bold text-[clamp(24px,5.5vw,58px)] text-t1 mb-5 tracking-[-0.045em] leading-[1.02] break-words">
            Your campaigns are teaching<br className="hidden sm:block"/>platforms the <span className="text-kblue">wrong lesson.</span>
          </h2>
          <p className="font-sans text-base text-t3 leading-[1.75] max-w-[500px] mx-auto mb-10 px-4">
            Connect your first ad account in 15 minutes. KIKI starts enriching every conversion immediately.
          </p>
          <div className="flex gap-3 justify-center flex-wrap mb-6">
            <Button size="xl" onClick={()=>router.push("/auth/login")}>START FREE — NO CREDIT CARD →</Button>
            <Button variant="secondary" size="xl" onClick={()=>router.push("/contact")}>BOOK ENTERPRISE DEMO</Button>
          </div>
          <div className="flex gap-6 justify-center flex-wrap">
            {["SOC2 Type II","GDPR & CCPA","14-day free trial","No credit card"].map(t=>(
              <div key={t} className="flex items-center gap-1.5">
                <span className="text-kmint font-mono text-xs">✓</span>
                <span className="font-mono text-[10px] text-t3 tracking-[0.04em]">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </MarketingLayout>
  );
}

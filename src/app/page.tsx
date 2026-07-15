"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";

const TICKER = [
  { label:"PLATFORM ROAS",    value:"4.23×",  color:K.mint  },
  { label:"AVG LTV SIGNAL",   value:"$639",   color:K.mint  },
  { label:"CAC REDUCTION",    value:"−38%",   color:K.mint  },
  { label:"SIGNALS TODAY",    value:"1.2M",   color:K.teal  },
  { label:"IVT BLOCKED",      value:"99.1%",  color:K.teal  },
  { label:"SPEND MANAGED",    value:"$2.4B",  color:K.gold  },
  { label:"AI DECISIONS/MIN", value:"23.4",   color:K.blue  },
  { label:"LATENCY P99",      value:"48ms",   color:K.blue  },
  { label:"PLATFORM UPTIME",  value:"99.97%", color:K.mint  },
  { label:"ENRICHMENT RATE",  value:"94.2%",  color:K.teal  },
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
    proof:[{v:"4.29×",l:"avg LTV uplift"},{v:"38ms",l:"median latency"},{v:"R²=0.91",l:"model accuracy"}] },
  { n:"02",tag:"SYNCBRAIN™",icon:"⬡",accent:K.green,
    title:"Seven AI models.\nOne routing brain.",
    body:"GPT-4o for decisions. Claude for reasoning. Gemini Flash for speed. LLaMA for cost. SyncBrain selects in 12ms, budget-aware, quality-first.",
    proof:[{v:"7",l:"AI models"},{v:"12ms",l:"routing latency"},{v:"45%",l:"cost reduction"}] },
  { n:"03",tag:"AUTONOMOUS AGENTS",icon:"⚡",accent:K.blue,
    title:"Bidding decisions.\nAll day. Every day.",
    body:"Six specialized agents — Bidding, Creative, Smart Pacing, Signals, OaaS, SyncBrain — execute within your guardrails and log every action.",
    proof:[{v:"6",l:"AI agents"},{v:"847",l:"decisions/day"},{v:"0h",l:"manual bidding"}] },
  { n:"04",tag:"FRAUD & IVT",icon:"⬗",accent:K.danger,
    title:"Bot traffic poisons\nyour LTV model.",
    body:"IVT contaminates your training data — your model learns to find bots. KIKI blocks fraud before enrichment using IP, fingerprint, and velocity.",
    proof:[{v:"99.2%",l:"detection rate"},{v:"0.03%",l:"false positives"},{v:"18ms",l:"score latency"}] },
];

const HOW = [
  {s:"01",t:"Connect",  c:K.teal,  b:"15-minute CAPI or pixel integration with any stack."},
  {s:"02",t:"Intercept",c:K.blue,  b:"Every conversion caught server-side before platform delivery."},
  {s:"03",t:"Enrich",   c:K.gold,  b:"ML model predicts 90-day LTV in 38ms. Fraud checked. Consent validated."},
  {s:"04",t:"Deliver",  c:K.mint,  b:"Enriched signal sent to all 14 platforms simultaneously."},
  {s:"05",t:"Optimize", c:K.oaas,  b:"AI agents adjust bids, budgets, and creatives — autonomously."},
];

const PROOF = [
  {co:"ZARA DIGITAL",  stat:"+41%",  sub:"LTV per acquisition in 60 days",      accent:K.mint },
  {co:"FINEX CAPITAL", stat:"3.8×",  sub:"ROAS on acquisition campaigns",        accent:K.blue },
  {co:"BLOOM HEALTH",  stat:"−38%",  sub:"CAC with same revenue volume",         accent:K.gold },
  {co:"NORDLUX GROUP", stat:"$2.1M", sub:"Additional monthly revenue from signal",accent:K.oaas },
];

const TESTIMONIALS = [
  { q:"We were teaching Meta to find our worst customers for 3 years. KIKI fixed that in 60 days. LTV per acquisition up 41%, CAC down 22%.", who:"CMO", at:"Zara Digital" },
  { q:"The Bidding Agent makes 847 bid adjustments per day. My team focuses on strategy. ROAS improved 58%. I can't imagine going back.", who:"Head of Growth", at:"Finex Capital" },
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
  {name:"Starter",  price:490,  color:K.t3,   desc:"Individuals & lean teams",  cta:"Start Free",    hot:false},
  {name:"Growth",   price:1800, color:K.blue,  desc:"Scaling media teams",        cta:"Start Free",    hot:true },
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
    <div style={{textAlign:"center"}}>
      {v===true ?       <span style={{color:K.mint,fontSize:15}}>✓</span>
      :v==="partial" ? <span style={{fontFamily:K.mono,fontSize:9,color:K.warn}}>PARTIAL</span>
      :                <span style={{color:K.t4,fontSize:14}}>—</span>}
    </div>
  );

  return (
    <MarketingLayout>

      {/* ── LIVE TICKER ──────────────────────────────── */}
      <div style={{height:32,background:"#030308",borderBottom:`1px solid ${K.g800}`,display:"flex",alignItems:"center",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 18px",borderRight:`1px solid ${K.g800}`,height:"100%",flexShrink:0}}>
          <span className="animate-kdls-pulse" style={{width:6,height:6,borderRadius:"50%",background:K.mint,display:"inline-block"}}/>
          <span style={{fontFamily:K.mono,fontSize:8,letterSpacing:"0.2em",color:K.mint,fontWeight:700}}>LIVE</span>
        </div>
        <div className="ticker-track" style={{display:"flex",height:"100%",alignItems:"center"}}>
          {[...TICKER,...TICKER].map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"0 28px",borderRight:`1px solid ${K.g800}`,height:"100%",flexShrink:0}}>
              <span style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.1em",color:K.t4}}>{item.label}</span>
              <span style={{fontFamily:K.mono,fontSize:11,fontWeight:700,color:item.color}}>{item.value}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"0 18px",borderLeft:`1px solid ${K.g800}`,height:"100%",flexShrink:0,marginLeft:"auto"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:K.mint,display:"inline-block"}}/>
          <span style={{fontFamily:K.mono,fontSize:8,letterSpacing:"0.1em",color:K.t4}}>ALL SYSTEMS NOMINAL</span>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={{minHeight:"100vh",padding:"90px 48px 80px",position:"relative",display:"flex",flexDirection:"column",alignItems:"center",overflow:"hidden",background:K.void}}>
        {/* Grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)`,backgroundSize:"56px 56px",WebkitMaskImage:"radial-gradient(ellipse 90% 70% at 50% 0%,black 0%,transparent 80%)",maskImage:"radial-gradient(ellipse 90% 70% at 50% 0%,black 0%,transparent 80%)",pointerEvents:"none"}}/>
        {/* Glows */}
        <div style={{position:"absolute",width:900,height:600,top:-100,left:"50%",transform:"translateX(-50%)",background:"radial-gradient(ellipse,rgba(0,92,255,0.11) 0%,transparent 65%)",filter:"blur(80px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",width:400,height:400,top:200,right:-100,background:"radial-gradient(circle,rgba(49,243,195,0.05) 0%,transparent 70%)",filter:"blur(60px)",pointerEvents:"none"}}/>

        {/* Content */}
        <div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:1000,opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(22px)",transition:"all 0.85s cubic-bezier(0.16,1,0.3,1)"}}>
          {/* Eyebrow */}
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,92,255,0.07)",border:`1px solid rgba(0,92,255,0.18)`,borderRadius:2,padding:"7px 16px",marginBottom:40}}>
            <span className="animate-kdls-pulse" style={{width:6,height:6,borderRadius:"50%",background:K.mint,display:"inline-block"}}/>
            <span style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.15em",color:K.blue4,fontWeight:600}}>AUTONOMOUS LTV CAMPAIGN EXECUTION · ENTERPRISE-GRADE · SOC2 TYPE II</span>
          </div>

          {/* Headline */}
          <h1 style={{fontFamily:K.mono,fontWeight:700,fontSize:"clamp(40px,7vw,82px)",lineHeight:1.0,letterSpacing:"-0.045em",margin:"0 0 30px"}}>
            <span style={{display:"block",color:"#7070a0",marginBottom:3}}>Your ad platforms are</span>
            <span style={{display:"block",color:"#ccccdd",marginBottom:3}}>learning from</span>
            <span style={{display:"block",background:`linear-gradient(110deg,${K.blue} 0%,#5599FF 40%,${K.mint} 100%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              the wrong signal.
            </span>
          </h1>

          {/* Sub */}
          <p style={{fontFamily:"Inter,system-ui,sans-serif",fontSize:18,fontWeight:300,color:"#666688",lineHeight:1.8,maxWidth:580,margin:"0 auto 46px",letterSpacing:"-0.01em"}}>
            KIKI intercepts every conversion, predicts 90-day customer LTV with ML, and feeds enriched signals to Meta, Google, TikTok, and 11 other platforms —{" "}
            <span style={{color:"#8888aa"}}>before they see the raw order value.</span>
          </p>

          {/* CTAs */}
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:14}}>
            <Button size="xl" onClick={()=>router.push("/auth/login")}>START FREE TRIAL →</Button>
            <Button variant="secondary" size="xl" onClick={()=>router.push("/features")}>WATCH 3-MIN DEMO ▸</Button>
          </div>
          <p style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.12em",color:K.t4}}>
            NO CREDIT CARD &nbsp;·&nbsp; 14-DAY TRIAL &nbsp;·&nbsp; SOC2 TYPE II &nbsp;·&nbsp; GDPR &amp; CCPA
          </p>
        </div>

        {/* ── TERMINAL ─────────────────────────────────── */}
        <div style={{position:"relative",zIndex:1,marginTop:72,width:"100%",maxWidth:900,border:`1px solid ${K.g700}`,borderRadius:4,background:"#04040D",overflow:"hidden",boxShadow:"0 40px 100px rgba(0,0,0,0.75),0 0 0 1px rgba(255,255,255,0.04)"}}>
          {/* Chrome bar */}
          <div style={{display:"flex",alignItems:"center",padding:"12px 18px",background:"#070710",borderBottom:`1px solid ${K.g800}`,gap:8}}>
            <div style={{display:"flex",gap:6}}>
              {[K.danger,K.warn,K.pos].map((c,i)=><div key={i} style={{width:11,height:11,borderRadius:"50%",background:c,opacity:0.75}}/>)}
            </div>
            <span style={{flex:1,textAlign:"center",fontFamily:K.mono,fontSize:10,color:K.t4}}>kiki-capi-gateway &nbsp;·&nbsp; production &nbsp;·&nbsp; tenant: acme-corp</span>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span className="animate-kdls-pulse" style={{width:6,height:6,borderRadius:"50%",background:K.mint,display:"inline-block"}}/>
              <span style={{fontFamily:K.mono,fontSize:9,color:K.mint}}>1.2M events/day</span>
            </div>
          </div>
          {/* Column headers */}
          <div style={{display:"grid",gridTemplateColumns:"100px 130px 66px 1fr",padding:"5px 20px 4px",background:"#060610",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
            {["TIMESTAMP","SERVICE","LEVEL","OUTPUT"].map(h=>(
              <span key={h} style={{fontFamily:K.mono,fontSize:8,letterSpacing:"0.14em",color:K.t4}}>{h}</span>
            ))}
          </div>
          {/* Log lines */}
          <div style={{padding:"14px 20px 20px",minHeight:190}}>
            {TERMINAL.slice(0,termIdx).map((line,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"100px 130px 66px 1fr",alignItems:"baseline",lineHeight:1.95}}>
                <span style={{fontFamily:K.mono,fontSize:10,color:"#2a2a44"}}>{line.ts}</span>
                <span style={{fontFamily:K.mono,fontSize:10,color:K.t3}}>{line.svc}</span>
                <span style={{fontFamily:K.mono,fontSize:10,fontWeight:700,color:line.color}}>{line.lvl}</span>
                {line.special?(
                  <span style={{fontFamily:K.mono,fontSize:11}}>
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
        <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:900,background:"#050510",border:`1px solid ${K.g800}`,borderTop:`1px solid ${K.g700}`,display:"flex",overflow:"hidden"}}>
          {[["$2.4B","AD SPEND MANAGED"],["1.2M","SIGNALS / DAY"],["14","PLATFORM CONNECTORS"],["99.97%","PLATFORM UPTIME"],["38ms","ENRICHMENT LATENCY"]].map(([v,l],i,arr)=>(
            <div key={l} style={{flex:"1 1 0",padding:"16px 18px",textAlign:"center",borderRight:i<arr.length-1?`1px solid ${K.g800}`:"none"}}>
              <div style={{fontFamily:K.mono,fontSize:20,fontWeight:700,color:K.t1,letterSpacing:"-0.02em"}}>{v}</div>
              <div style={{fontFamily:K.mono,fontSize:8,letterSpacing:"0.14em",color:K.t4,marginTop:5}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Platform logos */}
        <div style={{position:"relative",zIndex:1,marginTop:44,width:"100%",maxWidth:900,textAlign:"center"}}>
          <p style={{fontFamily:K.mono,fontSize:8,letterSpacing:"0.18em",color:K.t4,marginBottom:18}}>ENRICHES SIGNALS ACROSS 14 AD PLATFORMS</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
            {PLATFORMS.map(p=>{
              const c=PLATFORM_COLORS[p]||K.t3;
              return(
                <div key={p} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 12px",background:`${c}08`,border:`1px solid ${c}18`,borderRadius:2,cursor:"default",transition:"all 0.2s"}}
                  onMouseEnter={e=>{(e.currentTarget.style.background=`${c}14`);(e.currentTarget.style.borderColor=`${c}40`);}}
                  onMouseLeave={e=>{(e.currentTarget.style.background=`${c}08`);(e.currentTarget.style.borderColor=`${c}18`);}}>
                  <span style={{fontFamily:K.mono,fontSize:9,fontWeight:700,color:c}}>{p[0]}</span>
                  <span style={{fontFamily:K.mono,fontSize:9,color:"#555577"}}>{p}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section style={{padding:"100px 48px",background:"#04040D",borderTop:`1px solid ${K.g800}`}}>
        <div style={{maxWidth:1000,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <p style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.2em",color:K.t4,marginBottom:14}}>HOW IT WORKS</p>
            <h2 style={{fontFamily:K.mono,fontWeight:700,fontSize:"clamp(24px,4vw,44px)",color:K.t1,letterSpacing:"-0.035em"}}>
              From conversion to enriched signal in 341ms.
            </h2>
          </div>
          <div style={{display:"flex",gap:0,position:"relative"}}>
            <div style={{position:"absolute",top:24,left:"8%",right:"8%",height:1,background:`linear-gradient(90deg,transparent,${K.g700},${K.g700},${K.g700},transparent)`}}/>
            {HOW.map((step)=>(
              <div key={step.s} style={{flex:1,textAlign:"center",padding:"0 10px"}}>
                <div style={{width:48,height:48,borderRadius:2,background:`${step.c}10`,border:`1px solid ${step.c}25`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",position:"relative",zIndex:1,fontFamily:K.mono,fontWeight:700,fontSize:13,color:step.c}}>{step.s}</div>
                <p style={{fontFamily:K.mono,fontWeight:700,fontSize:12,color:step.c,marginBottom:8,letterSpacing:"0.04em"}}>{step.t}</p>
                <p style={{fontFamily:"Inter,sans-serif",fontSize:12,color:K.t4,lineHeight:1.65}}>{step.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ──────────────────────────────── */}
      <section style={{padding:"100px 48px",borderTop:`1px solid ${K.g800}`,background:K.void}}>
        <div style={{maxWidth:1060,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <p style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.2em",color:K.t4,marginBottom:14}}>THE PLATFORM</p>
            <h2 style={{fontFamily:K.mono,fontWeight:700,fontSize:"clamp(24px,4vw,44px)",color:K.t1,letterSpacing:"-0.035em"}}>Every tool your media team needs.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:K.g800,border:`1px solid ${K.g800}`}}>
            {FEATURES.map((f,i)=>(
              <div key={i} style={{background:K.g900,padding:40,position:"relative",overflow:"hidden",cursor:"default",transition:"background 0.2s"}}
                onMouseEnter={e=>(e.currentTarget.style.background=K.g850)} onMouseLeave={e=>(e.currentTarget.style.background=K.g900)}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${f.accent}80,transparent)`}}/>
                <div style={{position:"absolute",right:-20,top:-20,width:120,height:120,borderRadius:"50%",background:`radial-gradient(circle,${f.accent}06 0%,transparent 70%)`}}/>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{width:36,height:36,borderRadius:2,background:`${f.accent}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:f.accent,flexShrink:0}}>{f.icon}</div>
                  <p style={{fontFamily:K.mono,fontSize:8,letterSpacing:"0.16em",color:f.accent,opacity:0.7}}>{f.n} · {f.tag}</p>
                </div>
                <h3 style={{fontFamily:K.mono,fontWeight:700,fontSize:"clamp(14px,2vw,19px)",color:K.t1,marginBottom:14,lineHeight:1.2,letterSpacing:"-0.02em",whiteSpace:"pre-line"}}>{f.title}</h3>
                <p style={{fontFamily:"Inter,sans-serif",fontSize:13,color:K.t3,lineHeight:1.75,marginBottom:24}}>{f.body}</p>
                <div style={{display:"flex",gap:1,background:K.g800,borderRadius:2,overflow:"hidden"}}>
                  {f.proof.map(p=>(
                    <div key={p.l} style={{flex:1,padding:"10px 12px",background:K.g850,textAlign:"center"}}>
                      <p style={{fontFamily:K.mono,fontSize:14,fontWeight:700,color:f.accent}}>{p.v}</p>
                      <p style={{fontFamily:K.mono,fontSize:8,color:K.t4,marginTop:3,letterSpacing:"0.06em"}}>{p.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ───────────────────────────────── */}
      <section style={{padding:"100px 48px",background:"#04040D",borderTop:`1px solid ${K.g800}`}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <p style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.2em",color:K.t4,marginBottom:14}}>RESULTS</p>
            <h2 style={{fontFamily:K.mono,fontWeight:700,fontSize:"clamp(24px,4vw,40px)",color:K.t1,letterSpacing:"-0.03em"}}>Measured in revenue. Not vanity metrics.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:K.g800,marginBottom:24}}>
            {PROOF.map((p,i)=>(
              <div key={i} style={{background:K.g900,padding:32,textAlign:"center",cursor:"default",transition:"all 0.25s",position:"relative",overflow:"hidden"}}
                onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);(e.currentTarget.style.transform="translateY(-3px)");}}
                onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);(e.currentTarget.style.transform="none");}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${p.accent}80,transparent)`}}/>
                <p style={{fontFamily:K.mono,fontSize:8,letterSpacing:"0.14em",color:K.t4,marginBottom:14}}>{p.co}</p>
                <p style={{fontFamily:K.mono,fontSize:38,fontWeight:700,color:p.accent,letterSpacing:"-0.03em",lineHeight:1,marginBottom:10}}>{p.stat}</p>
                <p style={{fontFamily:"Inter,sans-serif",fontSize:12,color:K.t4,lineHeight:1.5}}>{p.sub}</p>
              </div>
            ))}
          </div>
          {/* Testimonial rotator */}
          <div style={{padding:44,background:K.g900,border:`1px solid ${K.g800}`,borderRadius:2,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${K.blue}50,transparent)`}}/>
            <div style={{maxWidth:660,margin:"0 auto",textAlign:"center"}}>
              <div style={{fontSize:28,color:K.t4,marginBottom:18,fontFamily:"Georgia,serif",lineHeight:1}}>"</div>
              {TESTIMONIALS.map((t,i)=>(
                <div key={i} style={{display:i===activeQ?"block":"none"}}>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:15,color:K.t2,lineHeight:1.82,fontStyle:"italic",marginBottom:24}}>"{t.q}"</p>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:K.blueD,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:K.mono,fontWeight:700,fontSize:11,color:K.blue4}}>{t.at.split(" ").map(w=>w[0]).join("")}</div>
                    <div style={{textAlign:"left"}}>
                      <p style={{fontFamily:K.mono,fontSize:11,fontWeight:700,color:K.t1}}>{t.who}</p>
                      <p style={{fontFamily:K.mono,fontSize:10,color:K.t4}}>{t.at}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:20}}>
                {TESTIMONIALS.map((_,i)=>(
                  <button key={i} onClick={()=>setActiveQ(i)} style={{width:i===activeQ?20:6,height:6,borderRadius:3,background:i===activeQ?K.blue:K.g700,border:"none",cursor:"pointer",transition:"all 0.3s"}}/>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VS COMPARISON ──────────────────────────────── */}
      <section style={{padding:"80px 48px",borderTop:`1px solid ${K.g800}`,background:K.void}}>
        <div style={{maxWidth:860,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:40}}>
            <p style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.2em",color:K.t4,marginBottom:14}}>WHY KIKI</p>
            <h2 style={{fontFamily:K.mono,fontWeight:700,fontSize:"clamp(22px,3.5vw,38px)",color:K.t1,letterSpacing:"-0.03em"}}>What you get vs. the alternatives.</h2>
          </div>
          <div style={{border:`1px solid ${K.g800}`,borderRadius:2,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 90px 110px 90px",background:K.g950}}>
              <div style={{padding:"13px 20px"}}><span style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.1em",color:K.t4}}>CAPABILITY</span></div>
              {[{l:"KIKI",c:K.blue},{l:"MANUAL",c:K.t4},{l:"BASIC TOOLS",c:K.t4}].map(h=>(
                <div key={h.l} style={{padding:"13px 12px",textAlign:"center",borderLeft:`1px solid ${K.g800}`}}>
                  <span style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.1em",color:h.c}}>{h.l}</span>
                </div>
              ))}
            </div>
            {COMPARE.map((row,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 90px 110px 90px",background:i%2===0?K.g900:K.g950,borderTop:`1px solid ${K.g800}`}}>
                <div style={{padding:"13px 20px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{color:K.mint,fontSize:11,flexShrink:0}}>✓</span>
                  <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:K.t2}}>{row.f}</span>
                </div>
                {[row.k,row.m,row.b].map((v,j)=>(
                  <div key={j} style={{padding:"13px 12px",borderLeft:`1px solid ${K.g800}`}}>
                    <Check v={v}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ────────────────────────────── */}
      <section style={{padding:"80px 48px",background:"#04040D",borderTop:`1px solid ${K.g800}`}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:40}}>
            <p style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.2em",color:K.t4,marginBottom:14}}>PRICING</p>
            <h2 style={{fontFamily:K.mono,fontWeight:700,fontSize:"clamp(22px,3.5vw,38px)",color:K.t1,letterSpacing:"-0.03em",marginBottom:24}}>Simple, transparent pricing.</h2>
            <div style={{display:"inline-flex",gap:4,background:K.g850,borderRadius:2,padding:4}}>
              {["Annual (save 20%)","Monthly"].map((l,i)=>(
                <button key={l} onClick={()=>setAnnual(i===0)} style={{padding:"7px 16px",fontFamily:K.mono,fontSize:10,fontWeight:600,borderRadius:2,border:"none",background:annual===(i===0)?K.g700:"transparent",color:annual===(i===0)?K.t1:K.t3,cursor:"pointer",transition:"all 0.15s"}}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
            {PLANS.map(p=>(
              <div key={p.name}
                style={{padding:28,background:p.hot?K.blueD:K.g900,border:`${p.hot?2:1}px solid ${p.hot?K.blue:K.g800}`,borderRadius:2,position:"relative",transition:"all 0.2s"}}
                onMouseEnter={e=>{if(!p.hot)(e.currentTarget.style.background=K.g850);}}
                onMouseLeave={e=>{if(!p.hot)(e.currentTarget.style.background=K.g900);}}>
                {p.hot&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)"}}><Badge color={K.blue}>MOST POPULAR</Badge></div>}
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${p.color}50,transparent)`}}/>
                <p style={{fontFamily:K.mono,fontWeight:700,fontSize:18,color:K.t1,marginBottom:4}}>{p.name}</p>
                <p style={{fontFamily:"Inter,sans-serif",fontSize:12,color:K.t3,marginBottom:20}}>{p.desc}</p>
                {p.price!==null?(
                  <div style={{marginBottom:22}}>
                    <span style={{fontFamily:K.mono,fontSize:36,fontWeight:700,color:p.hot?K.blue4:K.t1,letterSpacing:"-0.02em"}}>${annual?Math.round(p.price*0.8).toLocaleString():p.price.toLocaleString()}</span>
                    <span style={{fontFamily:K.mono,fontSize:13,color:K.t3}}>/mo</span>
                    {annual&&<p style={{fontFamily:K.mono,fontSize:9,color:K.mint,marginTop:3}}>BILLED ANNUALLY · SAVE ${(p.price*0.2*12).toLocaleString()}/YR</p>}
                  </div>
                ):(
                  <p style={{fontFamily:K.mono,fontSize:28,fontWeight:700,color:K.gold,marginBottom:22}}>Custom</p>
                )}
                <Button variant={p.hot?"primary":p.price===null?"gold":"secondary"} size="md" full onClick={()=>router.push(p.price===null?"/contact":"/auth/login")}>
                  {p.cta} →
                </Button>
              </div>
            ))}
          </div>
          <p style={{textAlign:"center",fontFamily:K.mono,fontSize:10,color:K.t4}}>
            All plans include signal enrichment, fraud protection, and 14-day free trial.{" "}
            <a href="/pricing" style={{color:K.blue4,textDecoration:"none"}}>See full comparison →</a>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────── */}
      <section style={{padding:"120px 48px",borderTop:`1px solid ${K.g800}`,textAlign:"center",background:K.void,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:700,height:400,background:"radial-gradient(ellipse,rgba(0,92,255,0.10) 0%,transparent 65%)",filter:"blur(80px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:500,height:200,background:"radial-gradient(ellipse,rgba(49,243,195,0.06) 0%,transparent 70%)",filter:"blur(60px)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1,maxWidth:640,margin:"0 auto"}}>
          <p style={{fontFamily:K.mono,fontSize:9,letterSpacing:"0.2em",color:K.t4,marginBottom:20}}>GET STARTED IN UNDER 10 MINUTES</p>
          <h2 style={{fontFamily:K.mono,fontWeight:700,fontSize:"clamp(28px,5.5vw,58px)",color:K.t1,marginBottom:20,letterSpacing:"-0.045em",lineHeight:1.02}}>
            Your campaigns are teaching<br/>platforms the <span style={{color:K.blue}}>wrong lesson.</span>
          </h2>
          <p style={{fontFamily:"Inter,sans-serif",fontSize:16,color:K.t3,lineHeight:1.75,maxWidth:500,margin:"0 auto 40px"}}>
            Connect your first ad account in 15 minutes. KIKI starts enriching every conversion immediately.
          </p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
            <Button size="xl" onClick={()=>router.push("/auth/login")}>START FREE — NO CREDIT CARD →</Button>
            <Button variant="secondary" size="xl" onClick={()=>router.push("/contact")}>BOOK ENTERPRISE DEMO</Button>
          </div>
          <div style={{display:"flex",gap:24,justifyContent:"center",flexWrap:"wrap"}}>
            {["SOC2 Type II","GDPR & CCPA","14-day free trial","No credit card"].map(t=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:K.mint,fontFamily:K.mono,fontSize:12}}>✓</span>
                <span style={{fontFamily:K.mono,fontSize:10,color:K.t3,letterSpacing:"0.04em"}}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </MarketingLayout>
  );
}

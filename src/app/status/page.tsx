"use client";
import { useState, useEffect } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge } from "@/components/ui";

const SERVICES = [
  { group:"Core Platform", items:[
    { name:"CAPI Gateway",          status:"operational", p99:"48ms",  uptime:"99.98%" },
    { name:"LTV Enrichment Engine", status:"operational", p99:"38ms",  uptime:"99.97%" },
    { name:"Fraud Detection",       status:"operational", p99:"18ms",  uptime:"99.99%" },
    { name:"SyncBrain Routing",     status:"operational", p99:"12ms",  uptime:"99.96%" },
    { name:"Signal Attribution",    status:"operational", p99:"24ms",  uptime:"99.97%" },
  ]},
  { group:"Platform Connectors", items:[
    { name:"Meta CAPI",             status:"operational", p99:"341ms", uptime:"99.94%" },
    { name:"Google Ads API",        status:"operational", p99:"289ms", uptime:"99.96%" },
    { name:"TikTok Ads API",        status:"operational", p99:"412ms", uptime:"99.91%" },
    { name:"LinkedIn Ads API",      status:"operational", p99:"298ms", uptime:"99.95%" },
    { name:"YouTube Ads",           status:"operational", p99:"360ms", uptime:"99.93%" },
  ]},
  { group:"Infrastructure", items:[
    { name:"API Gateway",           status:"operational", p99:"12ms",  uptime:"99.99%" },
    { name:"Database Cluster",      status:"operational", p99:"4ms",   uptime:"99.99%" },
    { name:"Redis Cache",           status:"operational", p99:"1ms",   uptime:"100%"   },
    { name:"Kafka Stream",          status:"operational", p99:"8ms",   uptime:"99.98%" },
    { name:"AI Model Inference",    status:"operational", p99:"820ms", uptime:"99.94%" },
  ]},
];

const INCIDENTS = [
  { date:"Mar 10, 2026", title:"Anomaly detection service degraded", severity:"P1", duration:"36 min", resolved:true },
  { date:"Feb 28, 2026", title:"Kafka consumer lag spike",           severity:"P2", duration:"13 min", resolved:true },
  { date:"Feb 9, 2026",  title:"CAPI pipeline timeout",              severity:"P0", duration:"8 min",  resolved:true },
];

const STATUS_COLORS: Record<string,string> = { operational:K.mint, degraded:K.warn, outage:K.danger, maintenance:K.blue };
const SEV_COLORS:    Record<string,string> = { P0:K.danger, P1:K.warn, P2:K.blue };

export default function StatusPage() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(iv); }, []);

  return (
    <MarketingLayout>
      <div style={{ background:K.void }} className="p-[clamp(40px,6vw,80px)] px-[clamp(16px,4vw,48px)] max-w-[960px] mx-auto">
        <div className="text-center mb-12">
          <div style={{ background:K.mintT, border:`1px solid ${K.mint}30` }} className="inline-flex items-center gap-2.5 px-6 py-3 rounded-sm mb-5">
            <span className="animate-kdls-pulse w-2.5 h-2.5 rounded-full bg-kmint inline-block"/>
            <span className="font-mono text-[13px] font-bold text-kmint">ALL SYSTEMS OPERATIONAL</span>
          </div>
          <h1 className="font-mono font-bold text-[clamp(22px,4vw,36px)] text-t1 tracking-[-0.025em] mb-2">KIKI Agent Status</h1>
          <p className="font-mono text-[11px] text-t3">Live status · Updated {now.toLocaleTimeString("en-US", { hour12:false })} UTC</p>
        </div>

        {SERVICES.map(group => (
          <div key={group.group} className="mb-7">
            <p className="font-mono font-bold text-[10px] text-t2 mb-2.5 tracking-[0.04em]">{group.group}</p>
            <div className="border border-g800 rounded-sm overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="grid grid-cols-[1fr_100px_80px_90px] gap-3 px-4 py-2 bg-g950 border-b border-g800">
                    {["SERVICE","STATUS","P99","30D UPTIME"].map(h => <span key={h} className="font-mono text-[9px] tracking-widest text-t4">{h}</span>)}
                  </div>
                  {group.items.map((svc,i) => (
                    <div key={i} className="grid grid-cols-[1fr_100px_80px_90px] gap-3 px-4 py-3 items-center bg-g900" style={{ borderBottom:i<group.items.length-1?`1px solid ${K.g900}`:"none" }}>
                      <span className="font-mono text-[12px] text-t1">{svc.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="animate-kdls-pulse w-[7px] h-[7px] rounded-full inline-block" style={{ background:STATUS_COLORS[svc.status]||K.t3 }}/>
                        <span className="font-mono text-[10px] capitalize" style={{ color:STATUS_COLORS[svc.status]||K.t3 }}>{svc.status}</span>
                      </div>
                      <span className="font-mono text-[11px] text-t2">{svc.p99}</span>
                      <span className="font-mono font-bold text-[11px] text-kmint">{svc.uptime}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-10">
          <p className="font-mono font-bold text-[10px] text-t2 mb-4 tracking-[0.04em]">RECENT INCIDENTS</p>
          {INCIDENTS.map((inc,i) => (
            <div key={i} className="px-[18px] py-3.5 bg-g900 border border-g800 rounded-sm mb-2 flex items-center justify-between flex-wrap gap-2.5">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge color={SEV_COLORS[inc.severity]||K.t3}>{inc.severity}</Badge>
                  <span className="font-mono font-bold text-[12px] text-t1">{inc.title}</span>
                </div>
                <span className="font-mono text-[10px] text-t3">{inc.date} · Duration: {inc.duration}</span>
              </div>
              <Badge color={K.pos}>RESOLVED</Badge>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center p-5 bg-g900 border border-g800 rounded-sm">
          <p className="font-mono text-[11px] text-t3">
            Subscribe to status updates:{" "}
            <a href="https://status.kiki.ai" target="_blank" rel="noopener noreferrer" className="no-underline" style={{ color:K.blue4 }}>status.kiki.ai</a>
            {" "}or follow{" "}
            <a href="https://x.com/KIKIAgent" target="_blank" rel="noopener noreferrer" className="no-underline" style={{ color:K.blue4 }}>@KIKIAgent</a>
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}

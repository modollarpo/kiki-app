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
      <div style={{ background:K.void, padding:"clamp(40px,6vw,80px) clamp(16px,4vw,48px)", maxWidth:960, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"12px 24px", background:K.mintT, border:`1px solid ${K.mint}30`, borderRadius:2, marginBottom:20 }}>
            <span className="animate-kdls-pulse" style={{ width:10, height:10, borderRadius:"50%", background:K.mint, display:"inline-block" }}/>
            <span style={{ fontFamily:K.mono, fontSize:13, fontWeight:700, color:K.mint }}>ALL SYSTEMS OPERATIONAL</span>
          </div>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(22px,4vw,36px)", color:K.t1, letterSpacing:"-0.025em", marginBottom:8 }}>KIKI Agent Status</h1>
          <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>Live status · Updated {now.toLocaleTimeString("en-US", { hour12:false })} UTC</p>
        </div>

        {SERVICES.map(group => (
          <div key={group.group} style={{ marginBottom:28 }}>
            <p style={{ fontFamily:K.mono, fontSize:10, fontWeight:700, color:K.t2, marginBottom:10, letterSpacing:"0.04em" }}>{group.group}</p>
            <div style={{ border:`1px solid ${K.g800}`, borderRadius:2, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 80px 90px", gap:12, padding:"8px 16px", background:K.g950, borderBottom:`1px solid ${K.g800}` }}>
                {["SERVICE","STATUS","P99","30D UPTIME"].map(h => <span key={h} style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.1em", color:K.t4 }}>{h}</span>)}
              </div>
              {group.items.map((svc,i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 100px 80px 90px", gap:12, padding:"12px 16px", borderBottom:i<group.items.length-1?`1px solid ${K.g900}`:"none", alignItems:"center", background:K.g900 }}>
                  <span style={{ fontFamily:K.mono, fontSize:12, color:K.t1 }}>{svc.name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span className="animate-kdls-pulse" style={{ width:7, height:7, borderRadius:"50%", background:STATUS_COLORS[svc.status]||K.t3, display:"inline-block" }}/>
                    <span style={{ fontFamily:K.mono, fontSize:10, color:STATUS_COLORS[svc.status]||K.t3, textTransform:"capitalize" }}>{svc.status}</span>
                  </div>
                  <span style={{ fontFamily:K.mono, fontSize:11, color:K.t2 }}>{svc.p99}</span>
                  <span style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:K.mint }}>{svc.uptime}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop:40 }}>
          <p style={{ fontFamily:K.mono, fontSize:10, fontWeight:700, color:K.t2, marginBottom:16, letterSpacing:"0.04em" }}>RECENT INCIDENTS</p>
          {INCIDENTS.map((inc,i) => (
            <div key={i} style={{ padding:"14px 18px", background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                  <Badge color={SEV_COLORS[inc.severity]||K.t3}>{inc.severity}</Badge>
                  <span style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:K.t1 }}>{inc.title}</span>
                </div>
                <span style={{ fontFamily:K.mono, fontSize:10, color:K.t3 }}>{inc.date} · Duration: {inc.duration}</span>
              </div>
              <Badge color={K.pos}>RESOLVED</Badge>
            </div>
          ))}
        </div>

        <div style={{ marginTop:32, textAlign:"center", padding:20, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2 }}>
          <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>
            Subscribe to status updates:{" "}
            <a href="https://status.kiki.ai" target="_blank" rel="noopener noreferrer" style={{ color:K.blue4, textDecoration:"none" }}>status.kiki.ai</a>
            {" "}or follow{" "}
            <a href="https://x.com/KIKIAgent" target="_blank" rel="noopener noreferrer" style={{ color:K.blue4, textDecoration:"none" }}>@KIKIAgent</a>
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}

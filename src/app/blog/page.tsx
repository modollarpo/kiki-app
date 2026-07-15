"use client";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge, Button } from "@/components/ui";

const POSTS = [
  { slug:"wrong-signal", tag:"LTV Enrichment",title:"Why your ad platforms are learning from the wrong signal",excerpt:"Meta and Google optimize based on the events you send them. If you're sending raw order value, they're finding customers who spend $149 — not customers worth $640.",date:"Mar 20, 2026",readTime:"8 min",color:K.mint,featured:true },
  { slug:"six-ai-agents", tag:"AI Agents",title:"The 6 AI agents running inside every KIKI account",excerpt:"From bidding to creative generation, here's what each agent does, how they communicate, and what happens when they disagree.",date:"Mar 12, 2026",readTime:"12 min",color:K.blue },
  { slug:"syncbrain-routing", tag:"SyncBrain",title:"How SyncBrain chooses between GPT-4o, Claude, Gemini, and LLaMA",excerpt:"Not every task needs GPT-4o. SyncBrain routes based on task type, budget, confidence requirements, and latency. Here's the decision tree.",date:"Mar 5, 2026",readTime:"6 min",color:K.green },
  { slug:"ivt-anatomy", tag:"Fraud",title:"The anatomy of IVT: how bots contaminate your LTV model",excerpt:"When fraudulent conversions enter your training data, your model learns to find bots. Here's how to detect and eliminate IVT before it does damage.",date:"Feb 26, 2026",readTime:"9 min",color:K.danger },
  { slug:"acme-case-study", tag:"Case Study",title:"How Acme Corp grew ROAS from 2.4× to 4.2× in 60 days",excerpt:"A step-by-step breakdown of how KIKI's LTV enrichment and Bidding Agent transformed Acme Corp's acquisition campaigns.",date:"Feb 18, 2026",readTime:"15 min",color:K.gold },
];

export default function BlogPage() {
  return (
    <MarketingLayout>
      <div style={{ background:K.void, padding:"80px 48px", maxWidth:960, margin:"0 auto" }}>
        <div style={{ marginBottom:48 }}>
          <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4, marginBottom:14 }}>BLOG</p>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(28px,5vw,48px)", letterSpacing:"-0.03em", color:K.t1 }}>Ideas from the KIKI team.</h1>
        </div>
        {POSTS.filter(p=>p.featured).map(p=>(
          <div key={p.title} style={{ padding:32, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, marginBottom:32, cursor:"pointer", transition:"all 0.2s", position:"relative", overflow:"hidden" }}
            onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);(e.currentTarget.style.transform="translateY(-2px)");}} onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);(e.currentTarget.style.transform="none");}}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${p.color},transparent)` }} />
            <Badge color={p.color} style={{ marginBottom:14 }}>{p.tag.toUpperCase()}</Badge>
            <h2 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(16px,3vw,26px)", letterSpacing:"-0.02em", color:K.t1, marginBottom:12 }}>{p.title}</h2>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:K.t3, lineHeight:1.7, maxWidth:620, marginBottom:18 }}>{p.excerpt}</p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", gap:16 }}>
                <span style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{p.date}</span>
                <span style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{p.readTime} read</span>
              </div>
              <Button variant="primary" size="sm" onClick={() => { /* Blog post routing - future: /blog/[slug] */ }}>Read Article →</Button>
            </div>
          </div>
        ))}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {POSTS.filter(p=>!p.featured).map(p=>(
            <div key={p.title} style={{ padding:24, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, cursor:"pointer", transition:"all 0.2s", position:"relative", overflow:"hidden" }}
              onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);(e.currentTarget.style.transform="translateY(-2px)");}} onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);(e.currentTarget.style.transform="none");}}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${p.color},transparent)` }} />
              <Badge color={p.color} style={{ marginBottom:12 }}>{p.tag.toUpperCase()}</Badge>
              <h3 style={{ fontFamily:K.mono, fontWeight:700, fontSize:16, letterSpacing:"-0.01em", color:K.t1, marginBottom:10 }}>{p.title}</h3>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t3, lineHeight:1.6, marginBottom:14 }}>{p.excerpt}</p>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{p.date} · {p.readTime}</span>
                <Button variant="ghost" size="xs" onClick={() => { /* Blog post routing - future: /blog/[slug] */ }}>Read →</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}

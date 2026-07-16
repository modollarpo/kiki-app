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
      <div style={{ background:K.void }} className="p-20 px-12 max-w-[960px] mx-auto">
        <div className="mb-12">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3.5">BLOG</p>
          <h1 className="font-mono font-bold text-[clamp(28px,5vw,48px)] tracking-[-0.03em] text-t1">Ideas from the KIKI team.</h1>
        </div>
        {POSTS.filter(p=>p.featured).map(p=>(
          <div key={p.title} className="p-8 bg-g900 border border-g800 rounded-sm mb-8 cursor-pointer transition-all relative overflow-hidden"
            onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);(e.currentTarget.style.transform="translateY(-2px)");}} onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);(e.currentTarget.style.transform="none");}}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,transparent,${p.color},transparent)` }} />
            <Badge color={p.color} className="mb-[14px]">{p.tag.toUpperCase()}</Badge>
            <h2 className="font-mono font-bold text-[clamp(16px,3vw,26px)] tracking-[-0.02em] text-t1 mb-3">{p.title}</h2>
            <p className="font-sans text-[14px] text-t3 leading-[1.7] max-w-[620px] mb-4.5">{p.excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <span className="font-mono text-[10px] text-t4">{p.date}</span>
                <span className="font-mono text-[10px] text-t4">{p.readTime} read</span>
              </div>
              <Button variant="primary" size="sm" onClick={() => { /* Blog post routing - future: /blog/[slug] */ }}>Read Article →</Button>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          {POSTS.filter(p=>!p.featured).map(p=>(
            <div key={p.title} className="p-6 bg-g900 border border-g800 rounded-sm cursor-pointer transition-all relative overflow-hidden"
              onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);(e.currentTarget.style.transform="translateY(-2px)");}} onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);(e.currentTarget.style.transform="none");}}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,transparent,${p.color},transparent)` }} />
              <Badge color={p.color} className="mb-3">{p.tag.toUpperCase()}</Badge>
              <h3 className="font-mono font-bold text-[16px] tracking-[-0.01em] text-t1 mb-2.5">{p.title}</h3>
              <p className="font-sans text-[13px] text-t3 leading-[1.6] mb-3.5">{p.excerpt}</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-t4">{p.date} · {p.readTime}</span>
                <Button variant="ghost" size="xs" onClick={() => { /* Blog post routing - future: /blog/[slug] */ }}>Read →</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}

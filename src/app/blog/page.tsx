"use client";
import Link from "next/link";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge, Button } from "@/components/ui";
import { POSTS } from "@/lib/blog";

export default function BlogPage() {
  return (
    <MarketingLayout>
      <div style={{ background:K.void }} className="p-20 px-12 max-w-[960px] mx-auto">
        <div className="mb-12">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3.5">BLOG</p>
          <h1 className="font-mono font-bold text-[clamp(28px,5vw,48px)] tracking-[-0.03em] text-t1">Ideas from the KIKI team.</h1>
        </div>
        {POSTS.filter(p=>p.featured).map(p=>(
          <Link key={p.slug} href={`/blog/${p.slug}`} className="block p-8 bg-g900 border border-g800 rounded-sm mb-8 transition-all relative overflow-hidden"
            onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {(e.currentTarget.style.background = K.g850);(e.currentTarget.style.transform = "translateY(-2px)");}} onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {(e.currentTarget.style.background = K.g900);(e.currentTarget.style.transform = "none");}}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,transparent,${p.color},transparent)` }} />
            <Badge color={p.color} className="mb-[14px]">{p.tag.toUpperCase()}</Badge>
            <h2 className="font-mono font-bold text-[clamp(16px,3vw,26px)] tracking-[-0.02em] text-t1 mb-3">{p.title}</h2>
            <p className="font-sans text-[14px] text-t3 leading-[1.7] max-w-[620px] mb-4.5">{p.excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <span className="font-mono text-[10px] text-t4">{p.date}</span>
                <span className="font-mono text-[10px] text-t4">{p.readTime} read</span>
              </div>
              <span className="font-mono text-[11px] text-t1">Read Article →</span>
            </div>
          </Link>
        ))}
        <div className="grid grid-cols-2 gap-4">
          {POSTS.filter(p=>!p.featured).map(p=>(
            <Link key={p.slug} href={`/blog/${p.slug}`} className="block p-6 bg-g900 border border-g800 rounded-sm transition-all relative overflow-hidden"
              onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {(e.currentTarget.style.background = K.g850);(e.currentTarget.style.transform = "translateY(-2px)");}} onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {(e.currentTarget.style.background = K.g900);(e.currentTarget.style.transform = "none");}}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,transparent,${p.color},transparent)` }} />
              <Badge color={p.color} className="mb-3">{p.tag.toUpperCase()}</Badge>
              <h3 className="font-mono font-bold text-[16px] tracking-[-0.01em] text-t1 mb-2.5">{p.title}</h3>
              <p className="font-sans text-[13px] text-t3 leading-[1.6] mb-3.5">{p.excerpt}</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-t4">{p.date} · {p.readTime}</span>
                <span className="font-mono text-[10px] text-t1">Read →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}

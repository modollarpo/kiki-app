"use client";
import { useRouter } from "next/navigation";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge, Button } from "@/components/ui";
import { FEATURES } from "@/lib/feature-data";

export default function FeaturesPage() {
  const router = useRouter();
  return (
    <MarketingLayout>
      <div style={{ background: K.void }}>
        {/* ── Header ──────────────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 pt-[clamp(48px,6vw,80px)] pb-[clamp(32px,4vw,48px)] text-center" style={{ borderBottom: `1px solid ${K.g800}` }}>
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-4">PLATFORM FEATURES</p>
          <h1 className="font-mono font-bold text-[clamp(28px,5vw,52px)] tracking-[-0.03em] text-t1 mb-4">Everything your media team needs.</h1>
          <p className="font-sans text-[16px] text-t3 max-w-[560px] mx-auto leading-[1.7]">One platform for signal enrichment, autonomous optimization, fraud protection, and financial control. Every feature works together.</p>
        </section>

        {/* ── Feature Grid ────────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 py-[clamp(40px,5vw,64px)]">
          <div className="max-w-[1100px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FEATURES.map((f, i) => (
                <div
                  key={f.id}
                  className="p-6 md:p-8 rounded-sm relative overflow-hidden transition-colors duration-200 cursor-default"
                  style={{ background: K.g900, border: `1px solid ${K.g800}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = K.g850 }}
                  onMouseLeave={e => { e.currentTarget.style.background = K.g900 }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${f.color}60,transparent)` }} />
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-sm flex items-center justify-center text-[22px] shrink-0" style={{ background: `${f.color}12`, color: f.color }}>
                      {f.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge color={f.color}>{f.label.toUpperCase()}</Badge>
                        {i === 1 && <span className="font-mono text-[8px] tracking-[0.12em] px-2 py-0.5 rounded-sm" style={{ background: `${K.mint}15`, color: K.mint }}>HOT</span>}
                      </div>
                      <h3 className="font-mono font-bold text-[16px] text-t1 mb-2 leading-snug">{f.tagline}</h3>
                      <p className="font-sans text-[13px] text-t3 leading-[1.7] mb-4">{f.desc}</p>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[18px] font-bold" style={{ color: f.color }}>{f.stat}</span>
                          <span className="font-mono text-[10px] text-t4 max-w-[80px]">{f.statLabel}</span>
                        </div>
                        <div className="w-px h-6" style={{ background: K.g700 }} />
                        <span className="font-mono text-[10px] text-t3">{f.capabilities.length} capabilities</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => router.push(`/features/${f.id}`)}>
                          Learn more &rarr;
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => router.push("/auth/login")}>
                          Start free trial
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Integration Note ────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 py-[clamp(32px,4vw,56px)]" style={{ borderTop: `1px solid ${K.g800}` }}>
          <div className="max-w-[1100px] mx-auto text-center">
            <h2 className="font-mono font-bold text-[clamp(18px,2.5vw,28px)] text-t1 tracking-[-0.02em] mb-3">All features work together</h2>
            <p className="font-sans text-[14px] text-t3 max-w-[600px] mx-auto mb-6">
              Enriched LTV signals feed the AI agents. Fraud detection protects training data. SyncBrain routes model requests cost-optimally. Virtual cards control spend. Every component is designed to work as one system.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button size="lg" onClick={() => router.push("/auth/login")}>Start Free Trial &rarr;</Button>
              <Button variant="secondary" size="lg" onClick={() => router.push("/demo")}>Watch Demo &xrtr;</Button>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}

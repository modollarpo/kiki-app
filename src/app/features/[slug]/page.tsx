"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge, Button } from "@/components/ui";
import { FEATURES } from "@/lib/feature-data";

export default function FeatureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const feat = FEATURES.find(f => f.id === slug);

  if (!feat) {
    return (
      <MarketingLayout>
        <div className="py-[clamp(60px,8vw,120px)] text-center max-w-[600px] mx-auto px-4">
          <div className="text-[48px] mb-4">?</div>
          <h1 className="font-mono font-bold text-[clamp(24px,4vw,36px)] text-t1 mb-3">Feature not found</h1>
          <p className="font-sans text-[15px] text-t3 mb-6">The feature page you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/features")}>View all features →</Button>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div style={{ background: K.void }}>
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 pt-[clamp(48px,6vw,80px)] pb-[clamp(32px,4vw,60px)]" style={{ borderBottom: `1px solid ${K.g800}` }}>
          <div className="max-w-[1060px] mx-auto">
            <Badge color={feat.color} className="mb-4">{feat.label.toUpperCase()}</Badge>
            <h1 className="font-mono font-bold text-[clamp(32px,5.5vw,58px)] text-t1 tracking-[-0.04em] leading-[1.05] mb-4">{feat.tagline}</h1>
            <p className="font-sans text-[17px] text-t3 leading-[1.75] max-w-[620px] mb-6">{feat.desc}</p>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="lg" onClick={() => router.push("/auth/login")}>Start Free Trial →</Button>
              <Button variant="secondary" size="lg" onClick={() => router.push("/demo")}>Watch Demo ▸</Button>
            </div>
          </div>
        </section>

        {/* ── Stat Bar ────────────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 py-[clamp(20px,3vw,32px)]" style={{ borderBottom: `1px solid ${K.g800}` }}>
          <div className="max-w-[1060px] mx-auto flex flex-wrap items-center gap-x-10 gap-y-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[32px] font-bold" style={{ color: feat.color }}>{feat.stat}</span>
              <span className="font-mono text-[11px] text-t3 max-w-[120px]">{feat.statLabel}</span>
            </div>
            <div className="w-px h-8" style={{ background: K.g700 }} />
            {feat.capabilities.slice(0, 3).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: K.mint }}>✓</span>
                <span className="font-mono text-[11px] text-t3 whitespace-nowrap">{c}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Detail Sections ─────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 py-[clamp(40px,6vw,80px)]" style={{ borderBottom: `1px solid ${K.g800}` }}>
          <div className="max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {[
              { title: feat.sec1Title, body: feat.sec1Body },
              { title: feat.sec2Title, body: feat.sec2Body },
              { title: feat.sec3Title, body: feat.sec3Body },
            ].map((s, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[10px] font-bold" style={{ color: feat.color }}>0{i + 1}</span>
                  <div className="flex-1 h-px" style={{ background: `${feat.color}20` }} />
                </div>
                <h3 className="font-mono font-bold text-[15px] text-t1 mb-2">{s.title}</h3>
                <p className="font-sans text-[13px] text-t3 leading-[1.75]">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Capabilities ────────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 py-[clamp(32px,5vw,64px)]" style={{ borderBottom: `1px solid ${K.g800}` }}>
          <div className="max-w-[1060px] mx-auto">
            <h2 className="font-mono font-bold text-[clamp(20px,3vw,32px)] text-t1 tracking-[-0.03em] mb-8">Capabilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              {feat.capabilities.map((c, i) => (
                <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: `1px solid ${K.g800}` }}>
                  <span className="text-[14px] mt-0.5 shrink-0" style={{ color: feat.color }}>✦</span>
                  <span className="font-sans text-[14px] text-t2">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Use Cases ───────────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 py-[clamp(32px,5vw,64px)]" style={{ borderBottom: `1px solid ${K.g800}` }}>
          <div className="max-w-[1060px] mx-auto">
            <h2 className="font-mono font-bold text-[clamp(20px,3vw,32px)] text-t1 tracking-[-0.03em] mb-8">Use Cases</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {feat.useCases.map((u, i) => (
                <div key={i} className="p-6 rounded-sm" style={{ background: K.g900, border: `1px solid ${K.g800}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-[10px] font-bold" style={{ color: feat.color }}>{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex-1 h-px" style={{ background: `${feat.color}20` }} />
                  </div>
                  <h3 className="font-mono font-bold text-[13px] text-t1 mb-2">{u.title}</h3>
                  <p className="font-sans text-[12px] text-t3 leading-[1.7]">{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 py-[clamp(48px,6vw,80px)] text-center" style={{ borderBottom: `1px solid ${K.g800}` }}>
          <div className="max-w-[600px] mx-auto">
            <h2 className="font-mono font-bold text-[clamp(22px,3.5vw,36px)] text-t1 tracking-[-0.03em] mb-4">Ready to get started?</h2>
            <p className="font-sans text-[15px] text-t3 mb-8">Connect your first ad account in 15 minutes. Free for 14 days.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button size="xl" onClick={() => router.push("/auth/login")}>START FREE — NO CREDIT CARD →</Button>
              <Button variant="secondary" size="xl" onClick={() => router.push("/contact")}>TALK TO SALES</Button>
            </div>
          </div>
        </section>

        {/* ── Other Features ──────────────────────────────── */}
        <section className="px-4 sm:px-6 md:px-12 py-[clamp(32px,5vw,64px)]">
          <div className="max-w-[1060px] mx-auto">
            <h2 className="font-mono font-bold text-[clamp(16px,2vw,24px)] text-t1 tracking-[-0.02em] mb-6">Explore more features</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {FEATURES.filter(f => f.id !== feat.id).map(f => (
                <Link
                  key={f.id}
                  href={`/features/${f.id}`}
                  className="p-4 rounded-sm text-center no-underline transition-colors duration-150"
                  style={{ background: K.g900, border: `1px solid ${K.g800}` }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = K.g850 }}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = K.g900 }}
                >
                  <div className="text-[20px] mb-1.5" style={{ color: f.color }}>{f.icon}</div>
                  <p className="font-mono text-[10px] font-bold text-t2">{f.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}

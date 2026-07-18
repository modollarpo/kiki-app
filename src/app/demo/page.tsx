"use client";

import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";

export default function DemoPage() {
  return (
    <MarketingLayout>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ background: K.g950 }}>
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            style={{ color: K.t1, fontFamily: "var(--font-mono)" }}
          >
            KIKI Agent<span style={{ color: K.blue }}>™</span>
          </h1>
          <p className="text-lg" style={{ color: K.t2, fontFamily: "var(--font-sans)" }}>
            See how KIKI automates your entire ad pipeline in 3 minutes.
          </p>
        </div>

        {/* Video Player */}
        <div
          className="w-full max-w-[1060px] rounded-2xl overflow-hidden"
          style={{
            border: `1px solid ${K.g750}`,
            boxShadow: `0 0 80px ${K.blue}15, 0 20px 60px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Chrome bar */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ background: K.g900, borderBottom: `1px solid ${K.g800}` }}
          >
            <div className="flex gap-1.5">
              {[K.danger, K.warn, K.pos].map((c, i) => (
                <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: 0.75 }} />
              ))}
            </div>
            <span className="flex-1 text-center text-xs" style={{ color: K.t3, fontFamily: "var(--font-mono)" }}>
              kikiagent.net &nbsp;·&nbsp; product demo
            </span>
          </div>

          {/* Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full aspect-video"
            style={{ background: "#000" }}
          >
            <source src="/demo/kiki-demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <a
            href="/auth/login"
            className="inline-block px-8 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all"
            style={{
              background: K.blue,
              color: K.t1,
              boxShadow: `0 0 20px ${K.blue}40`,
            }}
          >
            START FREE TRIAL →
          </a>
          <p className="mt-4 text-xs" style={{ color: K.t3 }}>
            No credit card · 14-day trial · SOC2 Type II · GDPR & CCPA
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
